#!/usr/bin/env python3
import argparse
import json
import os
import shutil
from pathlib import Path
from typing import Any

# Constants
HOOK_TYPES = [
    "SessionStart",
    "SessionEnd",
    "PreToolUse",
    "PostToolUse",
    "UserPromptSubmit",
    "PermissionRequest",
    "Notification",
    "Stop",
    "SubagentStart",
    "SubagentStop",
    "PreCompact",
]


def get_settings_path() -> Path:
    """Get the path to the Claude settings file."""
    # Priority: Env var -> ~/.claude/settings.json
    if os.environ.get("CLAUDE_CONFIG_DIR"):
        return Path(os.environ["CLAUDE_CONFIG_DIR"]) / "settings.json"
    return Path.home() / ".claude" / "settings.json"


def load_settings(path: Path) -> dict[str, Any]:
    """Load settings from JSON file.

    A missing file returns ``{}`` (fresh install). A file that exists but
    fails to parse is a hard stop: returning ``{}`` here would cause the
    caller to write a near-empty dict back over the user's real config and
    silently wipe unrelated settings (permissions, env, model, statusline).
    """
    if not path.exists():
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise SystemExit(
            f"ERROR: {path} exists but is not valid JSON ({e}).\n"
            "Refusing to continue: proceeding would overwrite your settings.\n"
            "Fix or move the file, then re-run install."
        ) from e


def save_settings(path: Path, settings: dict[str, Any]) -> None:
    """Save settings atomically, backing up the original once per run.

    Writes a temp file in the same directory then ``os.replace``s it into
    place, so a crash mid-write cannot leave a truncated ``settings.json``.
    The first mutation of an existing file is snapshotted to
    ``settings.json.bak``; the ``if not backup.exists()`` guard preserves
    the oldest known-good copy across repeated runs.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        backup = path.with_suffix(".json.bak")
        if not backup.exists():
            shutil.copy2(path, backup)
    tmp = path.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")
    os.replace(tmp, path)


def create_hook_config(hook_cmd: str, hook_type: str) -> dict[str, Any]:
    """Create the hook configuration dictionary.

    Args:
        hook_cmd: Path to the claude-office-hook command
        hook_type: The hook type in PascalCase (e.g., "PreToolUse")
    """
    # Convert PascalCase to snake_case for the event type argument
    event_type = convert_camel_to_snake(hook_type)

    config = {
        "type": "command",
        "command": f"{hook_cmd} {event_type}",
        "timeout": 2,  # Seconds
    }

    # Wrap in the structure expected by Claude Code
    # Structure:
    # "HookName": [
    #   {
    #     "matcher": ".*" (optional),
    #     "hooks": [ { "type": "command", ... } ]
    #   }
    # ]

    hook_entry: dict[str, Any] = {"hooks": [config]}

    # Hooks that support matchers (match all with ".*")
    if hook_type in [
        "PreToolUse",
        "PostToolUse",
        "PermissionRequest",
        "Notification",
        "SubagentStart",
        "SubagentStop",
    ]:
        hook_entry["matcher"] = ".*"

    return hook_entry


def is_same_hook(entry1: dict[str, Any], entry2: dict[str, Any]) -> bool:
    """Check if two hook entries are effectively the same."""
    # Simple comparison of command path
    try:
        cmd1 = entry1.get("hooks", [])[0].get("command")
        cmd2 = entry2.get("hooks", [])[0].get("command")
        return cmd1 == cmd2
    except (IndexError, AttributeError):
        return False


def install_hooks(hook_cmd: str, dry_run: bool = False):
    """Install hooks into settings.

    Args:
        hook_cmd: Path to the claude-office-hook command
        dry_run: If True, don't actually save changes
    """
    settings_path = get_settings_path()
    print(f"Installing hooks to {settings_path}...")

    settings = load_settings(settings_path)
    hooks_config = settings.get("hooks", {})

    changes_made = False

    for hook_type in HOOK_TYPES:
        new_entry = create_hook_config(hook_cmd, hook_type)
        event_type = convert_camel_to_snake(hook_type)

        current_list = hooks_config.get(hook_type, [])

        # Check for duplicates
        if any(is_same_hook(existing, new_entry) for existing in current_list):
            print(f"  [Skip] {hook_type}: Hook already exists.")
            continue

        print(f"  [Add]  {hook_type}: {hook_cmd} {event_type}")
        current_list.append(new_entry)
        hooks_config[hook_type] = current_list
        changes_made = True

    if changes_made:
        settings["hooks"] = hooks_config
        if not dry_run:
            save_settings(settings_path, settings)
            print("Settings saved.")
        else:
            print("Dry run: No changes saved.")
    else:
        print("No changes needed.")


def uninstall_hooks(_hook_cmd: str, dry_run: bool = False) -> None:
    """Remove hooks from settings.

    Args:
        _hook_cmd: Path to the claude-office-hook command (unused, hooks identified by pattern)
        dry_run: If True, don't actually save changes
    """
    del _hook_cmd  # Unused - hooks identified by pattern match
    settings_path = get_settings_path()
    print(f"Uninstalling hooks from {settings_path}...")

    settings = load_settings(settings_path)
    hooks_config = settings.get("hooks", {})

    changes_made = False

    for hook_type in list(hooks_config.keys()):
        current_list = hooks_config[hook_type]
        original_len = len(current_list)

        # Filter out hooks that use our command (both new direct and old .sh wrappers)
        new_list: list[Any] = []
        for entry in current_list:
            try:
                cmd = entry.get("hooks", [])[0].get("command", "")
                # Match both "claude-office-hook" (new) and "claude-office/hooks/*.sh" (old)
                if "claude-office-hook" in cmd or "claude-office/hooks/" in cmd:
                    print(f"  [Remove] {hook_type}: {cmd}")
                    continue
            except (IndexError, AttributeError):
                pass
            new_list.append(entry)

        if len(new_list) < original_len:
            hooks_config[hook_type] = new_list
            changes_made = True

        # Clean up empty lists
        if not hooks_config[hook_type]:
            del hooks_config[hook_type]

    if changes_made:
        settings["hooks"] = hooks_config
        if not dry_run:
            save_settings(settings_path, settings)
            print("Settings saved.")
        else:
            print("Dry run: No changes saved.")
    else:
        print("No hooks found to remove.")


# ---------------------------------------------------------------------------
# Codex — same hook contract, registered in $CODEX_HOME/hooks.json
# ---------------------------------------------------------------------------

CODEX_HOOK_TYPES = [
    "SessionStart",
    "SessionEnd",
    "UserPromptSubmit",
    "PreToolUse",
    "PostToolUse",
    "PermissionRequest",
    "PreCompact",
    "Stop",
    "SubagentStart",
    "SubagentStop",
]
#: Every command we register for Codex carries this flag — it identifies ours.
CODEX_SOURCE_FLAG = "--source codex"
_CODEX_TOOL_EVENTS = {"PreToolUse", "PostToolUse", "PermissionRequest"}
#: Seconds. Codex caps SessionEnd hooks at 3s.
_CODEX_TIMEOUT = 5
_CODEX_SESSION_END_TIMEOUT = 3


def get_codex_home() -> Path:
    return Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex")


def create_codex_hook_config(hook_cmd: str, hook_type: str, guard: str = "") -> dict[str, Any]:
    """One matcher group for a Codex event (``guard`` is appended, e.g. ``|| true``)."""
    event_type = convert_camel_to_snake(hook_type)
    handler = {
        "type": "command",
        "command": f"{hook_cmd} {CODEX_SOURCE_FLAG} {event_type}{guard}",
        "timeout": _CODEX_SESSION_END_TIMEOUT if hook_type == "SessionEnd" else _CODEX_TIMEOUT,
    }
    entry: dict[str, Any] = {"hooks": [handler]}
    if hook_type in _CODEX_TOOL_EVENTS:
        entry["matcher"] = ".*"
    return entry


def _is_ours_codex(entry: Any) -> bool:
    try:
        return any(CODEX_SOURCE_FLAG in h.get("command", "") for h in entry.get("hooks", []))
    except AttributeError:
        return False


def install_codex_hooks(hook_cmd: str, guard: str = "", dry_run: bool = False) -> str:
    """Register (or re-point) our Codex hooks. Returns "no-codex", "unchanged" or "registered".

    Codex runs new or changed hooks only after the user trusts them in
    ``/hooks``; any of our older entries (another path) are replaced.
    """
    home = get_codex_home()
    if not home.is_dir():
        return "no-codex"
    path = home / "hooks.json"
    config = load_settings(path)
    hooks: dict[str, list[Any]] = config.get("hooks", {})
    changed = False
    for hook_type in CODEX_HOOK_TYPES:
        wanted = create_codex_hook_config(hook_cmd, hook_type, guard)
        current = hooks.get(hook_type, [])
        kept = [e for e in current if not _is_ours_codex(e) or e == wanted]
        if wanted not in kept:
            kept.append(wanted)
        if kept != current:
            hooks[hook_type] = kept
            changed = True
    if not changed:
        return "unchanged"
    config["hooks"] = hooks
    if not dry_run:
        save_settings(path, config)
    return "registered"


def uninstall_codex_hooks(dry_run: bool = False, marker: str | None = None) -> int:
    """Remove our Codex hook entries; returns how many were removed.

    ``marker`` narrows it to entries whose command also contains that text
    (the desktop app removes only its own, not a CLI install).
    """
    path = get_codex_home() / "hooks.json"
    if not path.is_file():
        return 0
    config = load_settings(path)
    hooks: dict[str, list[Any]] = config.get("hooks", {})
    removed = 0
    for hook_type in list(hooks):
        kept = [
            e
            for e in hooks[hook_type]
            if not (_is_ours_codex(e) and (marker is None or marker in json.dumps(e)))
        ]
        removed += len(hooks[hook_type]) - len(kept)
        if kept:
            hooks[hook_type] = kept
        else:
            del hooks[hook_type]
    if removed and not dry_run:
        config["hooks"] = hooks
        save_settings(path, config)
    return removed


def convert_camel_to_snake(name: str) -> str:
    import re

    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


def main():
    parser = argparse.ArgumentParser(description="Manage Claude Office hooks.")
    parser.add_argument(
        "action",
        choices=["install", "uninstall", "install-codex", "uninstall-codex"],
        help="Action to perform",
    )
    parser.add_argument("--dry-run", action="store_true", help="Don't save changes")
    parser.add_argument("--hook-cmd", help="Path to claude-office-hook command", required=True)

    args = parser.parse_args()

    if args.action == "install":
        install_hooks(args.hook_cmd, args.dry_run)
    elif args.action == "uninstall":
        uninstall_hooks(args.hook_cmd, args.dry_run)
    elif args.action == "install-codex":
        print(f"Codex hooks: {install_codex_hooks(args.hook_cmd, dry_run=args.dry_run)}")
    elif args.action == "uninstall-codex":
        print(f"Codex hooks removed: {uninstall_codex_hooks(args.dry_run)}")


if __name__ == "__main__":
    main()
