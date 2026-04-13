import socket
import json
import time
from typing import List, Dict, Optional

BROADCAST_PORT = 50000
DISCOVERY_BUFFER_SIZE = 4096


def get_local_ip() -> str:
    """
    returns ip of local machine

    opens a UDP socket and connects to see where socket goes(your own ip)
    no packets sent, but OS chooses the network interface and the local address is the IP
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # 8.8.8.8 is used to force interface choice
        # no response needed
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    except OSError:
        # base case if error
        local_ip = "127.0.0.1"
    finally:
        s.close()

    return local_ip


def broadcast_chatroom(chatroom_name: str,
                       host_ip: Optional[str] = None,
                       port: int = BROADCAST_PORT) -> None:
    """
    sends a UDP broadcast packet over the LAN announcing a chatroom

    arguments
        chatroom_name: name of the chatroom being broadcasted
        host_ip: The host's IP. If (None), it will be detected automatically.
        port: UDP broadcast port
    """
    if host_ip is None:
        host_ip = get_local_ip()

    message = {
        "type": "chatroom_announcement",
        "chatroom_name": chatroom_name,
        "host_ip": host_ip,
        "timestamp": time.time()
    }

    data = json.dumps(message).encode("utf-8")

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.sendto(data, ("<broadcast>", port))
    finally:
        sock.close()


def discover_chatrooms(timeout: float = 5.0,
                       port: int = BROADCAST_PORT) -> List[Dict[str, str]]:
    """
    listens and reports back with UDP discovered chatrooms

    argument:
        timeout: how long to listen
        port: port local machine uses and listens on
    return:
        a list of dictionaries looks like:
        [
            {
                "chatroom_name": "General",
                "host_ip": "192.168.1.25",
                "sender_ip": "192.168.1.25"
            }
        ]
    """
    discovered = []
    seen = set()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Allow rebinding quickly while testing
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("", port))
        sock.settimeout(timeout)

        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                data, addr = sock.recvfrom(DISCOVERY_BUFFER_SIZE)
                sender_ip = addr[0]

                message = json.loads(data.decode("utf-8"))

                if message.get("type") != "chatroom_announcement":
                    continue

                chatroom_name = message.get("chatroom_name")
                host_ip = message.get("host_ip")

                if not chatroom_name or not host_ip:
                    continue

                unique_key = (chatroom_name, host_ip)
                if unique_key in seen:
                    continue

                seen.add(unique_key)
                discovered.append({
                    "chatroom_name": chatroom_name,
                    "host_ip": host_ip,
                    "sender_ip": sender_ip
                })

            except socket.timeout:
                break
            except (json.JSONDecodeError, UnicodeDecodeError):
                # ignore broken things
                continue

    finally:
        sock.close()

    return discovered


if __name__ == "__main__":
    print("My LAN IP:", get_local_ip())
	#base examples
    #  announce a chatroom
    broadcast_chatroom("CREAMS Chatroom")
    print("Broadcast sent.")

    # search for chatrooms for 5 seconds
    rooms = discover_chatrooms(timeout=5.0)
    print("Discovered chatrooms:")
    for room in rooms:
        print(room)