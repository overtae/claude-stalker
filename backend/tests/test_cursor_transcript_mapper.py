"""Tests for Cursor agent-transcript JSONL → office event mapping."""

from pathlib import Path

from app.core.cursor_transcript_mapper import (
    CursorTranscriptContext,
    parse_cursor_jsonl_line,
    session_context_from_path,
)
from app.models.events import EventType


def test_session_context_falls_back_when_folder_is_gone(
    tmp_path: Path,
    monkeypatch,  # type: ignore[no-untyped-def]
) -> None:
    # empty root: nothing on disk matches, so the naive decode is used
    monkeypatch.setattr("app.core.cursor_transcript_mapper.FILESYSTEM_ROOT", tmp_path)
    path = Path(
        "/Users/x/.cursor/projects/Users-recycleledger-workspace/agent-transcripts/"
        "abc-123/abc-123.jsonl"
    )
    session_id, project_name, project_dir = session_context_from_path(path)
    assert session_id == "abc-123"
    assert project_name == "Users-recycleledger-workspace"
    assert project_dir == "/Users/recycleledger/workspace"


def test_user_prompt_and_tool_use() -> None:
    ctx = CursorTranscriptContext(
        session_id="sess-1",
        transcript_path=Path("/home/.cursor/projects/p/agent-transcripts/sess-1/sess-1.jsonl"),
        project_name="p",
    )
    user_line = {
        "role": "user",
        "message": {
            "content": [
                {
                    "type": "text",
                    "text": "<user_query>\nhello cursor\n</user_query>",
                }
            ]
        },
    }
    events = parse_cursor_jsonl_line(ctx, user_line)
    assert ctx.session_started is True
    assert events[0].event_type == EventType.SESSION_START
    assert events[1].event_type == EventType.USER_PROMPT_SUBMIT
    assert events[1].data.prompt == "hello cursor"
    assert events[1].data.source == "cursor"

    assistant_line = {
        "role": "assistant",
        "message": {
            "content": [
                {"type": "tool_use", "name": "Read", "input": {"path": "/tmp/x"}},
            ]
        },
    }
    tool_events = parse_cursor_jsonl_line(ctx, assistant_line)
    assert len(tool_events) == 1
    assert tool_events[0].event_type == EventType.PRE_TOOL_USE
    assert tool_events[0].data.tool_name == "Read"

    turn_end = {"type": "turn_ended", "status": "success"}
    end_events = parse_cursor_jsonl_line(ctx, turn_end)
    types = [e.event_type for e in end_events]
    assert EventType.POST_TOOL_USE in types
    assert EventType.WAITING in types


def test_skips_task_tool() -> None:
    ctx = CursorTranscriptContext(
        session_id="s",
        transcript_path=Path("/a.jsonl"),
    )
    ctx.session_started = True
    record = {
        "role": "assistant",
        "message": {"content": [{"type": "tool_use", "name": "Task", "input": {}}]},
    }
    assert parse_cursor_jsonl_line(ctx, record) == []


# --- project dir decoding (Cursor flattens "/", "-", ".", "_" into "-") -----

from app.core.cursor_transcript_mapper import decode_project_dir  # noqa: E402


def test_decode_keeps_dashes_inside_real_folder_names(tmp_path: Path) -> None:
    project = tmp_path / "Users" / "me" / "workspace" / "utils" / "claude-stalker"
    project.mkdir(parents=True)

    decoded = decode_project_dir("Users-me-workspace-utils-claude-stalker", root=tmp_path)

    assert decoded == str(project)


def test_decode_matches_dots_and_underscores(tmp_path: Path) -> None:
    project = tmp_path / "Users" / "me" / "my_app.v2"
    project.mkdir(parents=True)

    assert decode_project_dir("Users-me-my-app-v2", root=tmp_path) == str(project)


def test_decode_backtracks_when_a_shorter_name_is_a_dead_end(tmp_path: Path) -> None:
    (tmp_path / "a").mkdir()  # tempting but wrong prefix
    project = tmp_path / "a-b" / "c"
    project.mkdir(parents=True)

    assert decode_project_dir("a-b-c", root=tmp_path) == str(project)


def test_decode_returns_none_when_nothing_matches(tmp_path: Path) -> None:
    assert decode_project_dir("Users-ghost-proj", root=tmp_path) is None


def test_session_context_uses_real_folder_name(tmp_path: Path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    project = tmp_path / "Users" / "me" / "claude-stalker"
    project.mkdir(parents=True)
    monkeypatch.setattr("app.core.cursor_transcript_mapper.FILESYSTEM_ROOT", tmp_path)
    path = Path("/x/.cursor/projects/Users-me-claude-stalker/agent-transcripts/s1/s1.jsonl")

    _, project_name, project_dir = session_context_from_path(path)

    assert project_dir == str(project)
    assert project_name == "claude-stalker"
