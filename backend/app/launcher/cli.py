"""``claude-stalker`` — one command that sets up hooks, serves the UI and opens it.

uvx claude-stalker            # first run installs hooks, then opens the office
uvx claude-stalker --port 8123
uvx claude-stalker --no-browser
"""

from __future__ import annotations

import argparse
import threading
import webbrowser

from app.launcher.hook_setup import (
    CONFIG_FILE,
    ensure_config,
    ensure_hook_tool,
    register_hooks,
)
from app.launcher.server import (
    DEFAULT_PORT,
    HOST,
    STATIC_DIR,
    configure_backend_env,
    events_url,
    is_stalker_ui,
    port_in_use,
    wait_until_healthy,
)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="claude-stalker",
        description="Cozy isometric office that shows what Claude Code is doing.",
    )
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="port (default 8000)")
    parser.add_argument("--no-browser", action="store_true", help="don't open a browser")
    parser.add_argument(
        "--skip-hooks", action="store_true", help="don't install/register Claude Code hooks"
    )
    parser.add_argument(
        "--reinstall-hooks", action="store_true", help="reinstall the hook tool from this build"
    )
    return parser.parse_args()


def _setup_hooks(port: int, reinstall: bool) -> None:
    if ensure_config(CONFIG_FILE, events_url(port)):
        print(f"  ✓ wrote {CONFIG_FILE}")
    result = ensure_hook_tool(force=reinstall)
    print(f"  {'✓' if result.installed_tool else '·'} {result.message}")
    register_hooks()
    print("  ✓ hooks registered in ~/.claude/settings.json")
    if result.installed_tool:
        print("  ! restart Claude Code once so it picks up the new hooks")


def _open_when_ready(url: str, port: int) -> None:
    if wait_until_healthy(port):
        webbrowser.open(url)


def main() -> None:
    args = _parse_args()
    url = f"http://{HOST}:{args.port}"

    if port_in_use(args.port):
        if is_stalker_ui(args.port):
            print(f"Claude Stalker is already running at {url}")
            if not args.no_browser:
                webbrowser.open(url)
            return
        raise SystemExit(f"Port {args.port} is busy. Try: claude-stalker --port {args.port + 1}")

    if not STATIC_DIR.is_dir():
        raise SystemExit("This build has no UI bundled. Build it with `make dist`.")

    print("Claude Stalker")
    if not args.skip_hooks:
        _setup_hooks(args.port, args.reinstall_hooks)

    configure_backend_env(args.port)

    # Imported late on purpose: app settings read the env configured above.
    import uvicorn

    from app.config import get_settings
    from app.main import app

    token = get_settings().effective_api_key
    launch_url = f"{url}/?token={token}"
    print(f"\n  → {launch_url}\n  (Ctrl+C to stop)\n")
    if not args.no_browser:
        threading.Thread(target=_open_when_ready, args=(launch_url, args.port), daemon=True).start()

    uvicorn.run(app, host=HOST, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
