// 喜欢按钮（Transitions.dev Like button 结构）
import { useEffect, useRef, useState } from 'react'
import { isLiked, toggleLike } from '@/data/likes'
import type { ArchiveEntry } from '@/data/archive'

/** 每次点赞生成 8 个有机喷射方向的粒子参数 */
function particleVars(i: number): Record<string, string> {
  const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.6
  const dist = 14 + Math.random() * 10
  return {
    '--px': `${Math.cos(angle) * dist}px`,
    '--py': `${Math.sin(angle) * dist}px`,
    '--pdur': `${520 + Math.random() * 260}ms`,
    '--pdelay': `${Math.random() * 60}ms`,
    '--p-end-scale': `${0.4 + Math.random() * 0.4}`,
    '--psize': `${0.8 + Math.random() * 0.7}`,
  }
}

export default function LikeButton({
  entry,
  size = 18,
}: {
  entry: ArchiveEntry
  size?: number
}) {
  const [liked, setLiked] = useState(() => isLiked(entry))
  const [bursting, setBursting] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onClick = () => {
    const now = toggleLike(entry)
    setLiked(now)
    if (now) {
      setBursting(true)
      timer.current = window.setTimeout(() => setBursting(false), 800)
    }
  }

  return (
    <button
      type="button"
      className={`t-like ${bursting ? 'is-bursting' : ''}`}
      data-liked={liked}
      aria-pressed={liked}
      aria-label={liked ? '取消喜欢' : '喜欢这张卡片'}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <span className="t-like-icon">
        <svg
          className="t-like-heart"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6Z" />
        </svg>
      </span>
      <span className="t-like-particles" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} style={particleVars(i)} />
        ))}
      </span>
    </button>
  )
}
