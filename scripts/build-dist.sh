#!/usr/bin/env bash
# Build the shareable `claude-stalker` wheel: UI + backend + hook installer.
#
#   ./scripts/build-dist.sh        → dist/claude_stalker-<version>-py3-none-any.whl
#
# Recipients run it with:  uvx --from <wheel path or URL> claude-stalker
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
BUNDLED="$BACKEND/app/_bundled"
STATIC="$BACKEND/app/static"

echo "▸ building frontend (static export)"
(cd "$ROOT/frontend" && bun run build)

echo "▸ copying UI into the backend package"
rm -rf "$STATIC"
cp -R "$ROOT/frontend/out" "$STATIC"

echo "▸ bundling the Claude Code hook installer"
rm -rf "$BUNDLED"
mkdir -p "$BUNDLED"
uv build --wheel "$ROOT/hooks" --out-dir "$BUNDLED"
cp "$ROOT/hooks/manage_hooks.py" "$BUNDLED/"

echo "▸ building the claude-stalker wheel"
mkdir -p "$ROOT/dist"
uv build --wheel "$BACKEND" --out-dir "$ROOT/dist"

WHEEL="$(ls -t "$ROOT"/dist/claude_stalker-*.whl | head -1)"
echo ""
echo "✓ $WHEEL"
echo "  try it:  uvx --from \"$WHEEL\" claude-stalker"
