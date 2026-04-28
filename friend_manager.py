from typing import Any


class FriendManager:
    """Handles friend requests and accepted friendships between connected users."""

    def __init__(self) -> None:
        # pending_requests[to_name] = set of from_names waiting for a response
        self.pending_requests: dict[str, set[str]] = {}
        # friendships[name] = set of friend names (mutual, stored on both sides)
        self.friendships: dict[str, set[str]] = {}

    # ── Requests ──────────────────────────────────────────────────────────────

    def send_request(self, from_name: str, to_name: str) -> str | None:
        """Record a pending request. Returns an error string or None on success."""
        if from_name == to_name:
            return "You can't add yourself."
        if self.are_friends(from_name, to_name):
            return f"You are already friends with {to_name}."
        self.pending_requests.setdefault(to_name, set()).add(from_name)
        return None

    def get_incoming_requests(self, name: str) -> list[str]:
        return sorted(self.pending_requests.get(name, set()))

    def accept_request(self, my_name: str, from_name: str) -> bool:
        """Accept a pending request. Returns True if it existed."""
        pending = self.pending_requests.get(my_name, set())
        if from_name not in pending:
            return False
        pending.discard(from_name)
        self.friendships.setdefault(my_name, set()).add(from_name)
        self.friendships.setdefault(from_name, set()).add(my_name)
        return True

    def decline_request(self, my_name: str, from_name: str) -> None:
        self.pending_requests.get(my_name, set()).discard(from_name)

    def remove_friend(self, my_name: str, other_name: str) -> None:
        self.friendships.get(my_name, set()).discard(other_name)
        self.friendships.get(other_name, set()).discard(my_name)

    def are_friends(self, a: str, b: str) -> bool:
        return b in self.friendships.get(a, set())

    def get_friends(self, name: str) -> list[str]:
        return sorted(self.friendships.get(name, set()))

    def cleanup_user(self, name: str) -> None:
        """Remove all pending requests involving this user when they disconnect."""
        # Remove outgoing requests they sent
        for pending_set in self.pending_requests.values():
            pending_set.discard(name)
        # Remove their incoming requests
        self.pending_requests.pop(name, None)

    def rename_user(self, old_name: str, new_name: str) -> None:
        """Update friendship records when a user changes their name."""
        if old_name == new_name:
            return

        # Update friendships: replace old_name key with new_name
        if old_name in self.friendships:
            self.friendships[new_name] = self.friendships.pop(old_name)

        # Update all friends who have old_name in their set
        for friends_set in self.friendships.values():
            if old_name in friends_set:
                friends_set.discard(old_name)
                friends_set.add(new_name)

        # Update pending requests
        if old_name in self.pending_requests:
            self.pending_requests[new_name] = self.pending_requests.pop(old_name)

        for pending_set in self.pending_requests.values():
            if old_name in pending_set:
                pending_set.discard(old_name)
                pending_set.add(new_name)