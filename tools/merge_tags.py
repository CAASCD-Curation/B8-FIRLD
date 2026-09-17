# -*- coding: utf-8 -*-
# 标签激进合并：共享任一汉字（长度≥2）的标签归为一组，输出 TS 模块
import re

src = open(r'E:/KimiData/kimi/Workspaces/t/tian-field/src/data/archive.ts', encoding='utf-8').read()
tags_raw = re.findall(r'"tags":\s*\[(.*?)\]', src, re.S)
allt = []
for t in tags_raw:
    allt += [x.replace('\\"', '"') for x in re.findall(r'"((?:[^"\\]|\\.)*)"', t)]
uni = sorted(set(allt))

# 并查集：首字相同（长度≥2）或一方包含另一方时归组。
# 例：麦田~麦地、镜像~镜面、苗族~苗绣（首字相同）；白描~田园白描（包含）。
# 首字规则避免「麦地~地膜」这类尾字链式误合并。
parent = {t: t for t in uni}

def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x

def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[rb] = ra

from collections import Counter, defaultdict

head_index = defaultdict(list)
for t in uni:
    if len(t) >= 2:
        head_index[t[0]].append(t)

for head, lst in head_index.items():
    for i in range(1, len(lst)):
        union(lst[0], lst[i])

for i, a in enumerate(uni):
    for b in uni[i + 1:]:
        if len(a) >= 2 and len(b) >= 2 and (a in b or b in a):
            union(a, b)

# 二轮：低频字（在整个标签集出现 ≤10 次）共享也归组，但限制组大小 ≤25，
# 防止链式吞并形成超级大类。高频字（田/园/农/艺…）不做跨组合并。
char_count = Counter()
for t in uni:
    for c in set(t):
        char_count[c] += 1
RARE = {c for c, n in char_count.items() if n <= 10}
char_index = defaultdict(list)
for t in uni:
    if len(t) >= 2:
        for c in set(t) & RARE:
            char_index[c].append(t)

gsize = {t: 1 for t in uni}

def union_capped(a, b, cap):
    ra, rb = find(a), find(b)
    if ra == rb:
        return
    if gsize[ra] + gsize[rb] > cap:
        return
    parent[rb] = ra
    gsize[ra] += gsize[rb]

for c, lst in char_index.items():
    for i in range(1, len(lst)):
        union_capped(lst[0], lst[i], 25)

freq = Counter(allt)

groups = {}
for t in uni:
    groups.setdefault(find(t), []).append(t)

merged = []
for members in groups.values():
    # 代表词：组内出现频率最高者（频率并列时取较短者）
    rep = sorted(members, key=lambda s: (-freq[s], len(s), s))[0]
    merged.append({'rep': rep, 'members': sorted(members)})

# ── 人工归大类：把 108 个代表词映射到 ~29 个粗略分类 ──
REP_CAT = {
    # 大类重命名
    '农事生产': '田园农事', '九宫格': '格网构成', '民生疾苦': '乡土社会',
    '梯田': '田野网格', '后印象派': '书画印艺', '山水': '山水风俗',
    '荒芜哀叹': '战乱荒芜', '隐逸': '江南隐逸',
    # 小组归入大类
    '亲耕': '田园农事', '耙地': '田园农事', '佃农': '田园农事',
    '保留农田': '田园农事', '养蜂': '田园农事', '坡地': '田园农事',
    '实验田': '田园农事', '棉花田': '田园农事', '植树': '田园农事',
    '牛耕': '田园农事', '边地垦殖': '田园农事', '镰刀': '田园农事',
    '失地农民': '乡土社会',
    '圆形': '格网构成', '条带': '格网构成', '灰线画格': '格网构成',
    '等高线': '格网构成', '负形格线': '格网构成', '辅助线': '格网构成',
    '黑体源头': '格网构成', '极简': '格网构成',
    '壁画': '书画印艺', '摹古': '书画印艺', '楹联匾额': '书画印艺',
    '画像石': '书画印艺', '砖画': '书画印艺',
    '晚期': '绘画流派', '平远': '绘画流派', '巴比松': '绘画流派',
    '油画': '绘画流派', '蛋彩': '绘画流派', '肖像': '绘画流派',
    '立体主义': '绘画流派', '浮世绘': '绘画流派', '现代': '绘画流派',
    '吴门': '绘画流派', '拾穗': '绘画流派',
    '租税疾苦': '土地制度', '均田': '土地制度', '官吏贪墨': '土地制度',
    '庄园': '土地制度', '军屯': '土地制度', '编户齐民': '土地制度',
    '鱼鳞图册': '土地制度',
    '冬水田': '水利田制', '喷灌': '水利田制', '圩田': '水利田制',
    '坎儿井': '水利田制', '孙叔敖': '水利田制', '无坝引水': '水利田制',
    '葑田': '水利田制', '暗渠': '水利田制', '沟洫': '水利田制',
    '命运悲剧': '文学叙事', '悬疑': '文学叙事', '抒情': '文学叙事',
    '梦幻': '文学叙事', '浪漫主义': '文学叙事', '真实叙事': '文学叙事',
    '诚斋体': '文学叙事', '赋': '文学叙事', '迁徙': '文学叙事',
    'MV': '影像媒介', '俯瞰阅读': '影像媒介', '吉卜力': '影像媒介',
    '好莱坞': '影像媒介',
    '多声部': '音乐戏曲', '薅草锣鼓': '音乐戏曲',
    '巨构花卉': '大地艺术', '越后妻有': '大地艺术',
    '路径': '大地艺术', '地画': '大地艺术',
    '徽派': '建筑园林', '瓦当': '建筑园林', '窗棂': '建筑园林',
    '国家节庆': '礼仪节庆', '祭祀祈年': '礼仪节庆', '龙抬头': '礼仪节庆',
    '昂玛突': '礼仪节庆', '先农坛': '礼仪节庆',
    '悯农讽喻': '田园抒情', '忧农情怀': '田园抒情',
    '未完成': '创作过程', '过程': '创作过程', '绝笔': '创作过程',
    '禾晾': '织绣编织', '竹编': '织绣编织', '罗': '织绣编织',
    '纱孔': '织绣编织', '防染': '织绣编织',
    '英国': '异域田园', '佛教': '宗教信仰',
    'GIAHS': '遗产名录', '敦煌': '遗产名录',
    '布幔': '空间装置', '季节更替': '时序物候', '紫色': '色彩意象',
    '镜面': '镜面空间',
}

cat_groups = {}
for g in merged:
    cat = REP_CAT.get(g['rep'], g['rep'])
    cat_groups.setdefault(cat, set()).update(g['members'])
final = [{'rep': c, 'members': sorted(m)} for c, m in cat_groups.items()]
final.sort(key=lambda g: g['rep'])
merged = final
print('final categories:', len(merged))
for g in merged:
    print(g['rep'], len(g['members']))

merged.sort(key=lambda g: g['rep'])
print('unique:', len(uni), '-> merged groups:', len(merged))
reduction = len(uni) - len(merged)
print('reduction:', reduction)

# 生成 TS：rep -> members 映射
lines = ['// 标签合并表：首字相同或互为包含的相似标签归到最高频代表词，筛选时同组等效',
         'export const TAG_GROUPS: Record<string, string[]> = {']
for g in merged:
    if len(g['members']) > 1:
        ms = ', '.join('"%s"' % m.replace('"', '\\"') for m in g['members'])
        lines.append('  "%s": [%s],' % (g['rep'].replace('"', '\\"'), ms))
lines.append('}')
lines.append('')
lines.append('// 每个标签归一化到其代表词（无组的标签映射到自己）')
lines.append('export function canonicalTag(t: string): string {')
lines.append('  for (const rep in TAG_GROUPS) {')
lines.append('    if (TAG_GROUPS[rep].includes(t)) return rep')
lines.append('  }')
lines.append('  return t')
lines.append('}')
out = '\n'.join(lines) + '\n'
open(r'E:/KimiData/kimi/Workspaces/t/tian-field/src/data/tagGroups.ts', 'w', encoding='utf-8').write(out)
print('written: src/data/tagGroups.ts')
big = [g for g in merged if len(g['members']) >= 3]
print('groups >=3:', len(big))
for g in big[:15]:
    print(g['rep'], '<-', g['members'])
