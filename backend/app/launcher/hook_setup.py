"""First-run hook setup for the packaged ``claude-stalker`` command.

Mirrors ``hooks/install.sh`` so a user who only ran ``uvx claude-stalker``
gets the same result: a config file in ``~/.claude``, the
``claude-office-hook`` tool on PATH, and the hook entries registered in
Claude Code's ``settings.json``.
"""

from __future__ import annotations

import importlib.util
import os
import secrets
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any, cast

CONFIG_FILE = Path.home() / ".claude" / "claude-office-config.env"
HOOK_CMD = "claude-office-hook"

#: Files built into the wheel by scripts/build-dist.sh.
BUNDLED_DIR = Path(__file__).resolve().parent.parent / "_bundled"
MANAGE_HOOKS = BUNDLED_DIR / "manage_hooks.py"


def default_strip_prefixes() -> str:
    """Same defaults install.sh writes (Claude's encoded project-dir prefixes)."""
    user = os.environ.get("USER") or os.environ.get("USERNAME") or ""
    return f"-Users-{user}-Repos-,-Users-{user}-"


def read_config(path: Path) -> dict[str, str]:
    """Parse a KEY=VALUE env file, ignoring comments and stripping quotes."""
    if not path.is_file():
        return {}
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def ensure_config(path: Path, api_url: str | None) -> bool:
    """Create or update the hook config, never replacing an existing API key.

    Managed keys get defaults only when missing. The API URL follows the
    port we serve on when ``api_url`` is given; ``None`` leaves it as is (the
    hooks then fall back to their :8000 default). Unknown keys a user added
    are kept. Returns True when the file was created.
    """
    existing = read_config(path)
    created = not path.exists()
    merged = {
        "CLAUDE_OFFICE_STRIP_PREFIXES": existing.get(
            "CLAUDE_OFFICE_STRIP_PREFIXES", default_strip_prefixes()
        ),
        "CLAUDE_OFFICE_DEBUG": existing.get("CLAUDE_OFFICE_DEBUG", "0"),
        "CLAUDE_OFFICE_API_KEY": existing.get("CLAUDE_OFFICE_API_KEY") or secrets.token_urlsafe(32),
    }
    url = api_url or existing.get("CLAUDE_OFFICE_API_URL")
    if url:
        merged["CLAUDE_OFFICE_API_URL"] = url
    extras = {k: v for k, v in existing.items() if k not in merged}

    lines = ["# Claude Office Hooks Configuration", "# Managed by claude-stalker", ""]
    lines += [f'{key}="{value}"' for key, value in {**merged, **extras}.items()]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return created


@dataclass(frozen=True)
class HookSetupResult:
    installed_tool: bool
    message: str


def _bundled_hook_wheel() -> Path | None:
    wheels = sorted(BUNDLED_DIR.glob("claude_office_hooks-*.whl"))
    return wheels[-1] if wheels else None


def ensure_hook_tool(force: bool = False) -> HookSetupResult:
    """Install ``claude-office-hook`` with ``uv tool`` unless it's already on PATH."""
    if shutil.which(HOOK_CMD) and not force:
        return HookSetupResult(False, "hook already installed")

    uv = shutil.which("uv")
    wheel = _bundled_hook_wheel()
    if uv is None:
        return HookSetupResult(False, "uv not found — install uv, then run again")
    if wheel is None:
        return HookSetupResult(False, "hook wheel missing from this build")

    subprocess.run([uv, "tool", "install", "--force", str(wheel)], check=True)
    return HookSetupResult(True, f"installed {HOOK_CMD}")


def register_hooks() -> None:
    """Add the hook entries to Claude Code settings (idempotent)."""
    if not MANAGE_HOOKS.is_file():
        raise FileNotFoundError(f"{MANAGE_HOOKS} is missing from this build")
    subprocess.run(
        [sys.executable, str(MANAGE_HOOKS), "install", "--hook-cmd", HOOK_CMD],
        check=True,
        stdout=subprocess.DEVNULL,
    )


# ---------------------------------------------------------------------------
# Desktop app: register the bundled hook executable by absolute path
# ---------------------------------------------------------------------------

#: Appended to desktop hook commands: exit 0 even when the app was removed.
MISSING_APP_GUARD = " || true"

#: Command name the uv-tool install registers (`hooks/install.sh`, `uvx claude-stalker`).
CLI_HOOK_MARKER = "claude-office-hook"


def _manage_hooks() -> ModuleType:
    """Load the bundled ``manage_hooks.py`` so settings edits share one implementation."""
    spec = importlib.util.spec_from_file_location("stalker_manage_hooks", MANAGE_HOOKS)
    if spec is None or spec.loader is None:
        raise FileNotFoundError(f"{MANAGE_HOOKS} is missing from this build")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _commands(entries: list[Any]) -> list[str]:
    """All ``command`` strings inside Claude Code hook entries."""
    commands: list[str] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        hooks = cast(dict[str, Any], entry).get("hooks", [])
        for hook in cast(list[Any], hooks) if isinstance(hooks, list) else []:
            command = cast(dict[str, Any], hook).get("command") if isinstance(hook, dict) else None
            if isinstance(command, str):
                commands.append(command)
    return commands


def quote_command(executable: Path) -> str:
    """Quoted, forward-slash path that both POSIX shells and cmd.exe accept."""
    return f'"{executable.as_posix()}"'


def register_app_hooks(hook_cmd: str, app_marker: str) -> str:
    """Point Claude Code's hooks at the bundled hook command.

    ``hook_cmd`` is everything before the event type, e.g.
    ``"/Applications/Claude Stalker.app/Contents/MacOS/Claude Stalker" hook``.

    * If the CLI hook (``claude-office-hook``) is already registered, leave
      settings alone — registering both would send every event twice.
    * Entries from an older copy of the app (``app_marker`` in the command but
      a different command, e.g. the app was moved) are replaced.

    Returns "cli" (left as is), "unchanged" or "registered".
    """
    mh = _manage_hooks()
    settings_path: Path = mh.get_settings_path()
    settings: dict[str, Any] = mh.load_settings(settings_path)
    hooks: dict[str, list[Any]] = settings.get("hooks", {})

    if any(CLI_HOOK_MARKER in cmd for entries in hooks.values() for cmd in _commands(entries)):
        return "cli"

    changed = False
    for hook_type in mh.HOOK_TYPES:
        wanted = mh.create_hook_config(hook_cmd, hook_type)
        # If the app is deleted later, a missing executable must not make
        # Claude Code report a failing hook on every tool call.
        wanted["hooks"][0]["command"] += MISSING_APP_GUARD
        current = hooks.get(hook_type, [])
        kept = [
            e
            for e in current
            if not any(app_marker in c and not c.startswith(hook_cmd) for c in _commands([e]))
        ]
        if not any(mh.is_same_hook(e, wanted) for e in kept):
            kept.append(wanted)
        if kept != current:
            hooks[hook_type] = kept
            changed = True

    if not changed:
        return "unchanged"
    settings["hooks"] = hooks
    mh.save_settings(settings_path, settings)
    return "registered"


def unregister_app_hooks(app_marker: str) -> int:
    """Remove every hook entry whose command mentions ``app_marker``. Returns count."""
    mh = _manage_hooks()
    settings_path: Path = mh.get_settings_path()
    settings: dict[str, Any] = mh.load_settings(settings_path)
    hooks: dict[str, list[Any]] = settings.get("hooks", {})
    removed = 0
    for hook_type in list(hooks):
        kept = [e for e in hooks[hook_type] if not any(app_marker in c for c in _commands([e]))]
        removed += len(hooks[hook_type]) - len(kept)
        if kept:
            hooks[hook_type] = kept
        else:
            del hooks[hook_type]
    if removed:
        settings["hooks"] = hooks
        mh.save_settings(settings_path, settings)
    return removed
