"""Run the Claude Code hook from a bundled executable.

Claude Code calls ``<exe> <event_type>`` (Windows console hook) or
``"Claude Stalker" hook <event_type>`` (macOS app) with the event JSON on
stdin — the same contract as the ``claude-office-hook`` uv tool.
"""

import sys


def run_hook(argv: list[str]) -> None:
    """Never raises and always exits 0 — a hook must not block Claude Code."""
    sys.argv = argv
    # Imported here: the module swaps out stdout/stderr as soon as it loads.
    import claude_office_hooks.main as hook

    try:
        hook.main()
    except SystemExit:
        pass
    except Exception as exc:
        hook.log_error(exc, "Error in bundled hook")
    sys.exit(0)


if __name__ == "__main__":
    run_hook(sys.argv)
