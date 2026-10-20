"""Tests for Cursor transcript discovery and tailing."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.cursor_transcript_poller import CursorTranscriptPoller
from app.models.events import EventType, PromptEvent, SessionEvent


@pytest.mark.asyncio
async def test_poller_emits_events_for_appended_lines(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    home = tmp_path / "home"
    cursor_root = home / ".cursor"
    transcript_dir = (
        cursor_root / "projects" / "Users-demo-repo" / "agent-transcripts" / "chat-uuid"
    )
    transcript_dir.mkdir(parents=True)
    transcript = transcript_dir / "chat-uuid.jsonl"
    transcript.write_text("", encoding="utf-8")

    monkeypatch.setattr(Path, "home", lambda: home)
    monkeypatch.setenv("STALKER_CURSOR_TRANSCRIPT_ROOTS", str(cursor_root))
    monkeypatch.setenv("STALKER_CURSOR_POLL_INTERVAL", "0.05")

    received: list[EventType] = []

    async def capture(event: SessionEvent | PromptEvent) -> None:
        received.append(event.event_type)

    poller = CursorTranscriptPoller(capture)
    await poller._scan_once()
    assert received == []

    with transcript.open("a", encoding="utf-8") as handle:
        handle.write(
            json.dumps(
                {
                    "role": "user",
                    "message": {
                        "content": [{"type": "text", "text": "<user_query>\nhi\n</user_query>"}],
                    },
                }
            )
            + "\n"
        )

    await poller._scan_once()
    assert EventType.SESSION_START in received
    assert EventType.USER_PROMPT_SUBMIT in received
