"""Background subprocesses must not open console windows on Windows."""

import subprocess
from pathlib import Path
from typing import Any

import pytest

from app.core import beads_poller
from app.core.process_utils import NO_WINDOW_FLAGS
from app.services import git_service as git_module


def _capture_run(monkeypatch: pytest.MonkeyPatch, module: Any) -> dict[str, Any]:
    captured: dict[str, Any] = {}

    def fake_run(*args: Any, **kwargs: Any) -> subprocess.CompletedProcess[str]:
        captured.update(kwargs)
        return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

    monkeypatch.setattr(module.subprocess, "run", fake_run)
    return captured


def test_git_runs_without_console_window(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    captured = _capture_run(monkeypatch, git_module)

    git_module.GitService()._run_git(["status"], tmp_path)  # pyright: ignore[reportPrivateUsage]

    assert captured["creationflags"] == NO_WINDOW_FLAGS


def test_bd_runs_without_console_window(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    captured = _capture_run(monkeypatch, beads_poller)

    beads_poller._run_bd_query(str(tmp_path))  # pyright: ignore[reportPrivateUsage]

    assert captured["creationflags"] == NO_WINDOW_FLAGS
