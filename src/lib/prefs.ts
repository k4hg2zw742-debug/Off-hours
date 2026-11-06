import type { BudgetChoice, Company, Mood, SettingChoice, TimeChoice } from '../data/types'

export interface Prefs {
  setting: SettingChoice
  location: string
  time: TimeChoice
  company: Company
  budget: BudgetChoice
  mood: Mood
}

export type Draft = Partial<Prefs>

export type StepId = 'setting' | 'location' | 'time' | 'company' | 'budget' | 'mood'

export function stepsFor(setting: SettingChoice | undefined): StepId[] {
  const withLocation = setting === 'out' || setting === 'surprise'
  return withLocation
    ? ['setting', 'location', 'time', 'company', 'budget', 'mood']
    : ['setting', 'time', 'company', 'budget', 'mood']
}

export function isComplete(d: Draft): d is Prefs {
  return (
    d.setting !== undefined &&
    d.time !== undefined &&
    d.company !== undefined &&
    d.budget !== undefined &&
    d.mood !== undefined
  )
}

/* ---------- URL encoding (results are shareable and survive refresh) ---------- */

const SETTINGS: SettingChoice[] = ['in', 'out', 'surprise']
const TIMES: TimeChoice[] = [30, 60, 120, 240, 480]
const COMPANIES: Company[] = ['solo', 'partner', 'friends', 'family']
const MOODS: Mood[] = ['relaxed', 'active', 'creative', 'social', 'different']

export function budgetToParam(b: BudgetChoice): string {
  return b === null ? 'any' : b === 0 ? 'free' : String(b)
}

function budgetFromParam(v: string | null): BudgetChoice | undefined {
  if (v === 'any') return null
  if (v === 'free') return 0
  if (v === '10') return 10
  if (v === '25') return 25
  return undefined
}

export function prefsToSearch(p: Prefs, show?: string[]): string {
  const q = new URLSearchParams()
  q.set('setting', p.setting)
  if (p.setting !== 'in' && p.location.trim()) q.set('where', p.location.trim())
  q.set('time', String(p.time))
  q.set('with', p.company)
  q.set('budget', budgetToParam(p.budget))
  q.set('mood', p.mood)
  if (show && show.length) q.set('show', show.join(','))
  return `?${q.toString()}`
}

export function prefsFromSearch(search: URLSearchParams): { prefs: Prefs | null; show: string[] } {
  const setting = search.get('setting') as SettingChoice
  const time = Number(search.get('time')) as TimeChoice
  const company = search.get('with') as Company
  const budget = budgetFromParam(search.get('budget'))
  const mood = search.get('mood') as Mood
  const show = (search.get('show') ?? '').split(',').filter(Boolean)
  if (
    !SETTINGS.includes(setting) ||
    !TIMES.includes(time) ||
    !COMPANIES.includes(company) ||
    budget === undefined ||
    !MOODS.includes(mood)
  ) {
    return { prefs: null, show }
  }
  return {
    prefs: { setting, location: setting === 'in' ? '' : (search.get('where') ?? '').slice(0, 60), time, company, budget, mood },
    show,
  }
}

export function prefsKey(p: Prefs): string {
  return [p.setting, p.time, p.company, budgetToParam(p.budget), p.mood].join('|')
}

/* ---------- Location ---------- */

const POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i
const OUTWARD_ONLY = /^[A-Z]{1,2}\d[A-Z\d]?$/i
const PLACE = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' .,&-]{1,48}$/

export type LocationCheck = { ok: true; value: string } | { ok: false; message: string }

export function checkLocation(raw: string): LocationCheck {
  const v = raw.trim().replace(/\s+/g, ' ')
  if (!v) return { ok: false, message: 'Enter a town, city or postcode.' }
  const pc = v.match(POSTCODE)
  if (pc) return { ok: true, value: `${pc[1]} ${pc[2]}`.toUpperCase() }
  if (OUTWARD_ONLY.test(v)) return { ok: true, value: v.toUpperCase() }
  if (/\d/.test(v)) return { ok: false, message: 'That doesn’t look like a UK postcode. Try a format like LS1 4AP, or a town name.' }
  if (PLACE.test(v)) return { ok: true, value: v === v.toLowerCase() ? titleCase(v) : v }
  return { ok: false, message: 'Use letters for a town name, or a UK postcode.' }
}

const SMALL = new Set(['on', 'upon', 'under', 'in', 'by', 'le', 'the', 'of', 'next', 'super', 'and'])

function titleCase(v: string): string {
  return v
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part, i) => (i > 0 && SMALL.has(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('-'),
    )
    .join(' ')
}
