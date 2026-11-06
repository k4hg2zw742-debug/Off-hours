import { activities } from '../data/activities'
import type { Activity, BudgetChoice, Company, Mood, TimeChoice } from '../data/types'
import { budgetLabel, companyLabel, formatMinutes, moodLabel, timeLabel, timePhrase } from './labels'
import type { Prefs } from './prefs'

/* ------------------------------------------------------------------ *
 * Deterministic matching.
 *
 * Hard constraints (never broken): setting, available time, budget.
 * Soft ranking: mood first, then company, then how well the activity
 * fills the time available. Ties are broken by a stable hash so the
 * same answers always produce the same suggestions.
 * ------------------------------------------------------------------ */

export const budgetCap = (b: BudgetChoice) => (b === null ? Infinity : b)

export function passesHard(a: Activity, p: Prefs): boolean {
  if (p.setting !== 'surprise' && a.setting !== p.setting) return false
  if (a.minutes.min > p.time) return false
  if (a.cost.low > budgetCap(p.budget)) return false
  return true
}

export const moodFits = (a: Activity, m: Mood) => a.moods.includes(m)
export const companyFits = (a: Activity, c: Company) => a.company.includes(c)
export const isFullMatch = (a: Activity, p: Prefs) => passesHard(a, p) && moodFits(a, p.mood) && companyFits(a, p.company)

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

export function score(a: Activity, p: Prefs): number {
  let s = 0
  const moodIndex = a.moods.indexOf(p.mood)
  if (moodIndex === 0) s += 40
  else if (moodIndex > 0) s += 30 - moodIndex * 2

  if (companyFits(a, p.company)) s += 25 - a.company.indexOf(p.company) * 1.5
  else s -= 20

  // Time fit: reward activities whose natural length uses the time well.
  if (a.minutes.ideal <= p.time) {
    const usage = a.minutes.max >= p.time ? 1 : a.minutes.max / p.time
    s += 14 * Math.sqrt(usage)
  } else {
    s += 6 // works in its shorter form
  }

  // A small, stable variation so ties do not always resolve alphabetically.
  s += hash(`${a.id}|${p.mood}|${p.company}|${p.time}`) * 4
  return s
}

/** All activities that pass the hard constraints, best first. */
export function rank(p: Prefs): Activity[] {
  return activities
    .filter((a) => passesHard(a, p))
    .map((a) => ({ a, s: score(a, p) }))
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a)
}

/** Pick the opening three, with some variety in setting and primary mood. */
export function pickInitial(p: Prefs, count = 3): Activity[] {
  const ranked = rank(p)
  const picked: Activity[] = []
  const take = (a: Activity) => {
    if (picked.length < count && !picked.includes(a)) picked.push(a)
  }

  const full = ranked.filter((a) => isFullMatch(a, p))

  if (p.setting === 'surprise') {
    // Make sure "surprise me" shows both sides where it can, full matches first.
    // Mixing never displaces a full match.
    const pool = full.length >= count ? full : ranked
    const best = (s: 'in' | 'out') => pool.find((a) => a.setting === s)
    const order = [pool[0], best('in'), best('out')].filter(Boolean) as Activity[]
    order.forEach(take)
  }

  // Prefer full matches of different kinds (not three walks), then fill with anything that fits.
  for (const a of full) {
    if (!picked.some((x) => x.kind === a.kind)) take(a)
  }
  for (const a of full) take(a)
  for (const a of ranked) take(a)

  // Present full matches first.
  return picked.sort((x, y) => Number(isFullMatch(y, p)) - Number(isFullMatch(x, p)))
}

/* ---------------------------- Swapping ---------------------------- */

export type SwapResult =
  | { kind: 'swapped'; next: Activity; recycled: boolean }
  | { kind: 'none' }

/**
 * Replace one visible suggestion. Never returns something already visible;
 * prefers activities not yet seen this session, and never the one just removed
 * when an alternative exists.
 */
export function swap(p: Prefs, visible: string[], outgoing: string, seen: string[]): SwapResult {
  const pool = rank(p).filter((a) => !visible.includes(a.id))
  if (pool.length === 0) return { kind: 'none' }
  const fresh = pool.filter((a) => !seen.includes(a.id))
  if (fresh.length) return { kind: 'swapped', next: fresh[0], recycled: false }
  // Everything has been seen: cycle back, oldest first, but not the one just removed.
  const notOutgoing = pool.filter((a) => a.id !== outgoing)
  if (notOutgoing.length === 0) return { kind: 'none' }
  const order = (id: string) => seen.indexOf(id)
  const next = [...notOutgoing].sort((x, y) => order(x.id) - order(y.id))[0]
  return { kind: 'swapped', next, recycled: true }
}

/* ------------------------- Explanations ------------------------- */

const moodReason: Record<Mood, string> = {
  relaxed: 'Unhurried and restful, which suits a relaxed mood.',
  active: 'Gets you moving, as you asked.',
  creative: 'Hands-on and creative.',
  social: 'Built around time with other people.',
  different: 'A genuine change from the usual.',
}

const moodShortfall: Record<Mood, string> = {
  relaxed: 'More effort than a truly relaxed choice.',
  active: 'Not especially active.',
  creative: 'Not a particularly creative choice.',
  social: 'Not especially social.',
  different: 'A familiar idea rather than something different.',
}

const companyReason: Record<Company, string> = {
  solo: 'Works well on your own.',
  partner: 'Good for two.',
  friends: 'Works well with a group of friends.',
  family: 'Suits a family, including younger ones.',
}

const companyShortfall: Record<Company, string> = {
  solo: 'Better with company, though you can do it alone.',
  partner: 'Usually better solo or in a bigger group.',
  friends: 'Better suited to one or two people than a group.',
  family: 'Better suited to adults than a family outing.',
}

export interface Reasoning {
  fits: string[]
  caveats: string[]
}

export function explain(a: Activity, p: Prefs): Reasoning {
  const fits: string[] = []
  const caveats: string[] = []

  // Time — always accurate about what fits.
  if (a.minutes.ideal <= p.time) {
    const spare = p.time - a.minutes.ideal
    fits.push(
      spare >= p.time / 2 && a.minutes.max < p.time
        ? `Takes about ${formatMinutes(a.minutes.ideal)}, leaving plenty of ${timePhrase(p.time)} spare.`
        : `Takes about ${formatMinutes(a.minutes.ideal)}, so it fits ${timePhrase(p.time)}.`,
    )
  } else {
    fits.push(`A shorter version fits ${timePhrase(p.time)}: allow at least ${formatMinutes(a.minutes.min)}.`)
  }

  // Budget — never silently exceeded.
  const cap = budgetCap(p.budget)
  if (a.cost.high === 0) fits.push('Costs nothing.')
  else if (cap === Infinity) fits.push(`Roughly £${a.cost.low}–£${a.cost.high} per person.`)
  else if (a.cost.high <= cap) fits.push(`Roughly £${a.cost.low}–£${a.cost.high} per person, within ${p.budget === 0 ? 'budget' : `your ${budgetLabel(p.budget).toLowerCase()}`}.`)
  else
    caveats.push(
      a.cost.low === 0
        ? `Can be free, but it can cost up to £${a.cost.high}. ${a.thrifty ?? ''}`.trim()
        : `Can be done for about £${a.cost.low}, but it can reach £${a.cost.high}. ${a.thrifty ?? ''}`.trim(),
    )

  if (moodFits(a, p.mood)) fits.push(moodReason[p.mood])
  else caveats.push(`${moodShortfall[p.mood]} It is here because it fits your time and budget.`)

  if (companyFits(a, p.company)) fits.push(companyReason[p.company])
  else caveats.push(companyShortfall[p.company])

  return { fits, caveats }
}

/* --------------------- Suggesting an adjustment --------------------- */

export interface Adjustment {
  label: string
  detail: string
  prefs: Prefs
  gain: number
  /** True when the extra ideas fit time and budget but not every preference. */
  partial?: boolean
}

const TIME_STEPS: TimeChoice[] = [30, 60, 120, 240, 480]
const BUDGET_STEPS: BudgetChoice[] = [0, 10, 25, null]

const fullCount = (p: Prefs) => rank(p).filter((a) => isFullMatch(a, p)).length

/**
 * When fewer than three ideas fit everything, find the single change that
 * opens up the most full matches. Company is treated as a fact, not a preference.
 */
export function suggestAdjustment(p: Prefs): Adjustment | null {
  const base = fullCount(p)
  const options: Omit<Adjustment, 'gain'>[] = []

  if (p.setting !== 'surprise') {
    options.push({
      label: p.setting === 'in' ? 'Include going out' : 'Include staying in',
      detail: p.setting === 'in' ? 'Open the search to outings as well as ideas at home' : 'Open the search to ideas at home as well as outings',
      prefs: { ...p, setting: 'surprise' },
    })
  }
  for (const m of ['relaxed', 'active', 'creative', 'social', 'different'] as Mood[]) {
    if (m !== p.mood) options.push({ label: `Try “${moodLabel(m)}”`, detail: `Switch mood from ${moodLabel(p.mood).toLowerCase()} to ${moodLabel(m).toLowerCase()}`, prefs: { ...p, mood: m } })
  }
  const ti = TIME_STEPS.indexOf(p.time)
  if (ti < TIME_STEPS.length - 1) {
    const t = TIME_STEPS[ti + 1]
    options.push({ label: `Allow ${timeLabel(t).toLowerCase()}`, detail: `Extend your time from ${timeLabel(p.time).toLowerCase()} to ${timeLabel(t).toLowerCase()}`, prefs: { ...p, time: t } })
  }
  const bi = BUDGET_STEPS.indexOf(p.budget)
  if (bi < BUDGET_STEPS.length - 1) {
    const b = BUDGET_STEPS[bi + 1]
    options.push({ label: `Raise budget to ${budgetLabel(b).toLowerCase()}`, detail: `Move from ${budgetLabel(p.budget).toLowerCase()} to ${budgetLabel(b).toLowerCase()} per person`, prefs: { ...p, budget: b } })
  }

  let best: Adjustment | null = null
  for (const o of options) {
    const gain = fullCount(o.prefs) - base
    if (gain > 0 && (!best || gain > best.gain)) best = { ...o, gain }
  }
  if (best) return best

  // Nothing improves the full matches: fall back to whatever widens the pool at all.
  const hardBase = rank(p).length
  for (const o of options) {
    if (o.prefs.mood !== p.mood) continue // mood does not change the hard constraints
    const gain = rank(o.prefs).length - hardBase
    if (gain > 0 && (!best || gain > best.gain)) best = { ...o, gain }
  }
  return best ? { ...best, partial: true } : null
}

export function summarise(p: Prefs): string[] {
  const parts = [
    p.setting === 'in' ? 'Staying in' : p.setting === 'out' ? 'Going out' : 'In or out',
    timeLabel(p.time),
    companyLabel(p.company),
    budgetLabel(p.budget),
    moodLabel(p.mood),
  ]
  if (p.setting !== 'in' && p.location) parts.push(p.location)
  return parts
}
