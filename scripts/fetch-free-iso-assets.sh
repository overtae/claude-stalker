#!/usr/bin/env bash
# Re-download Kenney CC0 packs and refresh curated props in frontend/public/assets/free-iso/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/frontend/public/assets/free-iso"
TMP="${TMPDIR:-/tmp}/claude-stalker-iso-$$"
mkdir -p "$DEST" "$TMP"

curl -fsSL -o "$TMP/library.zip" \
  "https://opengameart.org/sites/default/files/Library%20Pack%20%282.1%29.zip"
unzip -q -o "$TMP/library.zip" -d "$TMP/library"

curl -fsSL -o "$TMP/space.zip" \
  "https://kenney.nl/media/pages/assets/space-kit/20874c75ac-1677698978/kenney_space-kit.zip"
unzip -q -o "$TMP/space.zip" -d "$TMP/space"

cp "$TMP/library/License.txt" "$DEST/LICENSE-kenney-library.txt"
cp "$TMP/space/License.txt" "$DEST/LICENSE-kenney-space-kit.txt"

cp "$TMP/library/Isometric/bookcaseBooksLadder_S.png" "$DEST/archive-bookcase.png"
cp "$TMP/library/Isometric/longTableChairs_S.png" "$DEST/meeting-table.png"
cp "$TMP/library/Isometric/floorCarpet_S.png" "$DEST/floor-accent.png"
cp "$TMP/space/Isometric/desk_computerScreen_SE.png" "$DEST/dev-desk.png"
cp "$TMP/space/Isometric/machine_generatorLarge_SE.png" "$DEST/server-rack.png"
cp "$TMP/space/Isometric/corridor_cornerRoundWindow_SE.png" "$DEST/research-terminal.png"
cp "$TMP/space/Isometric/desk_chairArms_SE.png" "$DEST/user-desk.png"
cp "$TMP/space/Isometric/corridor_cross_SE.png" "$DEST/elevator-corridor.png"

rm -rf "$TMP"
echo "Updated $DEST"
