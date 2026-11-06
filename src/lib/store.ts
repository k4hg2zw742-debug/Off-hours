import { useSyncExternalStore } from 'react'
import { getActivity } from '../data/activities'
import type { Draft } from './prefs'

/* ------------------------------------------------------------------ *
 * Browser storage is optional. It can be missing, blocked (private
 * modes, strict cookie settings), full, or hold stale or tampered data.
 * Every read is validated and every failure degrades to in-memory
 * state, so the site always works — it just forgets on reload.
 * ------------------------------------------------------------------ */

type Area = 'local' | 'session'

function area(which: Area): Storage | null {
  try {
    const s = which === 'local' ? window.localStorage : window.sessionStorage
    return s ?? null
  } catch {
    return null
  }
}

function safeGet(which: Area, key: string): string | null {
  try {
    return area(which)?.getItem(key) ?? null
  } catch {
    return null
  }
}

function safeSet(which: Area, key: string, value: string) {
  try {
    area(which)?.setItem(key, value)
  } catch {
    /* quota exceeded or blocked: keep the in-memory value */
  }
}

function safeRemove(which: Area, key: string) {
  try {
    area(which)?.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** Parse and validate; anything malformed is discarded (and cleared) rather than trusted. */
function read<T>(which: Area, key: string, validate: (v: unknown) => T | null, fallback: T): T {
  const raw = safeGet(which, key)
  if (raw === null) return fallback
  try {
    const v = validate(JSON.parse(raw))
    if (v !== null) return v
  } catch {
    /* fall through */
  }
  safeRemove(which, key)
  return fallback
}

function createStore<T>(which: Area, key: string, validate: (v: unknown) => T | null, fallback: T) {
  let value: T = read(which, key, validate, fallback)
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  // Keep tabs in step (localStorage only fires this in *other* tabs).
  if (which === 'local' && typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== key && e.key !== null) return
      value = read(which, key, validate, fallback)
      emit()
    })
  }

  return {
    get: () => value,
    set(next: T) {
      value = next
      safeSet(which, key, JSON.stringify(next))
      emit()
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
  }
}

/* ---------- Validators ---------- */

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

const validSaved = (v: unknown): string[] | null =>
  isStringArray(v) ? [...new Set(v)].filter((id) => !!getActivity(id)).slice(0, 100) : null

const SETTINGS = ['in', 'out', 'surprise']
const TIMES = [30, 60, 120, 240, 480]
const COMPANIES = ['solo', 'partner', 'friends', 'family']
const BUDGETS = [0, 10, 25, null]
const MOODS = ['relaxed', 'active', 'creative', 'social', 'different']

function validDraft(v: unknown): Draft | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  const d: Draft = {}
  if (SETTINGS.includes(o.setting as string)) d.setting = o.setting as Draft['setting']
  if (typeof o.location === 'string') d.location = o.location.slice(0, 60)
  if (TIMES.includes(o.time as number)) d.time = o.time as Draft['time']
  if (COMPANIES.includes(o.company as string)) d.company = o.company as Draft['company']
  if ('budget' in o && BUDGETS.includes(o.budget as number | null)) d.budget = o.budget as Draft['budget']
  if (MOODS.includes(o.mood as string)) d.mood = o.mood as Draft['mood']
  return d
}

function validSeen(v: unknown): Record<string, string[]> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const out: Record<string, string[]> = {}
  for (const [k, ids] of Object.entries(v as Record<string, unknown>)) if (isStringArray(ids)) out[k] = ids.slice(-100)
  return out
}

const validResultsPath = (v: unknown): string | null =>
  v === null ? null : typeof v === 'string' && v.startsWith('/results?') && v.length < 600 ? v : null

/* ---------- Saved guides ---------- */

const saved = createStore<string[]>('local', 'offhours.saved', validSaved, [])

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

const draft = createStore<Draft>('session', 'offhours.draft', validDraft, {})

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

const seen = createStore<Record<string, string[]>>('session', 'offhours.seen', validSeen, {})

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

const lastResults = createStore<string | null>('session', 'offhours.lastResults', validResultsPath, null)

export function useLastResults() {
  return useSyncExternalStore(lastResults.subscribe, lastResults.get, lastResults.get)
}
export const setLastResults = lastResults.set

/** True when saved guides will survive a reload. */
export function persistentStorageAvailable(): boolean {
  try {
    const s = area('local')
    if (!s) return false
    const k = 'offhours.__test'
    s.setItem(k, '1')
    s.removeItem(k)
    return true
  } catch {
    return false
  }
}

/* ---------- Screen-reader announcements ---------- */

const announcer = { text: '', n: 0, listeners: new Set<() => void>() }

/** Announce a status message politely via the app's persistent live region. */
export function announce(text: string) {
  // Alternate a trailing no-break space so repeating the same message is still announced.
  announcer.n++
  announcer.text = announcer.n % 2 ? text : `${text} `
  announcer.listeners.forEach((l) => l())
}

export function useAnnouncement() {
  return useSyncExternalStore(
    (l) => {
      announcer.listeners.add(l)
      return () => {
        announcer.listeners.delete(l)
      }
    },
    () => announcer.text,
    () => announcer.text,
  )
}
