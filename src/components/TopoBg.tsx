// 最底层背景：场地分析图风格 —— 坐标网格 + 蜿蜒路径 + 散点圆圈 + 场地轮廓，
// 极简浅灰、纯装饰、不可交互
import { useMemo } from 'react'

const W = 1600
const H = 1200

function hash(i: number, j: number) {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return s - Math.floor(s)
}

// 蜿蜒路径：多层正弦游走的长曲线
function wanderPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  amp: number,
  seed: number,
  steps = 140,
): string {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const base = Math.sin(t * Math.PI)
    const off =
      (Math.sin(t * 9 + seed) * 0.55 + Math.sin(t * 23 + seed * 1.7) * 0.3 +
        Math.sin(t * 41 + seed * 2.9) * 0.15) *
      amp *
      base
    const x = x0 + dx * t + px * off
    const y = y0 + dy * t + py * off
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

// Catmull-Rom 转贝塞尔：闭合平滑曲线
function smoothClosedPath(pts: Array<[number, number]>): string {
  const n = pts.length
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d + 'Z'
}

// 平滑等高线圈：低频波浪弯曲（非正圆），每圈中心轻微漂移形成蜿蜒山形
function contourRing(
  cx: number,
  cy: number,
  r: number,
  seed: number,
): string {
  const N = 36
  const pts: Array<[number, number]> = []
  const ox = cx + 85 * Math.sin(seed * 1.31)
  const oy = cy + 48 * Math.cos(seed * 0.77)
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const rr =
      r *
      (1 +
        0.2 * Math.sin(a + seed) +
        0.1 * Math.sin(2 * a + seed * 1.7) +
        0.05 * Math.sin(3 * a + seed * 0.6))
    pts.push([ox + Math.cos(a) * rr, oy + Math.sin(a) * rr * 0.75])
  }
  return smoothClosedPath(pts)
}

// 场地轮廓：闭合的游走曲线
function wanderClosed(
  cx: number,
  cy: number,
  r: number,
  amp: number,
  seed: number,
  squash = 0.8,
): string {
  const N = 90
  let d = ''
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2
    const rr =
      r *
      (1 +
        (Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 8 + seed * 1.7) * 0.3 +
          Math.sin(a * 15 + seed * 2.3) * 0.2) *
          amp)
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr * squash
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d + 'Z'
}

interface BgData {
  minorGrid: string
  majorGrid: string
  ticks: string
  trails: string[]
  boundaries: string[]
  dots: string
  rings: string
}

function buildBg(): BgData {
  // 坐标网格：细网格 + 每 5 格加粗主线 + 交点十字
  let minorGrid = ''
  let majorGrid = ''
  let ticks = ''
  const MINOR = 48
  const MAJOR = MINOR * 5
  for (let x = 0; x <= W; x += MINOR) {
    const d = `M${x} 0V${H}`
    if (x % MAJOR === 0) majorGrid += d
    else minorGrid += d
  }
  for (let y = 0; y <= H; y += MINOR) {
    const d = `M0 ${y}H${W}`
    if (y % MAJOR === 0) majorGrid += d
    else minorGrid += d
  }
  for (let x = MAJOR; x < W; x += MAJOR)
    for (let y = MAJOR; y < H; y += MAJOR)
      ticks += `M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`

  // 几条蜿蜒路径（主游线 + 次游线）
  const trails = [
    wanderPath(-20, 420, W + 20, 260, 130, 1.7),
    wanderPath(-20, 780, W + 20, 940, 150, 4.2),
    wanderPath(240, -20, 520, H + 20, 110, 6.8),
    wanderPath(1240, -20, 1080, H + 20, 120, 9.3),
    wanderPath(-20, 1080, 900, H + 20, 90, 12.1),
  ]
  const boundaries = [
    wanderClosed(760, 560, 430, 0.24, 2.9, 0.72),
    wanderClosed(1330, 880, 210, 0.3, 7.7, 0.85),
  ]

  // 散点：小实心点 + 空心圆圈（树/植被符号感）
  let dots = ''
  let rings = ''
  for (let k = 0; k < 170; k++) {
    const x = 30 + hash(k, 1) * (W - 60)
    const y = 30 + hash(k, 2) * (H - 60)
    const h = hash(k, 3)
    if (h < 0.45) {
      const r = 1.2 + hash(k, 4) * 1.6
      dots += `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0`
    } else {
      const r = 2.5 + hash(k, 5) * 3.5
      rings += `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0`
      if (h > 0.82) {
        // 少数双环（树符号）
        const r2 = r + 2.5
        rings += `M${(x - r2).toFixed(1)} ${y.toFixed(1)}a${r2.toFixed(1)} ${r2.toFixed(1)} 0 1 0 ${(2 * r2).toFixed(1)} 0a${r2.toFixed(1)} ${r2.toFixed(1)} 0 1 0 ${(-2 * r2).toFixed(1)} 0`
      }
    }
  }

  return { minorGrid, majorGrid, ticks, trails, boundaries, dots, rings }
}

export default function TopoBg() {
  const { minorGrid, majorGrid, ticks, trails, boundaries, dots, rings } =
    useMemo(buildBg, [])
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      style={{ opacity: 0.7 }}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* 坐标网格 */}
      <path d={minorGrid} fill="none" stroke="#eef1ef" strokeWidth="1" />
      <path d={majorGrid} fill="none" stroke="#e0e5e1" strokeWidth="1.2" />
      <path d={ticks} fill="none" stroke="#d7ddd8" strokeWidth="1.2" />
      {/* 场地轮廓 */}
      {boundaries.map((d, k) => (
        <path key={k} d={d} fill="none" stroke="#d5dbd6" strokeWidth="1.3" />
      ))}
      {/* 左下角密集等高线簇（全平滑曲线） */}
      {Array.from({ length: 10 }, (_, k) => (
        <path
          key={`c${k}`}
          d={contourRing(290, 1030, 52 + k * 26, 4.2 + k * 0.55)}
          fill="none"
          stroke="#c9d1ca"
          strokeWidth="1.1"
        />
      ))}
      {/* 蜿蜒路径 */}
      {trails.map((d, k) => (
        <path
          key={k}
          d={d}
          fill="none"
          stroke={k < 2 ? '#ccd4cd' : '#d9dfda'}
          strokeWidth={k < 2 ? 1.7 : 1.2}
        />
      ))}
      {/* 散点与圆圈 */}
      <path d={dots} fill="#d3dad4" />
      <path d={rings} fill="none" stroke="#cfd6d0" strokeWidth="1.2" />
    </svg>
  )
}
