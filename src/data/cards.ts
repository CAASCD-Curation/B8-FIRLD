// 田块 × 档案配对：四个象限各固定一类档案（屏幕方位 → 分类）
// 左上(A)=形式灵感  右上(B)=文学意象  左下(C)=社会素材  右下(D)=经典艺术
// 初始每块田分得该类档案的一条；浇水成长时从该类档案队列继续取下一条（循环）
import { ARCHIVES, type ArchiveEntry, type Category } from './archive'
import { generatePlots, type FieldPlot, type ZoneId } from './fields'

const plots = generatePlots()

export const ZONE_CATEGORY: Record<ZoneId, Category> = {
  A: '形式灵感', // 左上
  B: '文学意象', // 右上
  C: '社会素材', // 左下
  D: '经典艺术', // 右下
}

const initial: Record<number, ArchiveEntry> = {}
const pointer: Record<Category, number> = {
  形式灵感: 0,
  文学意象: 0,
  社会素材: 0,
  经典艺术: 0,
}

;(Object.keys(ZONE_CATEGORY) as ZoneId[]).forEach((zone) => {
  const cat = ZONE_CATEGORY[zone]
  const list = ARCHIVES[cat]
  const ps = plots.filter((p) => p.zone === zone)
  ps.forEach((p, j) => {
    initial[p.id] = list[j % list.length]
  })
  pointer[cat] = ps.length
})

export function entryForPlot(p: FieldPlot): ArchiveEntry {
  return initial[p.id]
}

export function nextEntry(cat: Category): ArchiveEntry {
  const list = ARCHIVES[cat]
  const e = list[pointer[cat] % list.length]
  pointer[cat] += 1
  return e
}

export const TOTAL_ENTRIES = (Object.keys(ARCHIVES) as Category[]).reduce(
  (n, c) => n + ARCHIVES[c].length,
  0,
)
