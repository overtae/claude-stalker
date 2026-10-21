"""Fail-safe tests for the hooks config installer (ARC-008).

Covers the three behaviors added in the hardening:
- malformed ``settings.json`` aborts installation instead of wiping it,
- writes are atomic (temp file + ``os.replace``) with no ``.tmp`` left behind,
- the first mutation of an existing file is backed up to ``settings.json.bak``.
"""

import json
from pathlib import Path

import pytest

import manage_hooks


def _settings_path(tmp_path: Path) -> Path:
    return tmp_path / "settings.json"


def test_load_settings_aborts_on_invalid_json(tmp_path: Path) -> None:
    """A malformed settings.json must raise SystemExit, not return {}."""
    path = _settings_path(tmp_path)
    path.write_text("{ not json ", encoding="utf-8")

    with pytest.raises(SystemExit) as exc:
        manage_hooks.load_settings(path)

    assert "not valid JSON" in str(exc.value)
    # The corrupt original must be left byte-for-byte intact.
    assert path.read_text(encoding="utf-8") == "{ not json "


def test_install_aborts_on_invalid_json_without_touching_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """End-to-end: install into a malformed settings.json aborts before any write."""
    monkeypatch.setenv("CLAUDE_CONFIG_DIR", str(tmp_path))
    path = _settings_path(tmp_path)
    original = "{ broken"
    path.write_text(original, encoding="utf-8")

    with pytest.raises(SystemExit):
        manage_hooks.install_hooks("/usr/local/bin/claude-office-hook")

    # File untouched, no backup or temp artifacts created.
    assert path.read_text(encoding="utf-8") == original
    assert not (tmp_path / "settings.json.bak").exists()
    assert not (tmp_path / "settings.json.tmp").exists()


def test_save_settings_is_atomic_and_creates_backup(tmp_path: Path) -> None:
    """Saving over an existing file: backup created once, unrelated keys preserved."""
    path = _settings_path(tmp_path)
    path.write_text(json.dumps({"model": "opus", "permissions": {}}), encoding="utf-8")

    manage_hooks.save_settings(path, {"model": "opus", "permissions": {}, "hooks": {}})

    # New content written and parseable; unrelated key preserved.
    saved = json.loads(path.read_text(encoding="utf-8"))
    assert saved["model"] == "opus"
    # First-mutation backup captured the pre-write original.
    backup = tmp_path / "settings.json.bak"
    assert backup.exists()
    assert json.loads(backup.read_text(encoding="utf-8"))["model"] == "opus"
    # No temp file left behind.
    assert not (tmp_path / "settings.json.tmp").exists()


def test_save_settings_preserves_oldest_backup_across_runs(tmp_path: Path) -> None:
    """A second run must not overwrite the first-run ``.bak`` snapshot."""
    path = _settings_path(tmp_path)
    backup = tmp_path / "settings.json.bak"

    path.write_text(json.dumps({"v": 1}), encoding="utf-8")
    manage_hooks.save_settings(path, {"v": 2})
    first_backup = backup.read_text(encoding="utf-8")
    assert json.loads(first_backup)["v"] == 1

    path.write_text(json.dumps({"v": 999}), encoding="utf-8")
    manage_hooks.save_settings(path, {"v": 3})
    # Backup still holds the original v=1 snapshot, not v=999.
    assert json.loads(backup.read_text(encoding="utf-8"))["v"] == 1


def test_load_settings_returns_empty_for_missing_file(tmp_path: Path) -> None:
    """A fresh install (no settings.json) is still allowed: returns {}."""
    assert manage_hooks.load_settings(_settings_path(tmp_path)) == {}


# --- Codex (~/.codex/hooks.json) ---------------------------------------------


@pytest.fixture
def codex_home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    home = tmp_path / ".codex"
    home.mkdir()
    monkeypatch.setenv("CODEX_HOME", str(home))
    return home


def _codex_commands(home: Path) -> list[str]:
    data = json.loads((home / "hooks.json").read_text(encoding="utf-8"))
    return [h["command"] for es in data["hooks"].values() for e in es for h in e["hooks"]]


def test_codex_install_registers_every_event_with_source_flag(codex_home: Path) -> None:
    status = manage_hooks.install_codex_hooks("claude-office-hook")

    commands = _codex_commands(codex_home)
    assert status == "registered"
    assert "claude-office-hook --source codex pre_tool_use" in commands
    assert "claude-office-hook --source codex stop" in commands
    assert len(commands) == len(manage_hooks.CODEX_HOOK_TYPES)


def test_codex_install_is_idempotent_and_keeps_other_hooks(codex_home: Path) -> None:
    (codex_home / "hooks.json").write_text(
        json.dumps({"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "mine"}]}]}}),
        encoding="utf-8",
    )
    manage_hooks.install_codex_hooks("claude-office-hook")

    assert manage_hooks.install_codex_hooks("claude-office-hook") == "unchanged"
    assert "mine" in _codex_commands(codex_home)


def test_codex_install_replaces_our_old_command(codex_home: Path) -> None:
    manage_hooks.install_codex_hooks('"/Old/Claude Stalker" hook')
    manage_hooks.install_codex_hooks('"/New/Claude Stalker" hook')

    commands = _codex_commands(codex_home)
    assert not any("/Old/" in c for c in commands)
    assert len(commands) == len(manage_hooks.CODEX_HOOK_TYPES)


def test_codex_install_skips_when_codex_is_not_installed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("CODEX_HOME", str(tmp_path / "missing"))

    assert manage_hooks.install_codex_hooks("claude-office-hook") == "no-codex"
    assert not (tmp_path / "missing").exists()


def test_codex_uninstall_removes_only_ours(codex_home: Path) -> None:
    manage_hooks.install_codex_hooks("claude-office-hook")
    data = json.loads((codex_home / "hooks.json").read_text(encoding="utf-8"))
    data["hooks"]["Stop"].append({"hooks": [{"type": "command", "command": "mine"}]})
    (codex_home / "hooks.json").write_text(json.dumps(data), encoding="utf-8")

    manage_hooks.uninstall_codex_hooks()

    assert _codex_commands(codex_home) == ["mine"]
