"""Launch token that survives backend restarts.

The auto-generated API key normally lives only as long as the process, so a
``uvicorn --reload`` or an app relaunch silently invalidates the ``?token=``
the browser holds. Launchers opt in via ``STALKER_LAUNCH_TOKEN_FILE``; the file
is created 0600 so it stays inside the same trust boundary as the console.
"""

import os
import re
import secrets
from pathlib import Path

TOKEN_BYTES = 32
_TOKEN_RE = re.compile(rf"[0-9a-f]{{{TOKEN_BYTES * 2}}}")
_FILE_MODE = 0o600


def read_token(path: Path) -> str | None:
    """Return the stored token, or None when missing or malformed."""
    try:
        token = path.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return token if _TOKEN_RE.fullmatch(token) else None


def load_or_create_token(path: Path) -> str:
    """Reuse the token stored at ``path``, creating (or repairing) it if needed."""
    existing = read_token(path)
    if existing:
        return existing

    token = secrets.token_hex(TOKEN_BYTES)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, _FILE_MODE)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(token)
    os.replace(tmp, path)
    # Two processes racing on first launch: whoever replaced last wins, and
    # both must agree on that value.
    return read_token(path) or token
