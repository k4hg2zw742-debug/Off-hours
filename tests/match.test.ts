import { existsSync } from 'node:fs'
import { activities } from '../src/data/activities'
import type { BudgetChoice, Company, Mood, SettingChoice, TimeChoice } from '../src/data/types'
import { budgetCap, explain, isFullMatch, passesHard, pickInitial, rank, suggestAdjustment, swap } from '../src/lib/match'
import { checkLocation, prefsFromSearch, prefsToSearch, type Prefs } from '../src/lib/prefs'

let failures = 0
const fail = (m: string) => {
  failures++
  console.error('FAIL', m)
}

// Content checks
const ids = new Set<string>()
for (const a of activities) {
  if (ids.has(a.id)) fail(`duplicate id ${a.id}`)
  ids.add(a.id)
  if (a.steps.length < 4) fail(`${a.id} has few steps`)
  if (a.bring.length < 3) fail(`${a.id} has short bring list`)
  if (a.minutes.min > a.minutes.ideal || a.minutes.ideal > a.minutes.max) fail(`${a.id} minutes out of order`)
  if (a.cost.low > a.cost.high) fail(`${a.id} cost out of order`)
  if (a.setting === 'out' && !a.mapQuery) fail(`${a.id} missing mapQuery`)
  if (a.company.length === 0 || a.moods.length === 0) fail(`${a.id} missing tags`)
  for (const s of ['sm', 'lg']) if (!existsSync(`public/images/${a.image.name}-${s}.jpg`)) fail(`${a.id} missing image ${s}`)
}
const inCount = activities.filter((a) => a.setting === 'in').length
console.log(`${activities.length} activities: ${inCount} in, ${activities.length - inCount} out`)
if (activities.length < 36) fail('fewer than 36 activities')

// Matching checks across every combination
const settings: SettingChoice[] = ['in', 'out', 'surprise']
const times: TimeChoice[] = [30, 60, 120, 240, 480]
const companies: Company[] = ['solo', 'partner', 'friends', 'family']
const budgets: BudgetChoice[] = [0, 10, 25, null]
const moods: Mood[] = ['relaxed', 'active', 'creative', 'social', 'different']
let combos = 0, perfect = 0, short = 0
for (const setting of settings) for (const time of times) for (const company of companies) for (const budget of budgets) for (const mood of moods) {
  combos++
  const p: Prefs = { setting, location: 'York', time, company, budget, mood }
  const tag = JSON.stringify(p)
  const picks = pickInitial(p)
  const all = rank(p)
  if (picks.length !== Math.min(3, all.length)) fail(`${tag} picked ${picks.length}`)
  if (new Set(picks.map((a) => a.id)).size !== picks.length) fail(`${tag} duplicate picks`)
  for (const a of picks) {
    if (a.minutes.min > time) fail(`${tag} ${a.id} exceeds time`)
    if (a.cost.low > budgetCap(budget)) fail(`${tag} ${a.id} exceeds budget`)
    if (setting !== 'surprise' && a.setting !== setting) fail(`${tag} ${a.id} wrong setting`)
    const { fits, caveats } = explain(a, p)
    if (!fits.length) fail(`${tag} no reasons`)
    if (!isFullMatch(a, p) && caveats.length === 0) fail(`${tag} ${a.id} partial without caveat`)
  }
  // Full matches must be preferred when available.
  const fullAvail = all.filter((a) => isFullMatch(a, p)).length
  const fullPicked = picks.filter((a) => isFullMatch(a, p)).length
  if (fullPicked < Math.min(3, fullAvail)) fail(`${tag} picked ${fullPicked} full of ${fullAvail}`)
  if (fullPicked === 3) perfect++
  else {
    short++
    const adj = suggestAdjustment(p)
    if (adj && adj.gain <= 0) fail(`${tag} adjustment with no gain`)
  }
  const fullList = all.filter((a) => isFullMatch(a, p))
  const mixable = fullList.length >= 3 ? fullList : all
  if (setting === 'surprise' && picks.length === 3 && mixable.some((a) => a.setting === 'in') && mixable.some((a) => a.setting === 'out')) {
    if (new Set(picks.map((a) => a.setting)).size < 2) fail(`${tag} surprise not mixed`)
  }
  // Swap: walk through until exhausted
  let visible = picks.map((a) => a.id)
  const seen = [...visible]
  for (let i = 0; i < all.length + 2; i++) {
    const out = visible[0]
    if (!out) break
    const r = swap(p, visible, out, seen)
    if (r.kind === 'none') {
      if (all.length > visible.length) fail(`${tag} swap none with alternatives`)
      break
    }
    if (visible.includes(r.next.id)) fail(`${tag} swap returned visible`)
    if (r.next.id === out) fail(`${tag} swap repeated outgoing`)
    if (!passesHard(r.next, p)) fail(`${tag} swap broke hard constraint`)
    if (!r.recycled && seen.includes(r.next.id)) fail(`${tag} swap fresh but seen`)
    if (r.recycled && all.some((a) => !seen.includes(a.id) && !visible.includes(a.id))) fail(`${tag} recycled with unseen left`)
    visible = [r.next.id, ...visible.slice(1)]
    seen.push(r.next.id)
  }
  // URL round-trip
  const back = prefsFromSearch(new URLSearchParams(prefsToSearch(p, visible).slice(1)))
  if (!back.prefs || back.prefs.budget !== budget || back.prefs.time !== time) fail(`${tag} url round-trip`)
}
console.log(`${combos} combinations: ${perfect} with three full matches, ${short} with fewer`)

for (const [input, ok] of [['ls14ap', true], ['LS1 4AP', true], ['sw1a 1aa', true], ['stoke-on-trent', true], ['M1', true], ['12345', false], ['', false]] as const) {
  if (checkLocation(input).ok !== ok) fail(`location ${input}`)
}
console.log(checkLocation('stoke-on-trent'), checkLocation('ls14ap'))

if (failures) {
  console.error(`${failures} failures`)
  process.exit(1)
}
console.log('All checks passed')
