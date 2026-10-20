"""App / tray icon, drawn in code: a cosy little isometric office block."""

from __future__ import annotations

from PIL import Image, ImageDraw

ORANGE = (217, 119, 87, 255)
TOP = (255, 247, 240, 255)
LEFT = (255, 255, 255, 255)
RIGHT = (253, 223, 208, 255)
WINDOW = (227, 140, 105, 255)


def draw_icon(size: int) -> Image.Image:
    """Square RGBA icon (app icon and tray icon)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 100

    d.rounded_rectangle((4 * s, 4 * s, 96 * s, 96 * s), radius=22 * s, fill=ORANGE)

    cx = 50 * s
    half = 26 * s
    top_y, mid_y, low_y, base_y = 20 * s, 34 * s, 48 * s, 80 * s
    d.polygon([(cx, top_y), (cx + half, mid_y), (cx, low_y), (cx - half, mid_y)], fill=TOP)
    d.polygon(
        [(cx - half, mid_y), (cx, low_y), (cx, base_y), (cx - half, base_y - 14 * s)], fill=LEFT
    )
    d.polygon(
        [(cx, low_y), (cx + half, mid_y), (cx + half, base_y - 14 * s), (cx, base_y)], fill=RIGHT
    )

    # two rows of windows on each face
    for row in (0, 1):
        for i in (0, 1):
            x0 = cx - half + (5 + i * 11) * s
            y0 = mid_y + (8 + row * 13) * s + i * 5.5 * s
            w = 7 * s
            d.polygon(
                [(x0, y0), (x0 + w, y0 + 3.5 * s), (x0 + w, y0 + 10 * s), (x0, y0 + 6.5 * s)],
                fill=WINDOW,
            )
            x1 = cx + (6 + i * 11) * s
            y1 = low_y + (5 + row * 13) * s - i * 5.5 * s
            d.polygon(
                [(x1, y1), (x1 + w, y1 - 3.5 * s), (x1 + w, y1 + 3 * s), (x1, y1 + 6.5 * s)],
                fill=WINDOW,
            )
    return img
