"""Pack the baked mood faces into one small atlas for the game.

Reads assets/portraits/baked/<emotion>.png (the full character texture with that mood's face,
from scripts/bake-face-textures.py) and mask.png (the texels that change). The texture is cut
into 32 px tiles; every tile that holds a changed texel is copied, per mood, into
public/assets/characters/male/faces.webp (one row band per mood) and listed in
faces.json. The game copies the tiles over the character texture to make each mood's face.

Run: uv run --no-project --with pillow --with numpy python scripts/pack-face-atlas.py
"""
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BAKED = ROOT / "assets/portraits/baked"
OUT = ROOT / "public/assets/characters/male"
EMOTIONS = ("normal", "happy", "joyful", "sad", "angry", "annoyed")
TILE = 32

mask = np.array(Image.open(BAKED / "mask.png").convert("L")) > 127
size = mask.shape[0]
grid = mask.reshape(size // TILE, TILE, size // TILE, TILE).any(axis=(1, 3))
tiles = [(int(x) * TILE, int(y) * TILE) for y, x in np.argwhere(grid)]  # image px, top-left origin
cols = math.ceil(math.sqrt(len(tiles)))
rows = math.ceil(len(tiles) / cols)
atlas = Image.new("RGB", (cols * TILE, rows * TILE * len(EMOTIONS)))
for band, emotion in enumerate(EMOTIONS):
    face = Image.open(BAKED / f"{emotion}.png").convert("RGB")
    for i, (x, y) in enumerate(tiles):
        tile = face.crop((x, y, x + TILE, y + TILE))
        atlas.paste(tile, ((i % cols) * TILE, (band * rows + i // cols) * TILE))
# Lossy but high quality: tiles are copied 1:1, so only colour fidelity matters.
atlas.save(OUT / "faces.webp", quality=92, method=6)
(OUT / "faces.json").write_text(json.dumps({
    "textureSize": size, "tile": TILE, "columns": cols, "rows": rows,
    "emotions": [e.upper() for e in EMOTIONS], "tiles": tiles,
}))
print(f"{len(tiles)} tiles × {len(EMOTIONS)} moods → faces.webp {atlas.size}, "
      f"{(OUT / 'faces.webp').stat().st_size // 1024} KB")
