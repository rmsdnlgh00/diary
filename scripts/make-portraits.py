"""Make the six mood portraits of the 3D character from one Blender render.

assets/portraits/base.png is the village character's head rendered in Blender (idle pose,
front, 1024 px, transparent; see docs/blender-village.md). Its painted face always smiles,
so this script paints the eyes, brows and mouth over with the surrounding skin and draws
each mood's face in the same style (brown eyes, coral mouth, soft blush), then writes
public/assets/character/portraits/<emotion>.webp at 512 px.

Run: uv run --no-project --with pillow --with numpy python scripts/make-portraits.py

With --flat the same faces are drawn on assets/portraits/base-flat.png (the head rendered
with lighting off, i.e. plain texture colours) into assets/portraits/flat/<emotion>.png at
full size; scripts/bake-face-textures.py projects those onto the character's texture.
"""
from pathlib import Path
import math
import sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "assets/portraits/base.png"
OUT = ROOT / "public/assets/character/portraits"
SS = 4  # draw at 4× and scale down for smooth edges

# Measured on base.png (1024 px): centres and sizes of the painted features.
EYES = [(354, 656, 52, 86), (576, 656, 60, 87)]          # x, y, w, h
BROWS = [(343, 570, 62, 22), (574, 569, 76, 22)]
MOUTH = (463, 776, 78, 16)
EYE = (112, 66, 48)
EYE_SHINE = (255, 255, 255)
LINE = (226, 112, 104)
MOUTH_IN = (196, 78, 82)
TONGUE = (255, 150, 150)
BLUSH = (255, 160, 160)
TEAR = (150, 205, 245)
SKIN = (255, 255, 226)  # replaced by the measured skin colour in main()
HAIR = (215, 140, 110)  # replaced by the measured hair colour in main()
LID = [SKIN, SKIN]  # skin just above each eye, for the eyelid patches


def is_skin(c) -> bool:
    return float(np.abs(np.asarray(c[:3], float) - SKIN).sum()) < 60


def erase(img: np.ndarray, boxes, keep_hair=(), margin=7):
    """Fill ellipses around the painted features with skin, interpolating along each row.

    Around the brows (`keep_hair`) hair-coloured pixels are kept, so the bangs that overlap
    them stay untouched.
    """
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    ellipse = lambda x, y, bw, bh: ((xx - x) / (bw / 2 + margin)) ** 2 + ((yy - y) / (bh / 2 + margin)) ** 2 <= 1
    mask = np.zeros((h, w), bool)
    for box in boxes:
        mask |= ellipse(*box)
    hair_d = np.abs(img[..., :3] - np.array(HAIR, float)).sum(-1)
    for box in keep_hair:  # brows sit under the bangs: leave hair pixels alone there
        mask |= ellipse(*box) & (hair_d > 45)
    skin = np.array(SKIN, float)
    for y in np.unique(np.nonzero(mask)[0]):
        row = mask[y]
        x = 0
        while x < w:
            if not row[x]:
                x += 1
                continue
            start = x
            while x < w and row[x]:
                x += 1
            left, right = img[y, max(start - 2, 0), :3], img[y, min(x + 1, w - 1), :3]
            left = left if is_skin(left) else (right if is_skin(right) else skin)
            right = right if is_skin(right) else left
            t = np.linspace(0, 1, x - start)[:, None]
            img[y, start:x, :3] = left * (1 - t) + right * t
    return img


class Face:
    """Drawing helpers in base-image pixels on a 4× transparent overlay."""

    def __init__(self, size):
        self.layer = Image.new("RGBA", (size[0] * SS, size[1] * SS), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.layer)

    def s(self, *v):
        return [c * SS for c in v]

    def ellipse(self, x, y, w, h, fill, alpha=255):
        self.d.ellipse(self.s(x - w / 2, y - h / 2, x + w / 2, y + h / 2), fill=(*fill, alpha))

    def arc(self, x, y, w, h, start, end, fill, width):
        """Thick arc with round caps (angles in degrees, 0 = right, clockwise)."""
        pts = []
        for i in range(41):
            a = math.radians(start + (end - start) * i / 40)
            pts.append((x + w / 2 * math.cos(a), y + h / 2 * math.sin(a)))
        self.line(pts, fill, width)

    def line(self, pts, fill, width):
        flat = [c * SS for p in pts for c in p]
        self.d.line(flat, fill=(*fill, 255), width=int(width * SS), joint="curve")
        for p in (pts[0], pts[-1]):
            r = width / 2
            self.ellipse(p[0], p[1], r * 2, r * 2, fill)

    def polygon(self, pts, fill, alpha=255):
        self.d.polygon([c * SS for p in pts for c in p], fill=(*fill, alpha))

    def eye(self, x, y, w, h, shine=True):
        self.ellipse(x, y, w, h, EYE)
        if shine:
            self.ellipse(x - w * 0.18, y - h * 0.22, w * 0.32, h * 0.22, EYE_SHINE)

    def tear(self, x, y, size):
        self.polygon([(x, y - size), (x + size * 0.55, y + size * 0.15), (x - size * 0.55, y + size * 0.15)], TEAR)
        self.ellipse(x, y + size * 0.3, size * 1.15, size * 1.1, TEAR)

    def star(self, x, y, r, fill):
        pts = []
        for i in range(8):
            a = math.radians(i * 45 - 90)
            rr = r if i % 2 == 0 else r * 0.32
            pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
        self.polygon(pts, fill)


def brows_default(f: Face):
    """The painted brows, redrawn (used when they had to be erased)."""
    for x, y, w, _ in BROWS:
        f.arc(x, y + 8, w, 18, 200, 340, (176, 104, 78), 9)


def draw(emotion: str, f: Face):
    (lx, ly, lw, lh), (rx, ry, rw, rh) = EYES
    mx, my, mw, _ = MOUTH
    if emotion == "NORMAL":
        brows_default(f)
        f.eye(lx, ly, lw, lh)
        f.eye(rx, ry, rw, rh)
        f.line([(mx - 30, my), (mx, my + 5), (mx + 30, my)], LINE, 7)
    elif emotion == "HAPPY":
        brows_default(f)
        for x, y, w in ((lx, ly, lw), (rx, ry, rw)):
            f.arc(x, y + 14, w * 1.15, 44, 200, 340, EYE, 11)       # ∩ smiling eyes
        f.polygon([(mx - 42, my - 6), (mx + 42, my - 6), (mx + 28, my + 26), (mx, my + 36), (mx - 28, my + 26)], MOUTH_IN)
        f.ellipse(mx, my + 24, 42, 20, TONGUE)
        f.line([(mx - 42, my - 6), (mx + 42, my - 6)], LINE, 5)
    elif emotion == "JOYFUL":
        brows_default(f)
        for x, y, w, sign in ((lx, ly, lw, 1), (rx, ry, rw, -1)):   # > <
            f.line([(x - sign * w * 0.45, y - 22), (x + sign * w * 0.35, y), (x - sign * w * 0.45, y + 22)], EYE, 11)
        f.ellipse(mx, my + 10, 82, 62, MOUTH_IN)
        f.polygon([(mx - 41, my + 10), (mx + 41, my + 10), (mx + 41, my - 30), (mx - 41, my - 30)], (0, 0, 0), 0)
        f.ellipse(mx, my + 28, 46, 22, TONGUE)
        for x, y in ((lx - 10, ly + 66), (rx + 10, ly + 66)):
            f.ellipse(x, y, 96, 48, BLUSH, 110)
        f.star(250, 470, 26, (255, 214, 90))
        f.star(790, 520, 20, (255, 214, 90))
        f.star(820, 430, 12, (255, 230, 150))
    elif emotion == "SAD":
        for (x, y, w, _), sign in zip(BROWS, (1, -1)):              # inner ends up: / \
            f.line([(x - sign * w * 0.45, y + 14), (x + sign * w * 0.45, y - 6)], (176, 104, 78), 9)
        f.eye(lx, ly + 6, lw * 0.92, lh * 0.82)
        f.eye(rx, ry + 6, rw * 0.92, rh * 0.82)
        f.tear(rx + 18, ry + 70, 18)
        f.arc(mx, my + 18, 64, 32, 200, 340, LINE, 7)               # downturned mouth
    elif emotion == "ANGRY":
        for (x, y, w, _), sign in zip(BROWS, (1, -1)):              # inner ends down: \ /
            f.line([(x - sign * w * 0.5, y - 8), (x + sign * w * 0.5, y + 16)], (150, 80, 60), 11)
        for (x, y, w, h), inner, lid in zip(EYES, (1, -1), LID):
            f.eye(x, y + 4, w, h * 0.9, shine=False)
            # Glaring lid: skin over the top of the eye, lower toward the nose (`inner` side).
            outer_y, inner_y = y - h * 0.32, y - h * 0.02
            left_y, right_y = (outer_y, inner_y) if inner > 0 else (inner_y, outer_y)
            f.polygon([(x - w * 0.62, y - h * 0.56), (x + w * 0.62, y - h * 0.56), (x + w * 0.62, right_y), (x - w * 0.62, left_y)], lid)
            f.line([(x - w * 0.6, left_y + (right_y - left_y) * 0.2), (x + w * 0.6, left_y + (right_y - left_y) * 0.8)], EYE, 7)
        f.arc(mx, my + 20, 78, 34, 200, 340, LINE, 8)
        cx, cy = 690, 470                                           # anger mark
        for a in (45, 135, 225, 315):
            dx, dy = math.cos(math.radians(a)), math.sin(math.radians(a))
            f.line([(cx + dx * 10, cy + dy * 10), (cx + dx * 28 + dy * 10, cy + dy * 28 - dx * 10)], (235, 80, 80), 7)
    elif emotion == "ANNOYED":
        for x, y, w, _ in BROWS:                                    # flat, low brows
            f.line([(x - w * 0.45, y + 12), (x + w * 0.45, y + 12)], (176, 104, 78), 9)
        for (x, y, w, h), lid in zip(EYES, LID):                    # half-closed
            f.ellipse(x, y + h * 0.18, w, h * 0.55, EYE)
            f.polygon([(x - w * 0.62, y - h * 0.56), (x + w * 0.62, y - h * 0.56), (x + w * 0.62, y + h * 0.05), (x - w * 0.62, y + h * 0.05)], lid)
            f.line([(x - w * 0.62, y + 2), (x + w * 0.62, y + 2)], EYE, 7)
        pts = [(mx - 36 + i * 6, my + 4 + 6 * math.sin(i * 1.15)) for i in range(13)]
        f.line(pts, LINE, 7)
        f.tear(760, 600, 16)                                        # sweat drop at the temple


def main():
    global SKIN, HAIR
    flat = "--flat" in sys.argv
    base_path = BASE.with_name("base-flat.png") if flat else BASE
    out_dir = BASE.parent / "flat" if flat else OUT
    base = np.array(Image.open(base_path).convert("RGBA")).astype(float)
    # Skin: the bright, opaque pixels between the eyes and the mouth.
    around = base[600:740, 300:640].reshape(-1, 4)
    light = around[(around[:, 3] > 250) & (around[:, :3].sum(1) > 600)]
    SKIN = tuple(int(c) for c in np.median(light[:, :3], axis=0))
    bangs = base[480:540, 330:600].reshape(-1, 4)
    HAIR = tuple(int(c) for c in np.median(bangs[bangs[:, 3] > 250][:, :3], axis=0))
    erased = erase(base.copy(), [*EYES, MOUTH], keep_hair=BROWS)
    for i, (x, y, w, h) in enumerate(EYES):
        LID[i] = tuple(int(c) for c in erased[int(y - h * 0.15), int(x), :3])
    out_dir.mkdir(parents=True, exist_ok=True)
    for emotion in ("NORMAL", "HAPPY", "JOYFUL", "SAD", "ANGRY", "ANNOYED"):
        img = erased.copy()
        canvas = Image.fromarray(img.clip(0, 255).astype(np.uint8), "RGBA")
        face = Face(canvas.size)
        draw(emotion, face)
        overlay = face.layer.resize(canvas.size, Image.LANCZOS)
        out = Image.alpha_composite(canvas, overlay)
        if flat:
            out.save(out_dir / f"{emotion.lower()}.png")
        else:
            out.resize((512, 512), Image.LANCZOS).save(out_dir / f"{emotion.lower()}.webp", quality=90)
        print("portrait", emotion, "flat" if flat else "")


if __name__ == "__main__":
    main()
