import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { entryForPlot, nextEntry, ZONE_CATEGORY } from '@/data/cards'
import { canonicalTag } from '@/data/tagGroups'
import LikeButton from '@/components/LikeButton'
import type { ArchiveEntry } from '@/data/archive'
import {
  deepenFill,
  generatePlots,
  VIEW_H,
  VIEW_W,
  type FieldPlot,
} from '@/data/fields'

/* 展示用田块：几何信息 + 当前档案条目 */
type DisplayPlot = FieldPlot & { entry: ArchiveEntry }

/* ---------------- SVG 纹理图案库（模拟不同作物的田面质感） ---------------- */

function PatternDefs() {
  const dark = 'rgba(20,72,42,0.32)'
  const light = 'rgba(255,255,255,0.55)'
  const s = (c: string, w = 1.4) => ({ stroke: c, strokeWidth: w, fill: 'none' })

  return (
    <defs>
      {/* 竖条 —— 垄作 */}
      <pattern id="pat-sv" width="11" height="11" patternUnits="userSpaceOnUse">
        <line x1="3" y1="0" x2="3" y2="11" {...s(dark)} />
        <line x1="8" y1="0" x2="8" y2="11" {...s(dark, 0.7)} />
      </pattern>
      <pattern id="pat-sv-l" width="11" height="11" patternUnits="userSpaceOnUse">
        <line x1="3" y1="0" x2="3" y2="11" {...s(light)} />
        <line x1="8" y1="0" x2="8" y2="11" {...s(light, 0.7)} />
      </pattern>

      {/* 斜纹 —— 梯田 */}
      <pattern
        id="pat-sd"
        width="12"
        height="12"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="3" x2="12" y2="3" {...s(dark)} />
      </pattern>
      <pattern
        id="pat-sd-l"
        width="12"
        height="12"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="3" x2="12" y2="3" {...s(light)} />
      </pattern>

      {/* 圆点 —— 育苗 */}
      <pattern id="pat-dots" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.8" fill={dark} />
        <circle cx="12" cy="12" r="1.8" fill={dark} />
      </pattern>
      <pattern id="pat-dots-l" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.8" fill={light} />
        <circle cx="12" cy="12" r="1.8" fill={light} />
      </pattern>

      {/* 波浪 —— 水田涟漪 */}
      <pattern id="pat-waves" width="24" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 6 Q6 0 12 6 T24 6" {...s(dark)} />
      </pattern>
      <pattern id="pat-waves-l" width="24" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 6 Q6 0 12 6 T24 6" {...s(light)} />
      </pattern>

      {/* 交叉纹 —— 密植 */}
      <pattern id="pat-cross" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 12 L12 0" {...s(dark, 0.9)} />
        <path d="M0 0 L12 12" {...s(dark, 0.9)} />
      </pattern>
      <pattern id="pat-cross-l" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 12 L12 0" {...s(light, 0.9)} />
        <path d="M0 0 L12 12" {...s(light, 0.9)} />
      </pattern>

      {/* 等高线 —— 坡地 */}
      <pattern id="pat-contour" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M-4 8 Q10 0 24 8 T52 8" {...s(dark, 0.9)} />
        <path d="M-4 20 Q10 12 24 20 T52 20" {...s(dark, 0.9)} />
      </pattern>
      <pattern id="pat-contour-l" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M-4 8 Q10 0 24 8 T52 8" {...s(light, 0.9)} />
        <path d="M-4 20 Q10 12 24 20 T52 20" {...s(light, 0.9)} />
      </pattern>

      {/* 田字格 —— 稻秧 */}
      <pattern id="pat-grid" width="14" height="14" patternUnits="userSpaceOnUse">
        <path d="M7 3 V11 M3 7 H11" {...s(dark, 1.1)} />
      </pattern>
      <pattern id="pat-grid-l" width="14" height="14" patternUnits="userSpaceOnUse">
        <path d="M7 3 V11 M3 7 H11" {...s(light, 1.1)} />
      </pattern>
    </defs>
  )
}

function patternUrl(p: FieldPlot) {
  if (p.pattern === 'solid') return undefined
  const suffix = p.strokeLight ? '-l' : ''
  return `url(#pat-${p.pattern}${suffix})`
}

/* ---------------- 悬停预览卡片 ---------------- */

function HoverPreview({
  plot,
  growing,
}: {
  plot: DisplayPlot
  growing?: boolean
}) {
  const { entry } = plot
  const excerpt = entry.text.replace(/\n+/g, ' ')
  return (
    <div className="field-preview">
      <div
        className={`preview-card overflow-hidden rounded-xl border border-emerald-100 bg-white/95 shadow-xl shadow-emerald-900/10 backdrop-blur ${
          growing ? 'card-sprout' : ''
        }`}
      >
        {/* 卡头：配图（无图则用田块色样） */}
        <div
          className="h-20 w-full bg-emerald-50"
          style={{ backgroundColor: entry.image ? undefined : plot.fill }}
        >
          {entry.image ? (
            <img
              src={entry.image}
              alt={entry.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            plot.pattern !== 'solid' && (
              <svg className="h-full w-full opacity-70">
                <rect width="100%" height="100%" fill={patternUrl(plot)} />
              </svg>
            )
          )}
        </div>
        <div className="space-y-2 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] tracking-widest text-emerald-600">
              FIELD · {plot.code}
            </span>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">
              {ZONE_CATEGORY[plot.zone]}
            </span>
          </div>
          {/* 标题 */}
          <h4 className="line-clamp-2 text-[13px] font-semibold leading-snug text-emerald-950">
            {entry.title}
          </h4>
          {/* 摘录 */}
          <p className="line-clamp-3 text-[11px] leading-relaxed text-emerald-900/60">
            {excerpt}
          </p>
          {/* 标签 */}
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {entry.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-emerald-100 bg-emerald-50/70 px-1.5 py-px text-[9px] text-emerald-500"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* 指向田块的小箭头（左侧） */}
      <div className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-l border-emerald-100 bg-white" />
    </div>
  )
}

/* ---------------- 降雨波（悬停滚轮触发，按田块轮廓裁剪） ---------------- */

function RainWave({
  waveId,
  plot,
  onDone,
}: {
  waveId: number
  plot: FieldPlot
  onDone: (id: number) => void
}) {
  const gRef = useRef<SVGGElement>(null)
  // 悬停上浮 9px 换算成 SVG 单位（基于当前渲染缩放）
  const [lift, setLift] = useState(0)
  useEffect(() => {
    const svg = gRef.current?.ownerSVGElement
    const ctm = svg?.getScreenCTM()
    if (ctm && ctm.a > 0) setLift(9 / ctm.a)
  }, [])

  // 几何：雨线从「上浮后田块顶部上方 40% 田高」处开始，落入田块底部
  const geom = useMemo(() => {
    const pts = plot.points.split(' ').map((s) => s.split(',').map(Number))
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const x0 = Math.min(...xs)
    const w = Math.max(...xs) - x0
    const y0 = Math.min(...ys)
    const yBottom = Math.max(...ys)
    const h = yBottom - y0
    const startY = y0 - (h * 0.4 + lift)
    return { x0, w, y0, yBottom, h, startY }
  }, [plot, lift])

  const lines = useMemo(
    () =>
      Array.from({ length: 24 }, () => {
        const y = geom.startY
        return {
          x: geom.x0 - 6 + Math.random() * (geom.w + 12),
          y,
          delay: Math.random() * 0.25,
          dur: 0.55 + Math.random() * 0.25,
          len: 8 + Math.random() * 8,
          fall: geom.yBottom + 10 - y,
        }
      }),
    [geom],
  )

  useEffect(() => {
    const t = setTimeout(() => onDone(waveId), 1400)
    return () => clearTimeout(t)
  }, [waveId, onDone])

  return (
    <g ref={gRef}>
      <defs>
        <clipPath id={`rain-clip-${waveId}`}>
          {/* 裁剪区：上方延伸到雨线起点，左右与下方严格限定在田块边界内 */}
          <rect
            x={geom.x0}
            y={geom.startY - 4}
            width={geom.w}
            height={geom.yBottom - geom.startY + 4}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#rain-clip-${waveId})`}>
        {lines.map((l, i) => (
          <line
            key={i}
            className="rain-line"
            x1={l.x}
            y1={l.y}
            x2={l.x + 5}
            y2={l.y + l.len}
            style={
              {
                animationDelay: `${l.delay}s`,
                animationDuration: `${l.dur}s`,
                '--fall': `${l.fall}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </g>
    </g>
  )
}

/* ---------------- 中央详情弹窗 ---------------- */

function FieldModal({
  plot,
  onClose,
}: {
  plot: DisplayPlot
  onClose: () => void
}) {
  const { entry } = plot
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="modal-overlay fixed inset-x-0 bottom-0 z-40 flex items-center justify-center bg-black/20 p-4"
      style={{ top: 72 }}
      onClick={onClose}
    >
      <div
        className="modal-card max-h-[calc(100vh-110px)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl shadow-emerald-950/20"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* 顶部：整幅图片（无图时用田块色带代替），底部渐变蒙版融入白卡 */}
        <div className="relative">
          {entry.image ? (
            <img
              src={entry.image}
              alt={entry.title}
              className="h-60 w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="relative h-32 w-full"
              style={{ backgroundColor: plot.fill }}
            >
              {plot.pattern !== 'solid' && (
                <svg className="h-full w-full opacity-80">
                  <rect width="100%" height="100%" fill={patternUrl(plot)} />
                </svg>
              )}
            </div>
          )}
          {/* 渐变蒙版 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/65 to-transparent" />

          {/* 徽标（叠在图片上） */}
          <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
            <div className="rounded-md bg-white/90 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-emerald-700 shadow-sm">
              FIELD · {plot.code}
            </div>
            <div className="rounded-md bg-emerald-950/55 px-2 py-1 text-[10px] tracking-wide text-white shadow-sm backdrop-blur-sm">
              {ZONE_CATEGORY[plot.zone]}
            </div>
          </div>
          {/* 喜欢（爱心） */}
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-emerald-800 shadow-sm transition hover:bg-white hover:rotate-90 duration-200"
          >
            ✕
          </button>
        </div>

        {/* 卡体 */}
        <div className="relative -mt-10 space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <h3 className="text-xl font-semibold leading-snug text-emerald-950">
              {entry.title}
            </h3>
            {(entry.era || entry.source) && (
              <p className="text-[11px] tracking-wide text-emerald-500">
                {entry.era}
                {entry.era && entry.source ? ' ／ ' : ''}
                {entry.source}
              </p>
            )}
          </div>

          {/* 正文 */}
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-emerald-950/80">
            {entry.text}
          </p>

          {/* 备注（纯文字，与正文形式统一） */}
          {entry.note && (
            <p className="text-[12px] leading-relaxed text-emerald-900/60">
              {entry.note}
            </p>
          )}

          {/* 标签 + 喜欢（同排，爱心居右） */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-[10px] text-emerald-600"
                >
                  {t}
                </span>
              ))}
            </div>
            <LikeButton entry={entry} />
          </div>

          <div className="flex items-center justify-between border-t border-emerald-50 pt-3">
            <span className="font-mono text-[10px] tracking-widest text-emerald-300">
              ARCHIVE / {entry.section}
            </span>
            <span className="font-mono text-[10px] tracking-widest text-emerald-300">
              GEN · {plot.zone}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 田块地图主体 ---------------- */

interface HoverState {
  plot: FieldPlot
  x: number
  y: number
}

interface GrownState {
  fill: string
  code: string
  gen: number
  entry: ArchiveEntry
}

export default function FieldMap({
  filter,
}: {
  filter?: { query: string; tags: Set<string> } | null
}) {
  const plots = useMemo(() => generatePlots(), [])
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const [active, setActive] = useState<FieldPlot | null>(null)
  // 悬停防抖：离开田块后延迟清除，避免在田块锯齿边缘/缝隙间移动时抖动
  const leaveTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])

  const beginHover = useCallback((p: FieldPlot, x: number, y: number) => {
    window.clearTimeout(leaveTimer.current)
    hoverPlotRef.current = p
    setHover((h) => (h && h.plot.id === p.id ? h : { plot: p, x, y }))
  }, [])

  const endHover = useCallback(() => {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => {
      hoverPlotRef.current = null
      setHover(null)
    }, 140)
  }, [])

  // 降雨与成长状态
  const [rains, setRains] = useState<{ id: number; plot: FieldPlot }[]>([])
  const [grown, setGrown] = useState<Record<number, GrownState>>({})
  const hoverPlotRef = useRef<FieldPlot | null>(null)
  const waterRef = useRef<Map<number, number>>(new Map())
  const nextCardRef = useRef(plots.length + 1)
  const waveSeq = useRef(0)
  const lastRainAt = useRef(0)

  const removeWave = useCallback((id: number) => {
    setRains((rs) => rs.filter((r) => r.id !== id))
  }, [])

  // 悬停时滚轮：每一波刻度触发一波斜雨；累计两波后田块成长、换成新卡片
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const p = hoverPlotRef.current
      if (!p) return
      e.preventDefault()
      const now = Date.now()
      if (now - lastRainAt.current < 200) return
      lastRainAt.current = now

      waveSeq.current += 1
      const id = waveSeq.current
      setRains((rs) => [...rs.slice(-5), { id, plot: p }])

      const ticks = (waterRef.current.get(p.id) ?? 0) + 1
      if (ticks >= 2) {
        waterRef.current.set(p.id, 0)
        const code = String(nextCardRef.current++).padStart(2, '0')
        // 先在 updater 外取下一张本类档案（StrictMode 下 updater 会双调用，
        // 放里面会让指针连跳两次；取不到新卡时按队列循环回旧卡）
        const entry = nextEntry(ZONE_CATEGORY[p.zone])
        setPulseId(p.id)
        setTimeout(() => setPulseId((cur) => (cur === p.id ? null : cur)), 780)
        setGrown((g) => {
          const prev = g[p.id]
          return {
            ...g,
            [p.id]: {
              fill: deepenFill(prev?.fill ?? p.fill, p.zone),
              code,
              gen: (prev?.gen ?? 0) + 1,
              entry,
            },
          }
        })
      } else {
        waterRef.current.set(p.id, ticks)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // 成长后的展示状态：颜色加深 + 新卡片编号 + 新档案条目
  const [pulseId, setPulseId] = useState<number | null>(null)
  const displayOf = (p: FieldPlot): DisplayPlot => {
    const gv = grown[p.id]
    return gv
      ? { ...p, fill: gv.fill, code: gv.code, entry: gv.entry }
      : { ...p, entry: entryForPlot(p) }
  }

  // 搜索 + 标签筛选：未命中的田块淡出（标签按合并后的代表词匹配）
  const matchesFilter = (d: DisplayPlot): boolean => {
    if (!filter) return true
    const q = filter.query.trim().toLowerCase()
    const tagOk =
      filter.tags.size === 0 ||
      d.entry.tags.some((t) => filter.tags.has(canonicalTag(t)))
    if (!tagOk) return false
    if (!q) return true
    return (
      d.entry.title.toLowerCase().includes(q) ||
      d.entry.text.toLowerCase().includes(q) ||
      d.entry.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  const toLocal = (e: React.MouseEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block h-auto w-full"
        role="list"
        aria-label="田块卡片地图"
      >
        <PatternDefs />
        {plots.map((p, i) => {
          const d = displayOf(p)
          return (
            <g
              key={p.id}
              role="listitem"
              aria-label={`田块 ${d.code}`}
              data-zone={p.zone}
              data-code={d.code}
              className={`plot-g plot-in ${hover?.plot.id === p.id ? 'is-hover' : ''} ${
                active?.id === p.id ? 'is-lifted' : ''
              } ${pulseId === p.id ? 'grow-pulse' : ''} ${
                matchesFilter(d) ? '' : 'plot-filtered-out'
              }`}
              style={{ animationDelay: `${(i % 9) * 110}ms` }}
              onMouseMove={(e) => {
                const pt = toLocal(e)
                beginHover(p, pt.x, pt.y)
              }}
              onMouseLeave={endHover}
              onClick={() => setActive(p)}
            >
              {/* 静态命中层：接收所有指针事件，不随视觉上浮 */}
              <polygon className="plot-hit" points={p.points} />
              {/* 视觉层：hover 时整体上浮，不参与命中 */}
              <g className="plot-visual">
                <polygon className="plot" points={p.points} fill={d.fill} />
                {p.pattern !== 'solid' && (
                  <polygon
                    points={p.points}
                    fill={patternUrl(p)}
                    className="pointer-events-none"
                  />
                )}
                {p.showLabel && (
                  <text
                    className="plot-text"
                    x={p.cx}
                    y={p.cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={p.strokeLight ? '#ffffff' : '#1b5536'}
                  >
                    {d.code}
                  </text>
                )}
              </g>
            </g>
          )
        })}

        {/* 降雨波 */}
        {rains.map((r) => (
          <RainWave
            key={r.id}
            waveId={r.id}
            plot={r.plot}
            onDone={removeWave}
          />
        ))}
      </svg>

      {/* 悬停预览：整个卡片位于田块右侧并垂直居中，箭头指向田块 */}
      {hover && !active &&
        (() => {
          // 基于田块的屏幕坐标 fixed 定位：完全不参与文档流，
          // 避免预览盒溢出视口产生滚动条 → 页面宽度收缩 → 田块移位 → 悬停振荡的 bug
          const code = displayOf(hover.plot).code
          const hitEl = svgRef.current?.querySelector<SVGGElement>(
            `g[aria-label="田块 ${code}"] polygon.plot-hit`,
          )
          const r = hitEl?.getBoundingClientRect()
          if (!r) return null
          return (
            <div
              className="pointer-events-none fixed z-30"
              style={{ left: r.right, top: r.top + r.height / 2 }}
            >
              <HoverPreview
                plot={displayOf(hover.plot)}
                growing={pulseId === hover.plot.id}
              />
            </div>
          )
        })()}

      {active &&
        createPortal(
          <FieldModal plot={displayOf(active)} onClose={() => setActive(null)} />,
          document.body,
        )}
    </div>
  )
}
