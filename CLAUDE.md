# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Claude Office Visualizer transforms Claude Code operations into a real-time pixel art office simulation. A "boss" character (main Claude agent) manages work, spawns "employee" agents (subagents), and orchestrates tasks visually.

See [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) for system architecture and component details.

## Commands

```bash
# Root
make install       # Install all dependencies
make dev-tmux      # Run in tmux (recommended) - backend :8000, frontend :3000
make dev-tmux-kill # Kill tmux session
make checkall      # Lint, typecheck, test all components
make simulate      # Run event simulation

# Component-specific (run from backend/ or frontend/)
make dev           # Start dev server
make checkall      # Check single component (faster)
uv run pytest tests/test_file.py::test_name  # Single backend test

# Hooks (cd hooks/)
./install.sh       # Install hooks
./uninstall.sh     # Remove hooks

# OpenCode Plugin (cd opencode-plugin/)
bun run build      # Build plugin
bun run typecheck  # Type check
```

## Development Workflow

**Preferred:** Use `make dev-tmux` - creates separate windows for backend/frontend.
- Read logs: `tmux capture-pane -t claude-office:backend -p`
- Switch windows: `Ctrl-b n` / `Ctrl-b p`
- Hot reload enabled on both servers

**Debugging:** Hook logs at `~/.claude/claude-office-hooks.log` (enable with `CLAUDE_OFFICE_DEBUG=1`)

## Project Skills

- **/office-sprite** - Generate office furniture sprites
- **/character-sprite** - Generate character sprite sheets
- **/desk-accessory** - Generate tintable desk items

See `.claude/skills/*/SKILL.md` for details.

## Workflow Guidelines

**Commit after every batch of work:** Always commit after completing each logical unit.

**Use subagents for validation:** Spawn a Bash subagent to run `make checkall` and commit:
```
"Run 'make checkall' from the project root. If successful, commit with message: '<message>'"
```

## Version Management

**Single source of truth: the root `VERSION` file.** Never hand-edit versions elsewhere.

```bash
make bump-version VERSION=x.y.z   # write VERSION and sync every location
make version-sync                 # after editing VERSION by hand
make version-check                # CI: fail if any location drifts from VERSION
```

| Location | How it gets the version |
|----------|-------------------------|
| `pyproject.toml`, `backend/pyproject.toml`, `hooks/pyproject.toml` | synced by `scripts/bump_version.py` |
| `frontend/package.json`, `opencode-plugin/package.json` | synced by `scripts/bump_version.py` |
| Frontend header badge | `next.config.ts` reads `frontend/package.json` → `NEXT_PUBLIC_APP_VERSION` |
| Backend `VERSION`, hooks `__version__` | `importlib.metadata` (installed package) |
| Desktop installers | `scripts/build_desktop.py` reads `VERSION` |
