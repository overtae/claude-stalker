"""Poll Cursor IDE agent-transcript JSONL files and ingest office events."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import time
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any, cast

from app.config import get_settings
from app.core.cursor_transcript_mapper import (
    CursorTranscriptContext,
    parse_cursor_jsonl_line,
    session_context_from_path,
)
from app.core.path_utils import is_safe_transcript_path
from app.models.events import AnyEvent

logger = logging.getLogger(__name__)

EventCallback = Callable[[AnyEvent], Awaitable[None]]

_DEFAULT_POLL_INTERVAL = 2.0
# Avoid scanning every historical Cursor chat on each tick (can be thousands of files).
_MAX_TRACKED_TRANSCRIPTS = 64
_RECENT_TRANSCRIPT_SECONDS = 7 * 24 * 3600


def _discover_transcript_paths(roots: list[Path]) -> list[Path]:
    cutoff = time.time() - _RECENT_TRANSCRIPT_SECONDS
    candidates: list[tuple[float, Path]] = []
    for root in roots:
        if not root.is_dir():
            continue
        # ~/.cursor also holds >1 GB of extensions; transcripts only live under
        # projects/<key>/agent-transcripts, so don't walk everything every tick.
        projects = root / "projects"
        found = (
            projects.glob("*/agent-transcripts/**/*.jsonl")
            if projects.is_dir()
            else root.rglob("*.jsonl")
        )
        for path in found:
            if "agent-transcripts" not in path.parts:
                continue
            if not is_safe_transcript_path(path):
                continue
            try:
                mtime = path.stat().st_mtime
            except OSError:
                continue
            if mtime >= cutoff:
                candidates.append((mtime, path))
    candidates.sort(key=lambda item: item[0], reverse=True)
    return [path for _, path in candidates[:_MAX_TRACKED_TRANSCRIPTS]]


class CursorTranscriptPoller:
    """Scans Cursor transcript roots and tails new JSONL lines into events."""

    def __init__(self, event_callback: EventCallback) -> None:
        self._event_callback = event_callback
        self._files: dict[str, CursorTranscriptContext] = {}
        self._task: asyncio.Task[None] | None = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        async with self._lock:
            if self._task is not None:
                return
            self._task = asyncio.create_task(
                self._loop(),
                name="cursor_transcript_poller",
            )
            logger.info("Cursor transcript poller started")

    async def stop(self) -> None:
        async with self._lock:
            task = self._task
            self._task = None
        if task is None:
            return
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
        logger.info("Cursor transcript poller stopped")

    def _poll_interval(self) -> float:
        return get_settings().STALKER_CURSOR_POLL_INTERVAL

    async def _loop(self) -> None:
        try:
            while True:
                try:
                    await self._scan_once()
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception("Cursor transcript poll tick failed")
                await asyncio.sleep(self._poll_interval())
        except asyncio.CancelledError:
            pass

    async def _scan_once(self) -> None:
        settings = get_settings()
        roots = settings.cursor_transcript_roots()
        paths = await asyncio.to_thread(_discover_transcript_paths, roots)
        for path in paths:
            await self._poll_file(path)

    def _register_file(self, path: Path) -> CursorTranscriptContext:
        key = str(path)
        existing = self._files.get(key)
        if existing is not None:
            return existing
        session_id, project_name, project_dir = session_context_from_path(path)
        ctx = CursorTranscriptContext(
            session_id=session_id,
            transcript_path=path,
            project_name=project_name,
            project_dir=project_dir,
        )
        if path.exists():
            ctx.file_position = path.stat().st_size
        self._files[key] = ctx
        logger.info("Tracking Cursor transcript %s (session %s)", path, session_id)
        return ctx

    async def _poll_file(self, path: Path) -> None:
        translated = Path(get_settings().translate_path(str(path))).expanduser()
        if not is_safe_transcript_path(translated):
            return
        ctx = self._register_file(translated)
        new_content, new_position = await asyncio.to_thread(
            self._read_appended_bytes,
            translated,
            ctx.file_position,
        )
        ctx.file_position = new_position
        if not new_content.strip():
            return

        for line in new_content.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(record, dict):
                continue
            events = parse_cursor_jsonl_line(ctx, cast(dict[str, Any], record))
            for event in events:
                try:
                    await self._event_callback(event)
                except Exception:
                    logger.exception("Cursor ingest callback failed for %s", event.event_type)

    @staticmethod
    def _read_appended_bytes(path: Path, position: int) -> tuple[str, int]:
        if not path.exists():
            return "", position
        size = path.stat().st_size
        if size <= position:
            return "", position
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            handle.seek(position)
            chunk = handle.read()
            return chunk, handle.tell()


_cursor_poller: CursorTranscriptPoller | None = None


def get_cursor_transcript_poller() -> CursorTranscriptPoller | None:
    return _cursor_poller


def init_cursor_transcript_poller(event_callback: EventCallback) -> CursorTranscriptPoller:
    global _cursor_poller
    _cursor_poller = CursorTranscriptPoller(event_callback)
    return _cursor_poller
