export type Setting = 'in' | 'out'
export type SettingChoice = Setting | 'surprise'
export type Mood = 'relaxed' | 'active' | 'creative' | 'social' | 'different'
export type Company = 'solo' | 'partner' | 'friends' | 'family'

/** Available time in minutes. 240 = half a day, 480 = full day. */
export type TimeChoice = 30 | 60 | 120 | 240 | 480
/** Approximate budget per person in pounds. `null` = flexible. */
export type BudgetChoice = 0 | 10 | 25 | null

export interface Step {
  title: string
  body: string
}

export interface Activity {
  id: string
  /** Broad kind, used to keep a set of suggestions varied. */
  kind?: string
  title: string
  /** One-line description used on cards. */
  standfirst: string
  setting: Setting
  /** Minutes: the shortest sensible version, a natural length, and the longest it comfortably stretches to. */
  minutes: { min: number; ideal: number; max: number }
  /** Estimated cost per person in pounds. */
  cost: { low: number; high: number }
  /** How to keep the cost down, shown when the high end exceeds a budget. */
  thrifty?: string
  /** First mood is the primary one. */
  moods: Mood[]
  company: Company[]
  image: { name: string; alt: string; position?: string; portrait?: boolean }
  intro: string
  steps: Step[]
  bring: string[]
  /** Present for weather-dependent activities. */
  weather?: string
  /** Search term for an external map search, for outings. */
  mapQuery?: string
  /** Optional short practical note. */
  note?: string
}
