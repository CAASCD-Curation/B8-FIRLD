// 田块数据：以抖动网格生成不规则田块拼贴，整体做俯视透视变形，并分为四个区域
export type PatternId =
  | 'solid'
  | 'sv'
  | 'sd'
  | 'dots'
  | 'waves'
  | 'cross'
  | 'contour'
  | 'grid'

export type ZoneId = 'A' | 'B' | 'C' | 'D'

export const ZONE_NAMES: Record<ZoneId, string> = {
  A: '甲',
  B: '乙',
  C: '丙',
  D: '丁',
}

export interface FieldPlot {
  id: number
  code: string // 田块编号，如 "01"
  zone: ZoneId
  points: string // SVG polygon points
  cx: number
  cy: number
  fill: string
  pattern: PatternId
  strokeLight: boolean // 图案纹理用浅色描边还是深色描边
  showLabel: boolean
}

export const VIEW_W = 1000
export const VIEW_H = 640

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 清新绿色系 + 少量麦田暖色点缀
const GREENS = [
  '#eef9f1',
  '#e0f5e6',
  '#cdf0d7',
  '#b4e8c4',
  '#95dcac',
  '#74cc92',
  '#56b877',
  '#3fa163',
  '#2f8753',
  '#246c44',
  '#1b5536',
]
const ACCENTS = ['#f6e7a9', '#f3d193', '#e9c58b'] // 麦色 / 浅赭
const ACCENTS_D = ['#d8e6a4', '#cde2a8', '#c2deac'] // 偏祖母绿的黄绿（右下专用）
const ZONE_ACCENT_P: Record<ZoneId, number> = { A: 0, B: 0.06, C: 0.06, D: 0.03 }
const PATTERNS: PatternId[] = [
  'solid',
  'sv',
  'sv',
  'sd',
  'dots',
  'dots',
  'waves',
  'cross',
  'contour',
  'grid',
]

// 四象限色调区分：色相差异为主、饱和度差异为辅（明度只做微调，保持和谐低饱和）。
// A 左上=偏青绿 B 右上=偏黄绿 C 左下=基准翠绿 D 右下=偏深浓绿（对比加强）
const ZONE_HUE_SHIFT: Record<ZoneId, number> = { A: 38, B: -42, C: 2, D: 16 }
const ZONE_SAT_SHIFT: Record<ZoneId, number> = { A: 8, B: 6, C: 2, D: 14 } // 百分点
const ZONE_LIT_SHIFT: Record<ZoneId, number> = { A: 0, B: 1, C: 0, D: -7 } // 明度比例

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((((h % 360) + 360) % 360) / 360)
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t: number) => {
    t = ((t % 1) + 1) % 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [
    Math.round(f(h + 1 / 3) * 255),
    Math.round(f(h) * 255),
    Math.round(f(h - 1 / 3) * 255),
  ]
}

function zoneTint(zone: ZoneId, hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [h, s, l] = rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255)
  // 暖色（麦色点缀）只施加少量偏移，保持暖调
  const warm = h < 90 || h > 320
  const k = warm ? 0.2 : 1
  const nl = Math.min(0.97, Math.max(0.03, l + ZONE_LIT_SHIFT[zone] / 100))
  const [r, g, b] = hslToRgb(
    h + ZONE_HUE_SHIFT[zone] * k,
    Math.min(1, Math.max(0, s + (ZONE_SAT_SHIFT[zone] / 100) * k)),
    nl,
  )
  return (
    '#' +
    [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
  )
}

// 图例用的象限代表色（对中等绿色施加同样的象限色调）
export function zoneSwatch(zone: ZoneId) {
  return zoneTint(zone, '#74cc92')
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

// 成长：颜色沿绿色阶梯加深一级（四象限保持各自的色相偏移）；暖色田首次成长回到绿色系
export function deepenFill(fill: string, zone: ZoneId): string {
  const exact = GREENS.indexOf(fill)
  const i = exact >= 0 ? exact : 6
  return zoneTint(zone, GREENS[Math.min(i + 1, GREENS.length - 1)])
}

// 斜轴投影（轴测式俯瞰）+ 近大远小：田野平面绕竖轴旋转约 40° 并后仰、水平镜像，
// 每个田块呈菱形，沿纵深方向随距离缩小——无人机斜上方俯瞰视角（绝非正面）。
// 基向量：Ex = 田垄走向，Ey = 纵深走向；s(v) = 近大远小缩放梯度
const O = { x: 360, y: 50 } // 平面远角原点
const EX = { x: 640, y: 110 }
const EY = { x: -300, y: 410 }

function proj(u: number, v: number) {
  const s = 0.7 + 0.4 * v // 远端 0.7 倍、近端 1.1 倍
  const x = O.x + u * EX.x * s + v * EY.x * s
  const y = O.y + u * EX.y * s + v * EY.y * s
  return { x: VIEW_W - x, y } // 水平镜像
}

// 四个象限以「田」字十字路径为界（u=0.5 中竖、v=0.5 中横），与视觉象限严格对齐；
// 斜投影下十字路径是斜线，若用屏幕包围盒中线会错分（成长换卡会跨象限）。
// 近处（画面下方）密、远处（画面上方）疏，但差距平缓；缝隙为田埂宽度系数
const ZONE_DENSITY: Record<ZoneId, number> = {
  A: 0.45, // 左上（远）：疏
  B: 0.55, // 右上（远）：较疏
  C: 0.85, // 左下（近）：密
  D: 0.78, // 右下（近）：较密
}

const ZONE_GAP: Record<ZoneId, number> = {
  A: 0.26,
  B: 0.19,
  C: 0.11,
  D: 0.14,
}

// 中央收窄：把被移除的中列/中行所占的参数宽度压窄（约一半），两半平面微微外扩
function squeeze(t: number, edge: number, half: number) {
  if (t <= edge) return (t / edge) * half
  if (t >= 1 - edge) return 1 - ((1 - t) / edge) * half
  return half + ((t - edge) / (1 - 2 * edge)) * (1 - 2 * half)
}
const SQZ_U = { edge: 6 / 13, half: 0.48 }
const SQZ_V = { edge: 5 / 11, half: 0.475 }

export function generatePlots(seed = 20260916): FieldPlot[] {
  const rand = mulberry32(seed)
  const cols = 13 // 奇数列：正中央一列留给路径
  const rows = 11 // 奇数行：正中央一行留给路径

  // 1. 生成带抖动的共享网格顶点（u,v 为平面参数坐标，相邻田块边界自然咬合）
  const verts: { x: number; y: number }[][] = []
  for (let r = 0; r <= rows; r++) {
    const row: { x: number; y: number }[] = []
    for (let c = 0; c <= cols; c++) {
      const edgeC = c === 0 || c === cols
      const edgeR = r === 0 || r === rows
      const ju = edgeC ? 0 : (rand() * 2 - 1) * 0.012
      const jv = edgeR ? 0 : (rand() * 2 - 1) * 0.014
      row.push(
        proj(
          squeeze(c / cols + ju, SQZ_U.edge, SQZ_U.half),
          squeeze(r / rows + jv, SQZ_V.edge, SQZ_V.half),
        ),
      )
    }
    verts.push(row)
  }

  // 2. 逐格生成田块，用椭圆蒙版 + 噪声裁出不规则整体轮廓
  const plots: FieldPlot[] = []
  let id = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tl = verts[r][c]
      const tr = verts[r][c + 1]
      const br = verts[r + 1][c + 1]
      const bl = verts[r + 1][c]

      const cx = (tl.x + tr.x + br.x + bl.x) / 4
      const cy = (tl.y + tr.y + br.y + bl.y) / 4

      // 填满整个斜置平面（仅裁掉四周边缘）；十字空隙为路径，四象限按疏密自然划分
      const u = (c + 0.5) / cols
      const v = (r + 0.5) / rows
      if (u < 0.03 || u > 0.97 || v < 0.04 || v > 0.97) continue
      // 中央一列 / 一行留作路径（"田"字的中竖与中横）
      if (Math.abs(u - 0.5) < 0.042 || Math.abs(v - 0.5) < 0.048) continue

      // 按平面参数空间归入四个视觉象限：中央一列/一行即"田"字十字路径，
      // 斜投影+水平镜像后「屏幕左侧 = u>0.5」，故：
      // A=左上 B=右上 C=左下 D=右下（与图例、分类固定对应，杜绝跨象限错分）
      const zone: ZoneId =
        u > 0.5 ? (v < 0.5 ? 'A' : 'C') : v < 0.5 ? 'B' : 'D'
      if (rand() > ZONE_DENSITY[zone]) continue
      if (rand() < 0.02) continue

      // 3. 顶点向质心收缩，留出白色田埂缝隙（缝隙随区域疏密变化）
      const gap = ZONE_GAP[zone]
      const inset = (p: { x: number; y: number }) => ({
        x: p.x + (cx - p.x) * gap,
        y: p.y + (cy - p.y) * gap,
      })
      const pts = [inset(tl), inset(tr), inset(br), inset(bl)]
      const points = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

      // 4. 配色与纹理（麦色点缀按象限控制：左上不出现黄色；右下少量且偏祖母绿）
      const roll = rand()
      const isAccent = roll < ZONE_ACCENT_P[zone]
      const fill = zoneTint(
        zone,
        isAccent
          ? zone === 'D'
            ? ACCENTS_D[Math.floor(rand() * ACCENTS_D.length)]
            : ACCENTS[Math.floor(rand() * ACCENTS.length)]
          : GREENS[Math.floor(Math.pow(rand(), 1.35) * GREENS.length)],
      )
      const pattern = PATTERNS[Math.floor(rand() * PATTERNS.length)]
      const strokeLight = luminance(fill) < 0.55

      const minW = Math.min(
        Math.hypot(tr.x - tl.x, tr.y - tl.y),
        Math.hypot(bl.x - tl.x, bl.y - tl.y),
      )

      id += 1
      plots.push({
        id,
        code: String(id).padStart(2, '0'),
        zone,
        points,
        cx,
        cy,
        fill,
        pattern,
        strokeLight,
        showLabel: minW > 52,
      })
    }
  }
  return plots
}
