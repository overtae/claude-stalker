.PHONY: dev start test lint fmt typecheck checkall

# Keep the ?token= stable across --reload restarts (separate from the app's).
DEV_LAUNCH_TOKEN_FILE ?= $(HOME)/.claude-stalker/dev-launch-token

dev:
	STALKER_LAUNCH_TOKEN_FILE=$(DEV_LAUNCH_TOKEN_FILE) uv run uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000

start:
	uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

test:
	uv run pytest

lint:
	uv run ruff check .

fmt:
	uv run ruff format .

typecheck:
	# Respect pyrightconfig.json include (app/ only). `pyright .` also typechecks
	# packaging/, which pulls pystray/Pillow/hooks only at desktop build time.
	uv run pyright

checkall: fmt lint typecheck test
