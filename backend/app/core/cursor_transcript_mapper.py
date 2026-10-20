"""Map Cursor IDE agent-transcript JSONL lines to office events."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

from app.models.common import BubbleContent, BubbleType
from app.models.events import (
    AgentEvent,
    AgentEventData,
    AnyEvent,
    EventType,
    LifecycleEvent,
    LifecycleEventData,
    PromptEvent,
    PromptEventData,
    SessionEvent,
    SessionEventData,
    ToolEvent,
    ToolEventData,
)

_CURSOR_SOURCE = "cursor"
_MAIN_AGENT_ID = "main"
_SKIP_TOOL_NAMES = frozenset({"Task", "Agent"})

_USER_QUERY_RE = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.DOTALL)
_TIMESTAMP_RE = re.compile(r"<timestamp>.*?</timestamp>\s*", re.DOTALL)


@dataclass
class CursorTranscriptContext:
    """Per-file parsing state for incremental Cursor transcript tailing."""

    session_id: str
    transcript_path: Path
    project_name: str | None = None
    project_dir: str | None = None
    session_started: bool = False
    file_position: int = 0
    active_tool_ids: set[str] = field(default_factory=lambda: set[str]())
    last_thinking_hash: int = 0
    last_text_hash: int = 0
    line_number: int = 0


#: Where decoded project paths start. Patched in tests; "C:/" style drive
#: prefixes are handled separately for Windows.
FILESYSTEM_ROOT = Path("/")
_NON_ALNUM_RE = re.compile(r"[^A-Za-z0-9]+")
_MAX_DECODE_DEPTH = 32


def _flatten(name: str) -> str:
    """How Cursor writes a folder name into its project key."""
    return _NON_ALNUM_RE.sub("-", name).strip("-")


def _decode_from(directory: Path, tokens: list[str], depth: int) -> Path | None:
    if not tokens:
        return directory
    if depth > _MAX_DECODE_DEPTH:
        return None
    try:
        children = [c for c in directory.iterdir() if c.is_dir()]
    except OSError:
        return None
    by_flat: dict[str, list[Path]] = {}
    for child in children:
        by_flat.setdefault(_flatten(child.name).lower(), []).append(child)
    # Longest folder name first; backtrack if it leads nowhere.
    for take in range(len(tokens), 0, -1):
        for child in by_flat.get("-".join(tokens[:take]).lower(), []):
            found = _decode_from(child, tokens[take:], depth + 1)
            if found is not None:
                return found
    return None


def decode_project_dir(encoded: str, root: Path | None = None) -> str | None:
    """Rebuild the real project path from Cursor's dash-flattened folder key.

    Cursor stores ``/Users/me/claude-stalker`` as ``Users-me-claude-stalker``,
    so the dashes are ambiguous. Walk the actual directory tree and match each
    level by its flattened name. Returns None when no existing path matches.
    """
    tokens = [t for t in encoded.split("-") if t]
    if not tokens:
        return None
    start = root or FILESYSTEM_ROOT
    # Windows keys start with the drive letter ("c-Users-me-proj").
    if root is None and len(tokens[0]) == 1 and Path(f"{tokens[0]}:/").exists():
        start, tokens = Path(f"{tokens[0]}:/"), tokens[1:]
    found = _decode_from(start, tokens, 0)
    return str(found) if found is not None else None


def session_context_from_path(path: Path) -> tuple[str, str | None, str | None]:
    """Derive session id and project metadata from a Cursor transcript path."""
    session_id = path.stem
    parts = path.parts
    project_name: str | None = None
    project_dir: str | None = None
    if "projects" in parts:
        idx = parts.index("projects")
        if idx + 1 < len(parts):
            encoded = parts[idx + 1]
            project_name = encoded
            project_dir = decode_project_dir(encoded, FILESYSTEM_ROOT)
            if project_dir is not None:
                project_name = Path(project_dir).name
            elif encoded.startswith(("Users-", "users-")):
                # Folder no longer on disk: best-effort naive decode.
                project_dir = "/" + encoded.replace("-", "/")
    return session_id, project_name, project_dir


def _strip_user_prompt(raw: str) -> str:
    text = _TIMESTAMP_RE.sub("", raw)
    match = _USER_QUERY_RE.search(text)
    if match:
        return match.group(1).strip()
    return text.strip()


def _tool_use_id(session_id: str, line_number: int, index: int, block: dict[str, Any]) -> str:
    explicit = block.get("id")
    if isinstance(explicit, str) and explicit:
        return explicit
    digest = hashlib.sha256(
        f"{session_id}:{line_number}:{index}:{block.get('name', '')}".encode()
    ).hexdigest()[:16]
    return f"cursor_{digest}"


def _base_data(ctx: CursorTranscriptContext) -> dict[str, Any]:
    return {
        "source": _CURSOR_SOURCE,
        "transcript_path": str(ctx.transcript_path),
        "project_name": ctx.project_name,
        "project_dir": ctx.project_dir,
        "working_dir": ctx.project_dir,
        "agent_id": _MAIN_AGENT_ID,
    }


def _session_start_event(ctx: CursorTranscriptContext) -> SessionEvent:
    return SessionEvent(
        event_type=EventType.SESSION_START,
        session_id=ctx.session_id,
        timestamp=datetime.now(UTC),
        data=SessionEventData(
            **_base_data(ctx),
            summary="Session started (cursor)",
        ),
    )


def _flush_active_tools(ctx: CursorTranscriptContext) -> list[ToolEvent]:
    events: list[ToolEvent] = []
    for tool_id in list(ctx.active_tool_ids):
        events.append(
            ToolEvent(
                event_type=EventType.POST_TOOL_USE,
                session_id=ctx.session_id,
                timestamp=datetime.now(UTC),
                data=ToolEventData(
                    **_base_data(ctx),
                    tool_use_id=tool_id,
                    success=True,
                ),
            )
        )
        ctx.active_tool_ids.discard(tool_id)
    return events


def _ensure_session_started(ctx: CursorTranscriptContext) -> list[AnyEvent]:
    if ctx.session_started:
        return []
    ctx.session_started = True
    return [_session_start_event(ctx)]


def parse_cursor_jsonl_line(
    ctx: CursorTranscriptContext,
    record: dict[str, Any],
) -> list[AnyEvent]:
    """Convert one parsed JSON object from a Cursor transcript into office events."""
    events: list[AnyEvent] = []
    ctx.line_number += 1

    record_type = record.get("type")
    role = record.get("role")

    if record_type == "turn_ended":
        events.extend(_ensure_session_started(ctx))
        events.extend(_flush_active_tools(ctx))
        status = record.get("status", "unknown")
        events.append(
            LifecycleEvent(
                event_type=EventType.WAITING,
                session_id=ctx.session_id,
                timestamp=datetime.now(UTC),
                data=LifecycleEventData(
                    **_base_data(ctx),
                    summary=f"Cursor turn ended ({status})",
                ),
            )
        )
        return events

    message: dict[str, Any] = record.get("message") or {}
    content_blocks: list[Any] = message.get("content") or []

    is_user = role == "user" or (record_type == "user" and message.get("role") == "user")
    is_assistant = role == "assistant" or (
        record_type == "assistant" and message.get("role") == "assistant"
    )

    if is_user:
        events.extend(_ensure_session_started(ctx))
        events.extend(_flush_active_tools(ctx))
        for item in content_blocks:
            if not isinstance(item, dict):
                continue
            block = cast(dict[str, Any], item)
            if block.get("type") != "text":
                continue
            prompt = _strip_user_prompt(block.get("text", ""))
            if not prompt:
                continue
            events.append(
                PromptEvent(
                    event_type=EventType.USER_PROMPT_SUBMIT,
                    session_id=ctx.session_id,
                    timestamp=datetime.now(UTC),
                    data=PromptEventData(**_base_data(ctx), prompt=prompt),
                )
            )
        return events

    if not is_assistant:
        return events

    events.extend(_ensure_session_started(ctx))

    for index, item in enumerate(content_blocks):
        if not isinstance(item, dict):
            continue
        block = cast(dict[str, Any], item)
        block_type = block.get("type")

        if block_type == "tool_use":
            tool_name = block.get("name")
            if not tool_name or tool_name in _SKIP_TOOL_NAMES:
                continue
            tool_id = _tool_use_id(ctx.session_id, ctx.line_number, index, block)
            ctx.active_tool_ids.add(tool_id)
            events.append(
                ToolEvent(
                    event_type=EventType.PRE_TOOL_USE,
                    session_id=ctx.session_id,
                    timestamp=datetime.now(UTC),
                    data=ToolEventData(
                        **_base_data(ctx),
                        tool_name=tool_name,
                        tool_input=block.get("input") or {},
                        tool_use_id=tool_id,
                    ),
                )
            )
        elif block_type == "thinking":
            thinking_text = block.get("thinking", "")
            if thinking_text:
                text_hash = hash(thinking_text[:200])
                if text_hash != ctx.last_thinking_hash:
                    ctx.last_thinking_hash = text_hash
                    display = thinking_text.replace("\n", " ").strip()
                    if len(display) > 200:
                        display = display[:197] + "..."
                    events.append(
                        AgentEvent(
                            event_type=EventType.AGENT_UPDATE,
                            session_id=ctx.session_id,
                            timestamp=datetime.now(UTC),
                            data=AgentEventData(
                                **_base_data(ctx),
                                thinking=thinking_text,
                                bubble_content=BubbleContent(
                                    type=BubbleType.THOUGHT,
                                    text=display,
                                    icon="💭",
                                ),
                            ),
                        )
                    )
        elif block_type == "text":
            text_content = block.get("text", "")
            if text_content:
                text_hash = hash(text_content[:200])
                if text_hash != ctx.last_text_hash:
                    ctx.last_text_hash = text_hash
                    display = text_content.replace("\n", " ").strip()
                    if len(display) > 200:
                        display = display[:197] + "..."
                    events.append(
                        AgentEvent(
                            event_type=EventType.AGENT_UPDATE,
                            session_id=ctx.session_id,
                            timestamp=datetime.now(UTC),
                            data=AgentEventData(
                                **_base_data(ctx),
                                summary=text_content,
                                bubble_content=BubbleContent(
                                    type=BubbleType.SPEECH,
                                    text=display,
                                    icon="💬",
                                ),
                            ),
                        )
                    )

    return events
