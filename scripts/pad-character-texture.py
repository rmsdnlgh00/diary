"""Pad the character texture so UV seams don't show thin lines when zoomed in.

The texture's UV islands sit on a bare background: bilinear filtering and mipmaps blend
that background into the edges, which shows as white scratches on the hair, face and
clothes up close. This script grows every island outwards (each empty texel takes the
average of its filled neighbours, 24 rounds) and writes the result back into
character-walk-light.glb, plus assets/portraits/character-padded.png for the face atlas.

The island coverage (assets/portraits/uv-coverage.npy, image rows top-down) is rasterised
from char1.001's UVs in Blender. Running the script again is harmless.

Run: uv run --no-project --with pillow --with numpy python scripts/pad-character-texture.py
"""
import io
import json
import struct
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GLB = ROOT / "public/assets/characters/male/character-walk-light.glb"
COVERAGE = ROOT / "assets/portraits/uv-coverage.npy"
PADDED = ROOT / "assets/portraits/character-padded.png"
ROUNDS = 24


def read_glb(path):
    data = path.read_bytes()
    json_len = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20:20 + json_len])
    bin_start = 20 + json_len
    bin_len = struct.unpack_from("<I", data, bin_start)[0]
    return doc, bytearray(data[bin_start + 8:bin_start + 8 + bin_len])


def write_glb(path, doc, binary):
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    binary = bytes(binary) + b"\0" * (-len(binary) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    path.write_bytes(struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(js), 0x4E4F534A) + js
                     + struct.pack("<II", len(binary), 0x004E4942) + binary)


def pad(rgb: np.ndarray, filled: np.ndarray) -> np.ndarray:
    rgb = rgb.astype(np.float32)
    filled = filled.copy()
    for _ in range(ROUNDS):
        total = np.zeros_like(rgb)
        count = np.zeros(filled.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            f = np.roll(filled, (dy, dx), (0, 1))
            total += np.roll(rgb, (dy, dx), (0, 1)) * f[..., None]
            count += f
        grow = ~filled & (count > 0)
        rgb[grow] = total[grow] / count[grow][:, None]
        filled |= grow
    return rgb.clip(0, 255).astype(np.uint8)


def main():
    doc, binary = read_glb(GLB)
    image = doc["images"][0]
    views = doc["bufferViews"]
    view = views[image["bufferView"]]
    start = view.get("byteOffset", 0)
    texture = Image.open(io.BytesIO(binary[start:start + view["byteLength"]])).convert("RGB")
    coverage = np.load(COVERAGE)
    padded = pad(np.array(texture), coverage)
    Image.fromarray(padded).save(PADDED)
    out = io.BytesIO()
    Image.fromarray(padded).save(out, "JPEG", quality=92, subsampling=0)
    new_image = out.getvalue()

    # Rebuild the binary chunk with the new image; other views keep their bytes.
    chunks, offset = [], 0
    for index, v in sorted(enumerate(views), key=lambda iv: iv[1].get("byteOffset", 0)):
        s = v.get("byteOffset", 0)
        data = new_image if index == image["bufferView"] else bytes(binary[s:s + v["byteLength"]])
        offset += -offset % 4
        chunks.append((offset, data))
        v["byteOffset"] = offset
        v["byteLength"] = len(data)
        offset += len(data)
    rebuilt = bytearray(offset)
    for o, data in chunks:
        rebuilt[o:o + len(data)] = data
    doc["buffers"][0]["byteLength"] = len(rebuilt)
    write_glb(GLB, doc, rebuilt)
    print(f"padded texture → {GLB.name} ({GLB.stat().st_size // 1024} KB), {PADDED.name}")


if __name__ == "__main__":
    main()
