"""Claude Stalker desktop app (macOS menu bar / Windows tray).

Double-click → registers the bundled hook with Claude Code, starts the
server in the background, opens the office in the browser and sits in the
menu bar / tray until you quit.

    "Claude Stalker" --uninstall-hooks   # used by the Windows uninstaller
"""

from __future__ import annotations

import subprocess
import sys
import threading
import webbrowser
from pathlib import Path
from typing import TYPE_CHECKING

from app.launcher.hook_setup import (
    CONFIG_FILE,
    ensure_config,
    quote_command,
    register_app_hooks,
    unregister_app_hooks,
)
from app.launcher.server import (
    DATA_DIR,
    DEFAULT_PORT,
    HOST,
    configure_backend_env,
    events_url,
    find_free_port,
    is_stalker_ui,
    port_in_use,
    wait_until_healthy,
)

if TYPE_CHECKING:
    import pystray

APP_NAME = "Claude Stalker"
#: Every hook command we register contains this (app path or hook folder).
APP_MARKER = APP_NAME
HOOK_EXE = "claude-stalker-hook.exe"
IS_WINDOWS = sys.platform == "win32"
TRAY_ICON_PX = 64

RESTART_HINT = (
    "Claude Code에 연결했어요. Claude Code를 한 번 재시작해 주세요. / "
    "Hooked into Claude Code — restart Claude Code once."
)


def hook_command() -> str | None:
    """What Claude Code should run, minus the event type.

    macOS: the app binary itself in hook mode (Unix stdio works for .app
    executables). Windows: a separate console exe, since a windowed exe gets
    no stdin.
    """
    exe = Path(sys.executable).resolve()
    if not IS_WINDOWS:
        return f"{quote_command(exe)} hook"
    console = exe.parent / "hook" / HOOK_EXE
    return quote_command(console) if console.is_file() else None


def _redirect_output() -> None:
    """Windowed builds have no console; keep logs instead of crashing on print."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    log = open(DATA_DIR / "app.log", "a", encoding="utf-8", buffering=1)  # noqa: SIM115
    sys.stdout = log
    sys.stderr = log


def _notify(icon: pystray.Icon, message: str) -> None:
    if sys.platform == "darwin":
        script = f'display notification "{message}" with title "{APP_NAME}"'
        subprocess.run(["osascript", "-e", script], check=False)
    else:
        icon.notify(message, APP_NAME)


def _choose_port() -> int | None:
    """Preferred port, or None when another Stalker already serves it."""
    if not port_in_use(DEFAULT_PORT):
        return DEFAULT_PORT
    if is_stalker_ui(DEFAULT_PORT):
        return None
    return find_free_port(DEFAULT_PORT + 1)


def run() -> None:
    _redirect_output()

    port = _choose_port()
    if port is None:
        webbrowser.open(f"http://{HOST}:{DEFAULT_PORT}")
        return

    hook_cmd = hook_command()
    hook_status = register_app_hooks(hook_cmd, APP_MARKER) if hook_cmd else "missing"
    # Only steer the hooks at our port when they're ours — a developer's own
    # `claude-office-hook` keeps talking to their dev server.
    ensure_config(CONFIG_FILE, events_url(port) if hook_status != "cli" else None)
    print(f"[stalker] port={port} hooks={hook_status}")

    configure_backend_env(port)
    # Heavy imports only on the app path — hook mode must start fast.
    import pystray
    import uvicorn
    from stalker_icon import draw_icon

    from app.config import get_settings
    from app.main import app

    server = uvicorn.Server(uvicorn.Config(app, host=HOST, port=port, log_level="warning"))
    threading.Thread(target=server.run, daemon=True).start()
    launch_url = f"http://{HOST}:{port}/?token={get_settings().effective_api_key}"

    def open_office(_icon: pystray.Icon | None = None, _item: object = None) -> None:
        webbrowser.open(launch_url)

    def disconnect(icon: pystray.Icon, _item: object) -> None:
        removed = unregister_app_hooks(APP_MARKER)
        _notify(icon, f"Claude Code 연결 해제 ({removed}) / Disconnected from Claude Code")

    def quit_app(icon: pystray.Icon, _item: object) -> None:
        server.should_exit = True
        icon.stop()

    def on_ready(icon: pystray.Icon) -> None:
        icon.visible = True
        if wait_until_healthy(port):
            open_office()
        if hook_status == "registered":
            _notify(icon, RESTART_HINT)

    menu = pystray.Menu(
        pystray.MenuItem("사무실 열기 · Open office", open_office, default=True),
        pystray.MenuItem("Claude Code 연결 해제 · Disconnect", disconnect),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("종료 · Quit", quit_app),
    )
    pystray.Icon(APP_NAME, draw_icon(TRAY_ICON_PX), APP_NAME, menu).run(setup=on_ready)


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "hook":
        from stalker_hook import run_hook

        run_hook([sys.argv[0], *sys.argv[2:]])
    if "--uninstall-hooks" in sys.argv:
        unregister_app_hooks(APP_MARKER)
        return
    run()


if __name__ == "__main__":
    main()
