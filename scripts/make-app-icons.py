"""Make the web app's icons from the happy village portrait.

The portrait (public/assets/characters/male/portraits/happy.webp) sits on a warm round-cornered
tile in the game's colours, over a soft lawn at the bottom. Writes into public/icons/:
  icon-192.png, icon-512.png    the app icon (manifest, "any")
  maskable-512.png              full-bleed square with the face inside the central safe zone
                                (Android crops it to a circle or squircle)
  apple-touch-icon.png          180 px, opaque (iOS home screen; iOS rounds the corners itself)
  favicon-64.png                browser tab

Run: uv run --no-project --with pillow python scripts/make-app-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PORTRAIT = ROOT / "public/assets/characters/male/portraits/happy.webp"
OUT = ROOT / "public/icons"
PAPER = (255, 241, 222)      # --paper-warm
ACCENT = (255, 181, 102)     # --accent
LAWN = (200, 208, 120)       # the preview stand


def tile(size: int, face_scale: float, rounded: bool) -> Image.Image:
    s = size * 4   # draw large, shrink at the end for smooth edges
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    bg = Image.new("RGBA", (s, s), PAPER + (255,))
    d = ImageDraw.Draw(bg)
    d.ellipse((-s * 0.25, s * 0.72, s * 1.25, s * 1.6), fill=LAWN + (255,))           # lawn
    d.ellipse((s * 0.12, s * 0.06, s * 0.88, s * 0.82), fill=ACCENT + (70,))          # warm glow
    bg = bg.filter(ImageFilter.GaussianBlur(s * 0.01))
    face = Image.open(PORTRAIT).convert("RGBA")
    box = face.getbbox()
    face = face.crop(box)
    w = int(s * face_scale)
    face = face.resize((w, int(face.height * w / face.width)), Image.LANCZOS)
    bg.alpha_composite(face, ((s - face.width) // 2, int(s * 0.94) - face.height))
    if rounded:
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.22), fill=255)
        img.paste(bg, (0, 0), mask)
    else:
        img = bg
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(parents=True, exist_ok=True)
for size in (192, 512):
    tile(size, 0.86, rounded=True).save(OUT / f"icon-{size}.png")
tile(512, 0.66, rounded=False).save(OUT / "maskable-512.png")
tile(180, 0.86, rounded=False).convert("RGB").save(OUT / "apple-touch-icon.png")
tile(64, 0.9, rounded=True).save(OUT / "favicon-64.png")
print("icons →", OUT, sorted(p.name for p in OUT.iterdir()))
