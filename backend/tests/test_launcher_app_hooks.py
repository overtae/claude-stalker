"""Desktop app hook registration edits ~/.claude/settings.json safely."""

import json
from pathlib import Path

import pytest

from app.launcher import hook_setup

REPO_MANAGE_HOOKS = Path(__file__).resolve().parents[2] / "hooks" / "manage_hooks.py"
MARKER = "Claude Stalker"


def cmd(exe: Path) -> str:
    return hook_setup.quote_command(exe) + " hook"


@pytest.fixture
def settings_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(tmp_path))
    monkeypatch.setattr(hook_setup, "MANAGE_HOOKS", REPO_MANAGE_HOOKS)
    return tmp_path / "settings.json"


def _commands(path: Path) -> list[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [h["command"] for entries in data["hooks"].values() for e in entries for h in e["hooks"]]


def test_registers_every_hook_with_quoted_path(settings_file: Path) -> None:
    exe = Path("/Applications/Claude Stalker.app/Contents/MacOS/Claude Stalker")

    result = hook_setup.register_app_hooks(cmd(exe), MARKER)

    commands = _commands(settings_file)
    assert result == "registered"
    assert f'"{exe.as_posix()}" hook pre_tool_use || true' in commands
    assert len(commands) == 11


def test_second_run_changes_nothing(settings_file: Path) -> None:
    exe = Path("/Apps/Claude Stalker.app/Contents/MacOS/Claude Stalker")
    hook_setup.register_app_hooks(cmd(exe), MARKER)

    assert hook_setup.register_app_hooks(cmd(exe), MARKER) == "unchanged"


def test_leaves_existing_cli_hooks_alone(settings_file: Path) -> None:
    settings_file.write_text(
        json.dumps(
            {
                "hooks": {
                    "Stop": [{"hooks": [{"type": "command", "command": "claude-office-hook stop"}]}]
                }
            }
        ),
        encoding="utf-8",
    )

    result = hook_setup.register_app_hooks(cmd(Path("/x/Claude Stalker")), MARKER)

    assert result == "cli"
    assert _commands(settings_file) == ["claude-office-hook stop"]


def test_moved_app_replaces_old_path_but_keeps_other_hooks(settings_file: Path) -> None:
    old = Path("/Users/me/Downloads/Claude Stalker.app/Contents/MacOS/Claude Stalker")
    new = Path("/Applications/Claude Stalker.app/Contents/MacOS/Claude Stalker")
    hook_setup.register_app_hooks(cmd(old), MARKER)
    data = json.loads(settings_file.read_text(encoding="utf-8"))
    data["hooks"]["Stop"].append({"hooks": [{"type": "command", "command": "my-own-hook"}]})
    settings_file.write_text(json.dumps(data), encoding="utf-8")

    hook_setup.register_app_hooks(cmd(new), MARKER)

    commands = _commands(settings_file)
    assert not any(old.as_posix() in c for c in commands)
    assert f'"{new.as_posix()}" hook stop || true' in commands
    assert "my-own-hook" in commands


def test_unregister_removes_only_app_hooks(settings_file: Path) -> None:
    exe = Path("/Applications/Claude Stalker.app/Contents/MacOS/Claude Stalker")
    hook_setup.register_app_hooks(cmd(exe), MARKER)
    data = json.loads(settings_file.read_text(encoding="utf-8"))
    data["hooks"]["Stop"].append({"hooks": [{"type": "command", "command": "my-own-hook"}]})
    settings_file.write_text(json.dumps(data), encoding="utf-8")

    removed = hook_setup.unregister_app_hooks(MARKER)

    assert removed == 11
    assert _commands(settings_file) == ["my-own-hook"]
