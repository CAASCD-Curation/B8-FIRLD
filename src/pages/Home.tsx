import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import CloudLayer from '@/components/Clouds'
import FieldMap from '@/components/FieldMap'
import TopoBg from '@/components/TopoBg'
import CursorFX from '@/components/CursorFX'
import { zoneSwatch, type ZoneId } from '@/data/fields'
import { TOTAL_ENTRIES, ZONE_CATEGORY } from '@/data/cards'
import { ARCHIVES } from '@/data/archive'
import { canonicalTag, TAG_GROUPS } from '@/data/tagGroups'
import LikeButton from '@/components/LikeButton'
import { likedEntries, useLikes } from '@/data/likes'
import pixelTian from '@/assets/pixel-7530.png'
import pixelYe from '@/assets/pixel-91ce.png'
import pixelMen from '@/assets/pixel-4eec.png'
import '../App.css'

// 图例：四个象限的代表色 + 分类名称（按阅读顺序）
const QUADRANTS: ZoneId[] = ['A', 'B', 'C', 'D']

// 像素字直接以彩色 PNG + image-rendering:pixelated 显示（mask 缩放会发虚）
const glyph = (extra: CSSProperties = {}): CSSProperties => ({
  display: 'inline-block',
  height: '1em',
  width: 'auto',
  marginRight: '0.08em',
  imageRendering: 'pixelated',
  ...extra,
})

// 左下角喜欢按钮上的数量角标（实时订阅喜欢状态）
function LikeCountBadge() {
  const likes = useLikes()
  if (likes.size === 0) return null
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f40051] px-1 text-[9px] font-semibold leading-none text-white">
      {likes.size}
    </span>
  )
}

// 「我喜欢的卡片」合集：缩略图 + 标题 + 出处，可再次点爱心取消
function LikesCollection() {
  useLikes() // 订阅喜欢状态变化，取消喜欢时实时从列表移除
  const entries = likedEntries()
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-emerald-900/50">
        还没有喜欢的卡片。
        <br />
        点开任意田块，在详情页点一下爱心就收藏到这里啦。
      </p>
    )
  }
  return (
    <ul className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
      {entries.map((e) => (
        <li
          key={`${e.title}｜${e.section}｜${e.source}`}
          className="flex items-center gap-3 rounded-xl border border-emerald-50 bg-emerald-50/30 p-2.5"
        >
          {e.image ? (
            <img
              src={e.image}
              alt={e.title}
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <span className="h-12 w-12 shrink-0 rounded-lg bg-emerald-100" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-emerald-950">
              {e.title}
            </p>
            <p className="truncate text-[10px] text-emerald-900/50">
              {e.section}
              {e.era ? ` ／ ${e.era}` : ''}
            </p>
          </div>
          <LikeButton entry={e} size={16} />
        </li>
      ))}
    </ul>
  )
}

export default function Home() {
  const total = TOTAL_ENTRIES
  const tagCount = useMemo(
    () =>
      new Set(
        (Object.keys(ARCHIVES) as (keyof typeof ARCHIVES)[]).flatMap((c) =>
          ARCHIVES[c].flatMap((e) => e.tags),
        ),
      ).size,
    [],
  )

  // 开屏转场：品牌图形（四色方块 + 字标）错落浮现 → 四色幕布上下交替掀起，渐次露出主页
  const [phase, setPhase] = useState<'loading' | 'curtain' | 'done'>('loading')
  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('curtain'), 1150)
    const t2 = window.setTimeout(() => setPhase('done'), 2350)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  // 顶部导航栏：默认隐藏，鼠标置于页面最上方时拉出
  const [navOpen, setNavOpen] = useState(false)

  // 左下角工具栏：搜索 / 帮助 / 筛选（搜索与筛选实时作用于田块）
  const [dockModal, setDockModal] = useState<null | 'search' | 'help' | 'filter' | 'likes'>(
    null,
  )
  const [query, setQuery] = useState('')
  const [selTags, setSelTags] = useState<Set<string>>(new Set())
  // 筛选弹窗内的标签搜索词（用于从大量标签中快速定位）
  const [tagQuery, setTagQuery] = useState('')
  const filter = useMemo(() => ({ query, tags: selTags }), [query, selTags])
  // 合并相似标签（包含关系归组）后的代表词列表
  const ALL_TAGS = useMemo(
    () =>
      Array.from(
        new Set(
          (Object.keys(ARCHIVES) as (keyof typeof ARCHIVES)[]).flatMap((c) =>
            ARCHIVES[c].flatMap((e) => e.tags.map(canonicalTag)),
          ),
        ),
      ).sort(),
    [],
  )
  useEffect(() => {
    if (!dockModal) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDockModal(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dockModal])

  // 背景鼠标视差：背景层大幅移动、背景字小幅跟随，rAF 平滑插值
  const bgRef = useRef<HTMLDivElement | null>(null)
  const bgTextRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const target = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }
    let raf = 0
    const onMove = (e: MouseEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5
      target.y = e.clientY / window.innerHeight - 0.5
    }
    const loop = () => {
      cur.x += (target.x - cur.x) * 0.05
      cur.y += (target.y - cur.y) * 0.05
      if (bgRef.current)
        bgRef.current.style.transform = `translate3d(${(-cur.x * 24).toFixed(2)}px, ${(-cur.y * 16).toFixed(2)}px, 0)`
      if (bgTextRef.current)
        bgTextRef.current.style.transform = `translate3d(${(-cur.x * 10).toFixed(2)}px, ${(-cur.y * 6).toFixed(2)}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      {phase !== 'done' && (
        <div className="loader-overlay" aria-hidden="true">
          {phase === 'loading' && (
            <div className="loader-brand">
              <div className="loader-mark">
                {QUADRANTS.map((z, i) => (
                  <span
                    key={z}
                    className="loader-tile"
                    style={{
                      backgroundColor: zoneSwatch(z),
                      animationDelay: `${0.1 + i * 0.13}s`,
                    }}
                  />
                ))}
              </div>
              <span className="loader-line" style={{ animationDelay: '0.85s' }} />
            </div>
          )}
          {phase === 'curtain' && (
            <div className="loader-curtain">
              {QUADRANTS.map((z, i) => (
                <span
                  key={z}
                  className="loader-strip"
                  style={{
                    backgroundColor: zoneSwatch(z),
                    animationDelay: `${i * 0.09}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {phase !== 'loading' && (
        <div className="cursor-none-all min-h-screen bg-white text-emerald-950">
      {/* 自定义鼠标指针（绿箭头 / 水滴）+ 拖尾 */}
      <CursorFX />
      {/* 最底层背景：坐标网格 + 蜿蜒路径 + 场地轮廓 + 左下角密集等高线（视差） */}
      <div ref={bgRef} className="absolute inset-0 will-change-transform">
        <TopoBg />
      </div>
      {/* 背景装饰大字（底层之上）：像素字「田野们」，田=图例2色且单独上浮；
          延迟 1s 浮现；小幅视差跟随 */}
      <div
        ref={bgTextRef}
        aria-hidden="true"
        className="rise-in pointer-events-none absolute inset-x-0 top-[87px] z-0 select-none leading-none"
        style={{ animationDelay: '1s' }}
      >
        <div className="mx-auto ml-[14vw] max-w-[1200px] px-6">
          <div style={{ fontSize: 'clamp(52px, 7.5vw, 100px)' }}>
            <img
              src={pixelTian}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={glyph({
                height: '1.06em',
                transform: 'translateY(-0.12em)',
              })}
            />
            <img
              src={pixelYe}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={glyph()}
            />
            <img
              src={pixelMen}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={glyph()}
            />
          </div>
          <div
            className="pl-1 font-extrabold tracking-[0.12em] text-gray-200"
            style={{
              fontFamily: '"Arial Black","Microsoft YaHei",sans-serif',
              fontSize: 'clamp(24px, 3.2vw, 42px)',
            }}
          >
            FIELDS
          </div>
        </div>
      </div>
      {/* 左下角磨砂玻璃工具图标：搜索 / 帮助 / 筛选 */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-3">
        <button
          type="button"
          aria-label="搜索卡片"
          onClick={() => setDockModal('search')}
          className="rounded-2xl border border-white/70 bg-white/55 p-3 shadow-lg shadow-emerald-950/10 backdrop-blur-md transition hover:bg-gray-200/70"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3f6b52"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.6-3.6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="使用帮助"
          onClick={() => setDockModal('help')}
          className="rounded-2xl border border-white/70 bg-white/55 p-3 shadow-lg shadow-emerald-950/10 backdrop-blur-md transition hover:bg-gray-200/70"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3f6b52"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.4 9.2a2.7 2.7 0 1 1 3.9 2.4c-.9.5-1.3 1-1.3 1.9" />
            <circle cx="12" cy="17" r="0.6" fill="#3f6b52" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="按标签筛选"
          onClick={() => setDockModal('filter')}
          className="rounded-2xl border border-white/70 bg-white/55 p-3 shadow-lg shadow-emerald-950/10 backdrop-blur-md transition hover:bg-gray-200/70"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3f6b52"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 7h16M7 12h10M10 17h4" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="我喜欢的卡片"
          onClick={() => setDockModal('likes')}
          className="relative rounded-2xl border border-white/70 bg-white/55 p-3 shadow-lg shadow-emerald-950/10 backdrop-blur-md transition hover:bg-gray-200/70"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3f6b52"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6Z" />
          </svg>
          <LikeCountBadge />
        </button>
      </div>

      {/* 工具弹窗：搜索 / 帮助 / 筛选（浅灰蒙版，不模糊） */}
      {dockModal && (
        <div
          className="fixed inset-0 z-[45] flex items-center justify-center bg-black/20 p-4"
          onClick={() => setDockModal(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-emerald-950/20"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-emerald-950">
                {dockModal === 'search'
                  ? '搜索卡片'
                  : dockModal === 'help'
                    ? '使用提示'
                    : dockModal === 'filter'
                      ? '按标签筛选'
                      : '我喜欢的卡片'}
              </h3>
              <button
                onClick={() => setDockModal(null)}
                aria-label="关闭"
                className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-800/60 transition hover:bg-emerald-50 hover:text-emerald-800"
              >
                ✕
              </button>
            </div>

            {dockModal === 'search' && (
              <div className="space-y-3">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索你感兴趣的卡片"
                  className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-2.5 text-sm text-emerald-950 outline-none transition placeholder:text-gray-400 focus:border-[#95d372] focus:bg-white"
                />
                <p className="text-[11px] text-emerald-900/50">
                  输入关键词，田块会实时只展示匹配的卡片
                </p>
              </div>
            )}

            {dockModal === 'help' && (
              <ol className="list-decimal space-y-2.5 pl-5 text-[13px] leading-relaxed text-emerald-950/80">
                <li>在田块上滑动滚轮，引发降雨。</li>
                <li>每 2 次降雨会使田块成长。</li>
                <li>以此获取新的卡片内容！</li>
              </ol>
            )}

            {dockModal === 'likes' && <LikesCollection />}

            {dockModal === 'filter' && (
              <div className="space-y-3">
                <input
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  placeholder="输入关键词定位标签"
                  className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-2 text-xs text-emerald-950 outline-none transition placeholder:text-gray-400 focus:border-[#95d372] focus:bg-white"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-emerald-900/50">
                    已选 {selTags.size} 个标签
                    {selTags.size > 0
                      ? '，田块仅展示匹配内容'
                      : `，共 ${ALL_TAGS.length} 个（相似标签已合并）`}
                  </p>
                  {selTags.size > 0 && (
                    <button
                      className="text-[11px] text-[#95d372] transition hover:underline"
                      onClick={() => setSelTags(new Set())}
                    >
                      清除全部
                    </button>
                  )}
                </div>
                <div className="flex h-72 flex-wrap content-start gap-1.5 overflow-y-auto rounded-xl border border-emerald-50 bg-emerald-50/30 p-3">
                  {ALL_TAGS.filter(
                    (t) =>
                      !tagQuery.trim() || t.includes(tagQuery.trim()),
                  ).map((t) => {
                    const on = selTags.has(t)
                    const groupSize = TAG_GROUPS[t]?.length ?? 1
                    return (
                      <button
                        key={t}
                        onClick={() =>
                          setSelTags((s) => {
                            const n = new Set(s)
                            if (on) n.delete(t)
                            else n.add(t)
                            return n
                          })
                        }
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                          on
                            ? 'border-[#95d372] bg-[#95d372]/15 text-emerald-900'
                            : 'border-emerald-100 bg-white text-emerald-900/60 hover:border-[#95d372]/60'
                        }`}
                      >
                        {t}
                        {groupSize > 1 && (
                          <span className="ml-1 text-[9px] text-emerald-900/40">
                            ×{groupSize}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 顶部悬停热区：鼠标移到网页最上方时拉出导航栏 */}
      <div
        className="fixed inset-x-0 top-0 z-[60] h-4"
        onMouseEnter={() => setNavOpen(true)}
        aria-hidden="true"
      />
      {/* 导航栏收起时的小箭头提示（无圆背景，仅箭头） */}
      {!navOpen && (
        <button
          type="button"
          aria-label="展开导航栏"
          onClick={() => setNavOpen(true)}
          onMouseEnter={() => setNavOpen(true)}
          className="fixed left-1/2 top-1.5 z-[61] -translate-x-1/2 p-1 opacity-75 transition hover:opacity-100"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#95d372"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 14 6-6 6 6" />
          </svg>
        </button>
      )}
      {/* 顶部导航栏：初始隐藏，鼠标置于页面最上方时从上往下拉出；
          蒙版不覆盖 */}
      <header
        onMouseLeave={() => setNavOpen(false)}
        className={`fixed inset-x-0 top-0 z-50 bg-white shadow-[0_2px_12px_rgba(20,60,40,0.08)] transition-transform duration-300 ease-out ${navOpen ? 'translate-y-0' : '-translate-y-full pointer-events-none'}`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {/* logo：图例四色的 2×2 方块 */}
            <div className="grid grid-cols-2 gap-[3px]" aria-hidden="true">
              {QUADRANTS.map((z) => (
                <span
                  key={z}
                  className="h-[17px] w-[17px] rounded-[4px] shadow-sm"
                  style={{ backgroundColor: zoneSwatch(z) }}
                />
              ))}
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-wide">
                田野们·FIELDS
              </h1>
              <p className="text-xs tracking-[0.25em] text-[#95d372]">
                卡片资料档案
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-6 font-mono text-[11px] tracking-widest text-emerald-600 sm:flex">
            <span>
              档案 <span className="text-emerald-600">{total}</span>
            </span>
            <span>
              标签 <span className="text-emerald-600">{tagCount}</span>
            </span>
          </div>
        </div>
      </header>

      {/* 主视觉：田块拼贴地图（左 70%）+ 图例（右下角），整体下移 30% */}
      <main
        className="relative mx-auto max-w-[1200px] px-6"
        style={{ marginTop: '20.3vh' }}
      >
        {/* 云层：覆盖整个页面居中 70% 区域，图层在田块之上（不拦截鼠标）；
            顶部裁切 96px，避免遮挡「田野们」背景字 */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-[70vw] -translate-x-1/2"
          style={{ clipPath: 'inset(96px 0 0 0)' }}
        >
          <CloudLayer />
        </div>
        <div className="rise-in flex" style={{ animationDelay: '0.08s' }}>
          <div className="min-w-0" style={{ width: '70%' }}>
            <FieldMap filter={filter} />
          </div>
          <aside
            className="flex w-[30%] items-end justify-end pb-4"
            aria-label="图例"
            style={{ transform: 'translate(20px, 47px)' }}
          >
            <ul
              className="rise-in space-y-2.5 text-[10px] tracking-wide"
              style={{ animationDelay: '0.16s' }}
            >
              {QUADRANTS.map((zone) => (
                <li
                  key={zone}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <span
                    className="h-3 w-3 rounded-[4px] shadow-sm"
                    style={{ backgroundColor: zoneSwatch(zone) }}
                  />
                  <span className="text-[#95d372]">
                    {ZONE_CATEGORY[zone]}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
        </div>
      )}
    </>
  )
}
