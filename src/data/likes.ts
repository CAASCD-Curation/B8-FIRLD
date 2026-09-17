// 卡片喜欢（收藏）状态：localStorage 持久化 + useSyncExternalStore 订阅
import { useSyncExternalStore } from 'react'
import { ARCHIVES, type ArchiveEntry, type Category } from './archive'

const KEY = 'tian-field-likes'

// 卡片唯一键：标题 + 所属分类小节 + 出处（跨田块、成长后仍稳定）
export function likeKey(e: ArchiveEntry): string {
  return `${e.title}｜${e.section}｜${e.source}`
}

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

let likes: Set<string> = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(likes)))
  } catch {
    /* 忽略存储失败 */
  }
}

function emit() {
  listeners.forEach((fn) => fn())
}

export function subscribeLikes(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getLikes(): Set<string> {
  return likes
}

/** 切换喜欢状态，返回切换后是否已喜欢 */
export function toggleLike(e: ArchiveEntry): boolean {
  const k = likeKey(e)
  const next = new Set(likes)
  const liked = !next.has(k)
  if (liked) next.add(k)
  else next.delete(k)
  likes = next
  persist()
  emit()
  return liked
}

export function isLiked(e: ArchiveEntry): boolean {
  return likes.has(likeKey(e))
}

// 键 → 档案条目（供「我喜欢的卡片」合集渲染）
const ENTRY_BY_KEY = new Map<string, ArchiveEntry>()
;(Object.keys(ARCHIVES) as Category[]).forEach((c) =>
  ARCHIVES[c].forEach((e) => ENTRY_BY_KEY.set(likeKey(e), e)),
)

export function likedEntries(): ArchiveEntry[] {
  return Array.from(likes)
    .map((k) => ENTRY_BY_KEY.get(k))
    .filter((e): e is ArchiveEntry => Boolean(e))
}

export function useLikes(): Set<string> {
  return useSyncExternalStore(subscribeLikes, getLikes)
}
