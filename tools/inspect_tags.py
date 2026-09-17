# -*- coding: utf-8 -*-
import re

src = open(r'E:/KimiData/kimi/Workspaces/t/tian-field/src/data/archive.ts', encoding='utf-8').read()
tags = re.findall(r'"tags":\s*\[(.*?)\]', src, re.S)
allt = []
for t in tags:
    allt += re.findall(r'"((?:[^"\\]|\\.)*)"', t)
allt = [t.replace('\\"', '"') for t in allt]
print('instances:', len(allt), 'unique:', len(set(allt)))

PUNCT = ' ，。、；：,.;:!?！？""''（）()《》<>[]【】\\-—~·'
norm = lambda s: re.sub('[' + re.escape(PUNCT) + ']+', '', s).lower()
normed = {}
for t in allt:
    normed.setdefault(norm(t), set()).add(t)
print('unique after normalize:', len(normed))
multi = {k: v for k, v in normed.items() if len(v) > 1}
print('groups >1 variant:', len(multi))
for k, v in list(multi.items())[:40]:
    print(repr(k), '->', sorted(v))
