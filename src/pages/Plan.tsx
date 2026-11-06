import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from '../components/ui'
import type { BudgetChoice } from '../data/types'
import { budgetOptions, companyOptions, moodOptions, settingOptions, timeOptions } from '../lib/labels'
import { checkLocation, isComplete, prefsToSearch, stepsFor, type Draft, type StepId } from '../lib/prefs'
import { useDraft } from '../lib/store'

type Option = { value: string; label: string; hint: string }

const copy: Record<StepId, { title: string; help: string }> = {
  setting: { title: 'Staying in or going out?', help: 'Choose “Surprise me” and we will mix ideas from both.' },
  location: { title: 'Where are you starting from?', help: 'A UK town, city or postcode.' },
  time: { title: 'How much time have you got?', help: 'We will only suggest things that fit inside it.' },
  company: { title: 'Who is coming along?', help: 'We will favour ideas that suit the company.' },
  budget: { title: 'What would you like to spend?', help: 'An approximate amount per person. We will not suggest anything that cannot be done within it.' },
  mood: { title: 'And what are you in the mood for?', help: 'The last question. Pick the one that feels closest.' },
}

// Budget uses null for "flexible"; encode for radio values.
const encodeBudget = (b: BudgetChoice | undefined) => (b === undefined ? undefined : b === null ? 'any' : String(b))
const decodeBudget = (v: string): BudgetChoice => (v === 'any' ? null : (Number(v) as BudgetChoice))

function optionsFor(step: StepId): Option[] {
  switch (step) {
    case 'setting':
      return settingOptions
    case 'time':
      return timeOptions.map((o) => ({ ...o, value: String(o.value) }))
    case 'company':
      return companyOptions
    case 'budget':
      return budgetOptions.map((o) => ({ ...o, value: encodeBudget(o.value)! }))
    case 'mood':
      return moodOptions
    default:
      return []
  }
}

function valueFor(step: StepId, d: Draft): string | undefined {
  switch (step) {
    case 'setting':
      return d.setting
    case 'time':
      return d.time !== undefined ? String(d.time) : undefined
    case 'company':
      return d.company
    case 'budget':
      return encodeBudget(d.budget)
    case 'mood':
      return d.mood
    default:
      return undefined
  }
}

function patchFor(step: StepId, v: string): Draft {
  switch (step) {
    case 'setting':
      return { setting: v as Draft['setting'] }
    case 'time':
      return { time: Number(v) as Draft['time'] }
    case 'company':
      return { company: v as Draft['company'] }
    case 'budget':
      return { budget: decodeBudget(v) }
    case 'mood':
      return { mood: v as Draft['mood'] }
    default:
      return {}
  }
}

const isAnswered = (step: StepId, d: Draft) => (step === 'location' ? d.location !== undefined : valueFor(step, d) !== undefined)

export default function Plan() {
  const { step: rawStep } = useParams()
  const navigate = useNavigate()
  const { draft, update } = useDraft()
  const steps = stepsFor(draft.setting)
  const step = rawStep as StepId | undefined
  const index = step ? steps.indexOf(step) : -1

  // Guard: unknown step, or a step whose earlier answers are missing.
  const firstGap = steps.find((s) => s !== 'location' && !isAnswered(s, draft))
  const gapIndex = firstGap ? steps.indexOf(firstGap) : steps.length
  if (index === -1) return <Navigate to={`/plan/${index === -1 && step === 'location' ? 'time' : firstGap ?? 'setting'}`} replace />
  if (index > gapIndex) return <Navigate to={`/plan/${firstGap}`} replace />

  return <StepScreen key={step} step={step!} index={index} steps={steps} draft={draft} update={update} navigate={navigate} />
}

function StepScreen({
  step,
  index,
  steps,
  draft,
  update,
  navigate,
}: {
  step: StepId
  index: number
  steps: StepId[]
  draft: Draft
  update: (p: Draft) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [locationText, setLocationText] = useState(draft.location ?? '')
  const [locationError, setLocationError] = useState<string | null>(null)
  const selected = valueFor(step, draft)
  const total = steps.length
  const isLast = index === total - 1
  const options = optionsFor(step)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  function goNext(d: Draft) {
    if (isLast) {
      if (isComplete(d)) navigate(`/results${prefsToSearch({ ...d, location: d.location ?? '' })}`)
      return
    }
    // The setting may have changed which steps exist.
    const nextSteps = stepsFor(d.setting)
    const next = nextSteps[nextSteps.indexOf(step) + 1]
    navigate(`/plan/${next}`)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 'location') {
      const res = checkLocation(locationText)
      if (!res.ok) {
        setLocationError(res.message)
        return
      }
      update({ location: res.value })
      goNext({ ...draft, location: res.value })
      return
    }
    if (selected === undefined) return
    goNext(draft)
  }

  function skipLocation() {
    update({ location: '' })
    goNext({ ...draft, location: '' })
  }

  function back() {
    if (index === 0) navigate('/')
    else navigate(`/plan/${steps[index - 1]}`)
  }

  const canContinue = step === 'location' ? locationText.trim().length > 0 : selected !== undefined
  const editingComplete = isComplete(draft) && !isLast && step !== 'location' && selected !== undefined

  return (
    <div className="plan">
      <form className="plan__inner" onSubmit={onSubmit} noValidate>
        <div className="plan__aside">
          <div className="plan__top">
            <button type="button" className="btn btn--text back-btn" onClick={back}>
              <ArrowLeft size={18} /> Back
            </button>
            <div className="progress" aria-label={`Question ${index + 1} of ${total}`}>
              <span className="progress__count" aria-hidden="true">
                {String(index + 1).padStart(2, '0')} <span>/ {String(total).padStart(2, '0')}</span>
              </span>
              <span className="progress__bar" aria-hidden="true">
                {steps.map((s, i) => (
                  <span key={s} className={i <= index ? 'is-done' : ''} />
                ))}
              </span>
            </div>
          </div>
          <h1 className="plan__title" ref={headingRef} tabIndex={-1}>
            {copy[step].title}
          </h1>
          <p className="plan__help" id={`help-${step}`}>
            {copy[step].help}
          </p>
        </div>

        <div className="plan__main">
          {step === 'location' ? (
            <div className="location">
              <label htmlFor="location-input" className="location__label">
                Town or postcode
              </label>
              <input
                id="location-input"
                className={`location__input${locationError ? ' has-error' : ''}`}
                type="text"
                inputMode="text"
                autoComplete="address-level2"
                placeholder="e.g. Harrogate or LS1 4AP"
                value={locationText}
                maxLength={60}
                aria-describedby={`location-note help-location${locationError ? ' location-error' : ''}`}
                aria-invalid={locationError ? true : undefined}
                onChange={(e) => {
                  setLocationText(e.target.value)
                  if (locationError) setLocationError(null)
                }}
              />
              {locationError && (
                <p className="location__error" id="location-error" role="alert">
                  {locationError}
                </p>
              )}
              <p className="location__note" id="location-note">
                Location is used for search links. Nearby venue discovery is coming later.
              </p>
              <button type="button" className="btn btn--text location__skip" onClick={skipLocation}>
                Skip for now
              </button>
            </div>
          ) : (
            <fieldset className="choices" aria-describedby={`help-${step}`}>
              <legend className="visually-hidden">{copy[step].title}</legend>
              {options.map((o) => {
                const checked = selected === o.value
                return (
                  <label key={o.value} className={`choice${checked ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name={step}
                      value={o.value}
                      checked={checked}
                      onChange={() => update(patchFor(step, o.value))}
                    />
                    <span className="choice__label">{o.label}</span>
                    <span className="choice__hint">{o.hint}</span>
                    <span className="choice__mark" aria-hidden="true">
                      <Check size={18} />
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}

          <div className="plan__actions">
            <button type="submit" className="btn btn--primary btn--large" disabled={!canContinue} aria-disabled={!canContinue}>
              {isLast ? 'Show my three ideas' : 'Continue'} <ArrowRight />
            </button>
            {editingComplete && (
              <button
                type="button"
                className="btn btn--text"
                onClick={() => navigate(`/results${prefsToSearch({ ...draft, location: draft.location ?? '' } as never)}`)}
              >
                Skip to results
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
