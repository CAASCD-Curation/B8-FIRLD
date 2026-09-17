# -*- coding: utf-8 -*-
"""把四个档案 xlsx 解析为 src/data/archive.ts 的结构化数据，并提取内嵌图片到 public/media"""
import openpyxl, warnings, json, re, io, os, zipfile
from xml.etree import ElementTree as ET

warnings.filterwarnings('ignore')

NS = {
    'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'R': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}


def extract_images(xlsx, catkey):
    """按锚点行提取图片 → {行号: 站点路径}，并写入 public/media/<catkey>/"""
    z = zipfile.ZipFile(xlsx)
    rels_xml = z.read('xl/drawings/_rels/drawing1.xml.rels').decode('utf-8')
    rels = dict(
        re.findall(r'<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"', rels_xml)
    )
    root = ET.fromstring(z.read('xl/drawings/drawing1.xml'))
    row2img = {}
    for anc in root:
        frm = anc.find('xdr:from', NS)
        if frm is None:
            continue
        row = int(frm.find('xdr:row', NS).text)
        blip = anc.find('.//a:blip', NS)
        if blip is None:
            continue
        rid = blip.get('{%s}embed' % NS['R'])
        target = rels.get(rid)
        if not target:
            continue
        path = 'xl/' + target.replace('../', '')
        if row not in row2img:
            ext = path.rsplit('.', 1)[-1].lower().replace('jpeg', 'jpg')
            row2img[row] = (ext, z.read(path))
    z.close()
    os.makedirs(f'public/media/{catkey}', exist_ok=True)
    out = {}
    for row, (ext, data) in row2img.items():
        fn = f'{catkey}/r{row}.{ext}'
        with open(f'public/media/{fn}', 'wb') as f:
            f.write(data)
        out[row] = '/media/' + fn
    return out

def clean(s):
    if s is None:
        return ''
    s = str(s).replace('\ufffc', '').replace('\r', '')
    return s.strip()

def parse_meta(text):
    """从正文里拆出 图/文、出处、年代、标签、备注（容忍行首/项目符号）"""
    body = text
    source = era = note = ''
    tags = []
    for key in ('标签', '备注', '年代', '出处'):
        m = re.search(rf'(?:^|\n)\s*[•·\-]?\s*{key}[:：]([^\n]*)', body)
        if not m:
            continue
        val = m.group(1).strip()
        body = body[:m.start()] + body[m.end():]
        if key == '出处':
            source = val
        elif key == '年代':
            era = val
        elif key == '备注':
            note = val
        else:
            if '#' in val:
                tags = re.findall(r'#([^#\s]+)', val)
            else:
                tags = [t.strip() for t in re.split(r'[、，,]', val) if t.strip()]
    body = re.sub(r'^(?:[\s•·\-]*图/文[:：]?)+', '', body.strip()).strip()
    return body, source, era, tags, note

def read_rows(fname):
    wb = openpyxl.load_workbook(fname, read_only=True)
    ws = wb.worksheets[0]
    rows = []
    for r in ws.iter_rows(values_only=True):
        rows.append([clean(c) for c in r])
    wb.close()
    return rows


# 类别 key（用于图片目录名）
CATKEY = {
    '形式灵感档案(1).xlsx': 'form',
    '文学意象档案(1).xlsx': 'lit',
    '社会素材档案(1).xlsx': 'social',
    '经典艺术档案(1).xlsx': 'art',
}


def images_for(fname):
    key = CATKEY[fname]
    if key == 'lit':
        return {}
    return extract_images('data-src/' + fname, key)

entries = {}

# ---------- 形式灵感档案：A列分节，B列条目 ----------
rows = read_rows('data-src/形式灵感档案(1).xlsx')
images = images_for('形式灵感档案(1).xlsx')
lst, section = [], ''
for i, r in enumerate(rows[1:], start=1):
    a, b = (r + [''])[:2]
    if a:
        section = a
    if b:
        lines = b.split('\n')
        title = lines[0].strip()
        body, source, era, tags, note = parse_meta('\n'.join(lines[1:]))
        lst.append(dict(title=title, section=section, text=body, note=note,
                        source=source, era=era, tags=tags,
                        image=images.get(i)))
entries['形式灵感'] = lst

# ---------- 文学意象档案：A列诗句，B列元数据 ----------
rows = read_rows('data-src/文学意象档案(1).xlsx')
images = {}
lst = []
for r in rows[1:]:
    a, b = (r + [''])[:2]
    if not a:
        continue
    quote = a.strip()
    if quote.endswith('档案') and not b:
        continue
    msrc = re.search(r'《([^》]+)》', b)
    title = f'《{msrc.group(1)}》' if msrc else quote[:12]
    body, source, era, tags, note = parse_meta(b)
    lst.append(dict(title=title, section='文学意象', text=quote,
                    note=note, source=source, era=era, tags=tags))
entries['文学意象'] = lst

# ---------- 社会素材档案：A列整条 ----------
rows = read_rows('data-src/社会素材档案(1).xlsx')
images = images_for('社会素材档案(1).xlsx')
lst = []
for i, r in enumerate(rows[1:], start=1):
    a = r[0] if r else ''
    if not a:
        continue
    lines = a.split('\n')
    title = lines[0].strip()
    body, source, era, tags, note = parse_meta('\n'.join(lines[1:]))
    lst.append(dict(title=title, section='社会素材', text=body, note=note,
                    source=source, era=era, tags=tags,
                    image=images.get(i)))
entries['社会素材'] = lst

# ---------- 经典艺术档案：A列整条 ----------
rows = read_rows('data-src/经典艺术档案(1).xlsx')
images = images_for('经典艺术档案(1).xlsx')
lst = []
for i, r in enumerate(rows):
    a = r[0] if r else ''
    if not a or '档案' in a[:6]:
        continue
    lines = a.split('\n')
    head = lines[0].strip()
    parts = [p.strip() for p in head.split('｜')]
    title = parts[0]
    artist = parts[1] if len(parts) > 1 else ''
    year = parts[2] if len(parts) > 2 else ''
    body, source, era, tags, note = parse_meta('\n'.join(lines[1:]))
    if year and not era:
        era = year
    if artist:
        source = (artist + (' · ' if source else '')) + source
    lst.append(dict(title=title, section='经典艺术', text=body, note=note,
                    source=source, era=era, tags=tags,
                    image=images.get(i)))
entries['经典艺术'] = lst

for k, v in entries.items():
    print(k, len(v))

header = """// 田 · FIELD ARCHIVE —— 卡片档案内容（由四个 xlsx 档案表提取生成）

export type Category = '形式灵感' | '文学意象' | '社会素材' | '经典艺术'

export interface ArchiveEntry {
  title: string
  section: string
  text: string
  note?: string
  source: string
  era: string
  tags: string[]
  image?: string | null
}

"""

data = json.dumps(entries, ensure_ascii=False, indent=2)
with io.open('src/data/archive.ts', 'w', encoding='utf-8') as f:
    f.write(header)
    f.write('export const ARCHIVES: Record<Category, ArchiveEntry[]> = ')
    f.write(data)
    f.write('\n')
print('written src/data/archive.ts')
