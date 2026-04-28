from dataclasses import dataclass


@dataclass
class Session:
    """Stores the current state for one connected client."""

    name: str = "Anonymous"
    room: str | None = None
