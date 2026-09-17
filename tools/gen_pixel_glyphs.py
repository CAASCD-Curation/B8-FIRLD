# 生成“田野们”像素字彩色 PNG v3（直接上色，img + image-rendering:pixelated 显示）
# 风格：方正像素感 —— SimHei 方块字形、80 格、超采样二值化 + 笔画加粗
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json, os

CELL = 40
SS = 8
COLORS = {'田': (149, 211, 114), '野': (229, 231, 235), '们': (229, 231, 235)}
src = ImageFont.truetype(r'C:\Windows\Fonts\simhei.ttf', CELL * SS)
out_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets')

meta = {}
for ch in '田野们':
    canvas = Image.new('L', (CELL * 2 * SS, CELL * 2 * SS), 0)
    d = ImageDraw.Draw(canvas)
    bbox = d.textbbox((0, 0), ch, font=src)
    d.text((-bbox[0], -bbox[1]), ch, font=src, fill=255)
    small = canvas.resize((canvas.width // SS, canvas.height // SS), Image.BICUBIC)
    bmp = small.point(lambda p: 255 if p > 100 else 0)
    bmp = bmp.filter(ImageFilter.MaxFilter(3))
    bb = bmp.getbbox()
    bmp = bmp.crop(bb)
    rgba = Image.new('RGBA', bmp.size, COLORS[ch] + (0,))
    rgba.putalpha(bmp)
    name = f'pixel-{ord(ch):x}.png'
    rgba.save(os.path.join(out_dir, name))
    meta[ch] = {'file': name, 'w': bmp.size[0], 'h': bmp.size[1]}
    print(ch, bmp.size, COLORS[ch])
