// 自定义鼠标指针：绿色箭头（田块附近变为蓝色水滴）+ 淡绿色简约拖尾
import { useEffect, useRef, useState } from 'react'

const THEME = '#95d372'

function ArrowCursor() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      style={{ marginLeft: -2, marginTop: -2 }}
    >
      <path
        d="M5 2 L5 20.5 L9.6 15.9 L12.6 22.5 L15.4 21.2 L12.4 14.7 L18.6 14.2 Z"
        fill={THEME}
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DropCursor() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      style={{ marginLeft: -3, marginTop: -4 }}
    >
      <path
        d="M12 2.2 C12 2.2 5.4 10.4 5.4 15.2 a6.6 6.6 0 0 0 13.2 0 C18.6 10.4 12 2.2 12 2.2 Z"
        fill="#5ea8f5"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 15.6 a3.4 3.4 0 0 0 2.7 3.3"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}

export default function CursorFX() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const [drop, setDrop] = useState(false)

  useEffect(() => {
    const cur = cursorRef.current
    if (!cur) return
    let lastX = -1
    let lastY = -1
    let lastSpawn = 0
    const onMove = (e: MouseEvent) => {
      cur.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
      const now = performance.now()
      if (
        now - lastSpawn > 45 &&
        (Math.abs(e.clientX - lastX) > 4 || Math.abs(e.clientY - lastY) > 4)
      ) {
        lastSpawn = now
        lastX = e.clientX
        lastY = e.clientY
        const dot = document.createElement('div')
        dot.className = 'cursor-trail-dot'
        dot.style.left = `${e.clientX}px`
        dot.style.top = `${e.clientY}px`
        document.body.appendChild(dot)
        window.setTimeout(() => dot.remove(), 750)
      }
    }
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      setDrop(!!t?.closest?.('.plot-hit'))
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseover', onOver, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      className="pointer-events-none fixed left-0 top-0 z-[100] will-change-transform"
      aria-hidden="true"
    >
      {drop ? <DropCursor /> : <ArrowCursor />}
    </div>
  )
}
