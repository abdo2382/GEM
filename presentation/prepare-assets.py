"""Builds the deck's images from real captures of the site (promo-video/frames, stills)
and the verified archive photographs (public/archive). Run from presentation/."""
import os
import shutil

from PIL import Image

FR = '../promo-video/frames'
ST = '../promo-video/stills'
OUT = 'assets'
os.makedirs(OUT, exist_ok=True)


def save(im, name, width=None, q=82):
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.convert('RGB').save(f'{OUT}/{name}.webp', 'WEBP', quality=q, method=6)
    print(name, im.size, os.path.getsize(f'{OUT}/{name}.webp') // 1024, 'KB')


frame = lambda take, n: Image.open(f'{FR}/{take}/{n:05d}.jpg')


def feather(im, inner, cx=0.5, cy=0.5, rx=0.5, ry=0.5):
    """Fade the picture into transparency outside an ellipse (fractions of its size).
    Baked into the alpha channel so the PDF needs no CSS mask (those print with seams)."""
    w, h = im.size
    alpha = Image.new('L', (w, h))
    px = alpha.load()
    for y in range(h):
        for x in range(w):
            d = (((x + 0.5) / w - cx) / rx) ** 2 + (((y + 0.5) / h - cy) / ry) ** 2
            d = d ** 0.5
            px[x, y] = 255 if d <= inner else 0 if d >= 1 else round(255 * (1 - (d - inner) / (1 - inner)))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out


def save_alpha(im, name, q=86):
    im.save(f'{OUT}/{name}.webp', 'WEBP', quality=q, method=6)
    print(name, im.size, os.path.getsize(f'{OUT}/{name}.webp') // 1024, 'KB (alpha)')


# The approved mask, face on (closing take, last frame), cropped around the mask and
# feathered into the page.
save_alpha(feather(frame('H', 219).crop((420, 0, 1500, 1080)), 0.72), 'mask-hero')
save_alpha(feather(frame('A', 120).crop((420, 0, 1500, 1080)), 0.72), 'mask-turn')

# One still per chapter of the desktop journey.
for name, n in [('ch-awakening', 40), ('ch-discovery', 150), ('ch-treasures', 400), ('ch-inside', 575), ('ch-legacy', 700)]:
    save(frame('C', n), name, 1600)

# "Why it matters": the Living Legacy chapter (the mask at the Grand Egyptian Museum),
# cropped to the mask and feathered, for a faint backdrop.
save_alpha(feather(frame('C', 700).crop((278, 0, 1642, 1000)).resize((1025, 750), Image.LANCZOS), 0.35, 0.5, 0.55, 0.5, 0.6), 'why-legacy')

# Arabic, right to left.
save(frame('E', 150), 'arabic', 1600)

# Phone screens (captured at 1080 x 2337).
for name, take, n in [('phone-start', 'B', 30), ('phone-prologue', 'B', 300), ('phone-story', 'G', 95), ('phone-trail', 'G', 385), ('phone-inspect', 'F', 140)]:
    save(frame(take, n), name, 540, 84)

# Each treasure in Inspect, cropped to the object; and one full Inspect view.
crops = {'mask': (700, 40, 1660, 1000), 'anubis': (900, 160, 1740, 1000), 'throne': (820, 120, 1700, 1000), 'canopic': (900, 140, 1780, 1020)}
for k, box in crops.items():
    save(Image.open(f'{ST}/inspect-{k}.jpg').crop(box), f'obj-{k}', 800, 86)
save(Image.open(f'{ST}/inspect-throne.jpg'), 'inspect-throne', 1600)

# The archive photographs, exactly as shipped with the site.
for f in sorted(os.listdir('../public/archive')):
    shutil.copy(f'../public/archive/{f}', f'{OUT}/{f}')
    print(f, 'copied')
