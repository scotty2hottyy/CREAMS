class MessageFactory:
    """
    Factory Pattern: single place responsible for building all
    outgoing JSON message payloads sent to clients.
    Keeps payload structure consistent and centralised.
    """

    @staticmethod
    def system(text: str) -> dict:
        """A server system message shown in chat."""
        return {"type": "system", "text": text}

    @staticmethod
    def chat(room: str, name: str, text: str) -> dict:
        """A user chat message broadcast to a room."""
        return {"type": "chat", "room": room, "name": name, "text": text}

    @staticmethod
    def image(room: str, name: str, mime: str, data_url: str) -> dict:
        """An image message broadcast to a room."""
        return {"type": "image", "room": room, "name": name, "mime": mime, "dataUrl": data_url}

    @staticmethod
    def rooms(room_list: list) -> dict:
        """The current list of rooms with member counts."""
        return {"type": "rooms", "rooms": room_list}

    @staticmethod
    def presence(online_names: list) -> dict:
        """The list of currently online usernames."""
        return {"type": "presence", "online": online_names}

    @staticmethod
    def friend_request(from_name: str) -> dict:
        """Notify a user they have an incoming friend request."""
        return {"type": "friend_request", "from": from_name}

    @staticmethod
    def friend_accepted(friend_name: str, room: str | None) -> dict:
        """Notify both parties that a friend request was accepted."""
        return {"type": "friend_accepted", "friend": friend_name, "room": room}

    @staticmethod
    def friends_list(friends: list, requests: list) -> dict:
        """A user's full friend list with statuses and pending requests."""
        return {"type": "friends_list", "friends": friends, "requests": requests}

    @staticmethod
    def name_confirmed(name: str) -> dict:
        """Confirm a username was accepted by the server."""
        return {"type": "name_confirmed", "name": name}

    @staticmethod
    def name_rejected(reason: str) -> dict:
        """Reject a requested username with a reason."""
        return {"type": "name_rejected", "reason": reason}