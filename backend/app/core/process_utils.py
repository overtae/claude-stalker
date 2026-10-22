"""Subprocess helpers shared by every place the backend shells out."""

import subprocess
import sys

# The Windows desktop app is a windowed (no-console) exe, so every console
# child (git, bd, claude, clip) would otherwise pop up its own terminal window.
# Pass as ``creationflags=`` to subprocess/asyncio spawns; 0 is the default.
if sys.platform == "win32":
    NO_WINDOW_FLAGS: int = subprocess.CREATE_NO_WINDOW
else:
    NO_WINDOW_FLAGS: int = 0
