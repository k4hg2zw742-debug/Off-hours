import { useSyncExternalStore } from 'react'
import type { Draft } from './prefs'

/* Storage can be unavailable (private mode, blocked cookies). Everything degrades to memory. */
function safeGet(store: 'local' | 'session', key: string): string | null {
  try {
    return (store === 'local' ? window.localStorage : window.sessionStorage).getItem(key)
  } catch {
    return null
  }
}
function safeSet(store: 'local' | 'session', key: string, value: string) {
  try {
    ;(store === 'local' ? window.localStorage : window.sessionStorage).setItem(key, value)
  } catch {
    /* ignore */
  }
}

function createStore<T>(store: 'local' | 'session', key: string, fallback: T) {
  let value: T = fallback
  try {
    const raw = safeGet(store, key)
    if (raw) value = JSON.parse(raw) as T
  } catch {
    value = fallback
  }
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next: T) {
      value = next
      safeSet(store, key, JSON.stringify(next))
      listeners.forEach((l) => l())
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

/* ---------- Saved guides ---------- */

const saved = createStore<string[]>('local', 'offhours.saved', [])

export function useSaved() {
  const ids = useSyncExternalStore(saved.subscribe, saved.get, saved.get)
  return {
    ids,
    isSaved: (id: string) => ids.includes(id),
    toggle(id: string) {
      const cur = saved.get()
      saved.set(cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur])
    },
    remove(id: string) {
      saved.set(saved.get().filter((x) => x !== id))
    },
  }
}

/* ---------- Answers in progress ---------- */

const draft = createStore<Draft>('session', 'offhours.draft', {})

export function useDraft() {
  const value = useSyncExternalStore(draft.subscribe, draft.get, draft.get)
  return {
    draft: value,
    update(patch: Draft) {
      draft.set({ ...draft.get(), ...patch })
    },
    replace(next: Draft) {
      draft.set(next)
    },
  }
}

export const getDraft = draft.get
export const setDraft = draft.set

/* ---------- Suggestions already seen (per set of preferences) ---------- */

const seen = createStore<Record<string, string[]>>('session', 'offhours.seen', {})

export function getSeen(key: string): string[] {
  return seen.get()[key] ?? []
}
export function markSeen(key: string, ids: string[]) {
  const all = seen.get()
  const cur = all[key] ?? []
  const next = [...cur.filter((x) => !ids.includes(x)), ...ids]
  seen.set({ ...all, [key]: next })
}

/* ---------- Where "back to results" should go ---------- */

const lastResults = createStore<string | null>('session', 'offhours.lastResults', null)

export function useLastResults() {
  return useSyncExternalStore(lastResults.subscribe, lastResults.get, lastResults.get)
}
export const setLastResults = lastResults.set
