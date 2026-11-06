import type { BudgetChoice, Company, Mood, SettingChoice, TimeChoice } from '../data/types'

export const settingOptions: { value: SettingChoice; label: string; hint: string }[] = [
  { value: 'in', label: 'Stay in', hint: 'Films, kitchens, slow afternoons' },
  { value: 'out', label: 'Go out', hint: 'Walks, bookshops, small adventures' },
  { value: 'surprise', label: 'Surprise me', hint: 'A mix of both, chosen for you' },
]

export const timeOptions: { value: TimeChoice; label: string; hint: string }[] = [
  { value: 30, label: '30 minutes', hint: 'A pocket of time' },
  { value: 60, label: '1 hour', hint: 'Long enough to switch off' },
  { value: 120, label: '2 hours', hint: 'An evening or a morning' },
  { value: 240, label: 'Half a day', hint: 'Around four hours' },
  { value: 480, label: 'Full day', hint: 'Somewhere around eight hours' },
]

export const companyOptions: { value: Company; label: string; hint: string }[] = [
  { value: 'solo', label: 'Just me', hint: 'Time to yourself' },
  { value: 'partner', label: 'My partner', hint: 'Something for two' },
  { value: 'friends', label: 'Friends', hint: 'A small group' },
  { value: 'family', label: 'Family', hint: 'Including younger ones' },
]

export const budgetOptions: { value: BudgetChoice; label: string; hint: string }[] = [
  { value: 0, label: 'Free', hint: 'Nothing to spend' },
  { value: 10, label: 'Up to £10', hint: 'A coffee and a little extra' },
  { value: 25, label: 'Up to £25', hint: 'Room for a ticket or a meal' },
  { value: null, label: 'Flexible', hint: 'Cost is not the deciding factor' },
]

export const moodOptions: { value: Mood; label: string; hint: string }[] = [
  { value: 'relaxed', label: 'Relaxed', hint: 'Unhurried and restful' },
  { value: 'active', label: 'Active', hint: 'Get moving' },
  { value: 'creative', label: 'Creative', hint: 'Make something' },
  { value: 'social', label: 'Social', hint: 'Time with other people' },
  { value: 'different', label: 'Something different', hint: 'A change from the usual' },
]

export const settingLabel = (s: SettingChoice) => settingOptions.find((o) => o.value === s)!.label
export const timeLabel = (t: TimeChoice) => timeOptions.find((o) => o.value === t)!.label
export const companyLabel = (c: Company) => companyOptions.find((o) => o.value === c)!.label
export const budgetLabel = (b: BudgetChoice) => budgetOptions.find((o) => o.value === b)!.label
export const moodLabel = (m: Mood) => moodOptions.find((o) => o.value === m)!.label

/** "your 2 hours", "your half day" */
export function timePhrase(t: TimeChoice): string {
  switch (t) {
    case 30:
      return 'your 30 minutes'
    case 60:
      return 'your hour'
    case 120:
      return 'your two hours'
    case 240:
      return 'your half day'
    case 480:
      return 'your full day'
  }
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const half = m % 60 >= 30
  if (h >= 8 && !half) return `${h} hrs`
  return `${h}${half ? '½' : ''} ${h === 1 && !half ? 'hr' : 'hrs'}`
}

export function formatDuration(a: { min: number; ideal: number }): string {
  if (a.min === a.ideal) return formatMinutes(a.min)
  const lo = formatMinutes(a.min)
  const hi = formatMinutes(a.ideal)
  // "45 min – 1 hr", "1½ – 2 hrs"
  if (lo.endsWith('hrs') && hi.endsWith('hrs')) return `${lo.replace(' hrs', '')}–${hi}`
  if (lo.endsWith('hr') && hi.endsWith('hrs')) return `${lo.replace(' hr', '')}–${hi}`
  return `${lo} – ${hi}`
}

export function formatCost(c: { low: number; high: number }): string {
  if (c.high === 0) return 'Free'
  if (c.low === 0) return `Free – £${c.high}`
  if (c.low === c.high) return `About £${c.low}`
  return `£${c.low}–£${c.high}`
}
