"""Tests for transcript path validation (Claude + Cursor roots)."""

from pathlib import Path

import pytest

from app.core.path_utils import is_safe_transcript_path


@pytest.fixture
def claude_transcript(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    home = tmp_path / "home"
    claude = home / ".claude" / "projects" / "demo"
    claude.mkdir(parents=True)
    monkeypatch.setattr(Path, "home", lambda: home)
    file = claude / "session.jsonl"
    file.write_text('{"type":"user"}\n', encoding="utf-8")
    return file


@pytest.fixture
def cursor_transcript(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    home = tmp_path / "home"
    cursor_dir = home / ".cursor" / "projects" / "myproj" / "agent-transcripts"
    cursor_dir.mkdir(parents=True)
    monkeypatch.setattr(Path, "home", lambda: home)
    file = cursor_dir / "abc.jsonl"
    file.write_text('{"type":"user"}\n', encoding="utf-8")
    return file


def test_allows_claude_jsonl(claude_transcript: Path) -> None:
    assert is_safe_transcript_path(claude_transcript) is True


def test_allows_cursor_jsonl(cursor_transcript: Path) -> None:
    assert is_safe_transcript_path(cursor_transcript) is True


def test_rejects_outside_roots(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setattr(Path, "home", lambda: home)
    evil = tmp_path / "evil.jsonl"
    evil.write_text("{}", encoding="utf-8")
    assert is_safe_transcript_path(evil) is False


def test_rejects_non_jsonl(claude_transcript: Path) -> None:
    txt = claude_transcript.with_suffix(".txt")
    txt.write_text("x", encoding="utf-8")
    assert is_safe_transcript_path(txt) is False
