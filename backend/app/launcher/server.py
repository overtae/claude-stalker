"""Serving helpers shared by the ``claude-stalker`` CLI and the desktop app."""

from __future__ import annotations

import json
import os
import socket
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_PORT = 8000
HOST = "127.0.0.1"
#: Persistent home for the database and logs — package caches can be wiped.
DATA_DIR = Path.home() / ".claude-stalker"
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
STARTUP_TIMEOUT_S = 30.0
#: How far past the preferred port to look for a free one.
PORT_SEARCH_SPAN = 20


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex((HOST, port)) == 0


def is_stalker_ui(port: int) -> bool:
    """True when something on the port already serves the Stalker UI."""
    try:
        with urllib.request.urlopen(f"http://{HOST}:{port}/", timeout=2) as res:
            return res.status == 200 and b"<html" in res.read(2048).lower()
    except (urllib.error.URLError, OSError):
        return False


def find_free_port(preferred: int) -> int:
    for port in range(preferred, preferred + PORT_SEARCH_SPAN):
        if not port_in_use(port):
            return port
    raise RuntimeError(f"no free port in {preferred}..{preferred + PORT_SEARCH_SPAN - 1}")


def wait_until_healthy(port: int, timeout_s: float = STARTUP_TIMEOUT_S) -> bool:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(f"http://{HOST}:{port}/health", timeout=1):
                return True
        except (urllib.error.URLError, OSError):
            time.sleep(0.3)
    return False


def configure_backend_env(port: int) -> None:
    """Must run before ``app.main`` is imported — settings are read at import."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    # Don't inherit a DATABASE_URL meant for some other project in the shell.
    os.environ["DATABASE_URL"] = os.environ.get(
        "STALKER_DATABASE_URL", f"sqlite+aiosqlite:///{DATA_DIR / 'visualizer.db'}"
    )
    os.environ["SERVE_STATIC"] = "1"
    os.environ["STALKER_STATIC_DIR"] = str(STATIC_DIR)
    origins = [f"http://localhost:{port}", f"http://{HOST}:{port}"]
    os.environ["BACKEND_CORS_ORIGINS"] = json.dumps(origins)
    os.environ.setdefault("LOG_RICH_TRACEBACKS", "0")
    os.environ.setdefault("STALKER_LOG_LEVEL", "WARNING")


def events_url(port: int) -> str:
    return f"http://localhost:{port}/api/v1/events"
