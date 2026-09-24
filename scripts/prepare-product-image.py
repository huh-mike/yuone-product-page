#!/usr/bin/env python3
"""
Prepare a YU ONE product render for the dark hero.

    python3 scripts/prepare-product-image.py <input.png|jpg> [output.png]

Removes the studio-white backdrop by flood-filling inward from the image
border, so the *white top shell of the product* is preserved while the
surrounding white becomes transparent. Then trims empty margins.

Default output: public/yu-one.png
"""
import sys, os
from collections import deque
from PIL import Image

TOL = 14  # how far from pure white still counts as backdrop


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join("public", "yu-one.png")

    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()

    def is_backdrop(x, y):
        r, g, b, a = px[x, y]
        return a == 0 or (r >= 255 - TOL and g >= 255 - TOL and b >= 255 - TOL)

    # Flood fill from every border pixel that is already backdrop-coloured.
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_backdrop(x, y) and not seen[y * w + x]:
                seen[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_backdrop(x, y) and not seen[y * w + x]:
                seen[y * w + x] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        px[x, y] = (255, 255, 255, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_backdrop(nx, ny):
                seen[ny * w + nx] = 1
                q.append((nx, ny))

    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)

    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    im.save(dst, "PNG", optimize=True)
    print(f"wrote {dst}  {im.size[0]}x{im.size[1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
