from dataclasses import dataclass

# Course: csc3380
# Final Project
# Instructor: Dr. Duncan
# Date: 2026-04-30

@dataclass
class Session:
    """Stores the current state for one connected client."""

    name: str = "Anonymous"
    room: str | None = None
