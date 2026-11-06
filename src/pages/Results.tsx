import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Clock, Photo, Pound, SaveButton, SettingLabel, Swap } from '../components/ui'
import { getActivity } from '../data/activities'
import type { Activity } from '../data/types'
import { budgetLabel, companyLabel, formatCost, formatDuration, moodLabel, timeLabel, timePhrase } from '../lib/labels'
import { explain, isFullMatch, passesHard, pickInitial, rank, suggestAdjustment, swap, type Adjustment } from '../lib/match'
import { isComplete, prefsFromSearch, prefsKey, prefsToSearch, type Prefs, type StepId } from '../lib/prefs'
import { announce, getDraft, getSeen, markSeen, setDraft, setLastResults } from '../lib/store'

const numberWord = ['No ideas', 'One idea', 'Two ideas', 'Three ideas']

/** Set just before navigating to adjusted results, so the new view knows to take focus. */
const pendingFocus = { adjusted: false }

export default function Results() {
  const [search] = useSearchParams()
  const { prefs, show } = useMemo(() => prefsFromSearch(search), [search])

  if (!prefs) {
    const d = getDraft()
    if (isComplete(d)) return <Navigate to={`/results${prefsToSearch({ ...d, location: d.location ?? '' })}`} replace />
    return (
      <div className="page page--narrow empty">
        <p className="eyebrow">Results</p>
        <h1 className="display-2">We need a few answers first.</h1>
        <p className="lede">Answer five or six quick questions and we will suggest three things to do.</p>
        <Link to="/plan/setting" className="btn btn--primary btn--large">
          Start <ArrowRight />
        </Link>
      </div>
    )
  }
  return <ResultsView key={prefsKey(prefs) + prefs.location} prefs={prefs} show={show} />
}

function ResultsView({ prefs, show }: { prefs: Prefs; show: string[] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const key = prefsKey(prefs)
  const ranked = useMemo(() => rank(prefs), [prefs])
  const fullTotal = ranked.filter((a) => isFullMatch(a, prefs)).length

  // Validate the ids in the URL; fall back to a fresh pick.
  const visible: Activity[] = useMemo(() => {
    const fromUrl = [...new Set(show)].map((id) => getActivity(id)).filter((a): a is Activity => !!a && passesHard(a, prefs))
    const expected = Math.min(3, ranked.length)
    return fromUrl.length === expected ? fromUrl : pickInitial(prefs)
  }, [show, prefs, ranked.length])

  const visibleIds = visible.map((a) => a.id)
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [focusId, setFocusId] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Keep the URL, the draft and the "seen" list in step with what is on screen.
  useEffect(() => {
    const target = `/results${prefsToSearch(prefs, visibleIds)}`
    if (`${location.pathname}${location.search}` !== target) navigate(target, { replace: true })
    setLastResults(target)
    setDraft({ ...prefs })
    markSeen(key, visibleIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds.join(',')])

  const adjustment = useMemo(() => (fullTotal < 3 ? suggestAdjustment(prefs) : null), [prefs, fullTotal])

  function doSwap(slot: number) {
    const outgoing = visibleIds[slot]
    const res = swap(prefs, visibleIds, outgoing, getSeen(key))
    if (res.kind === 'none') {
      const msg =
        ranked.length <= visibleIds.length
          ? 'There are no other ideas that fit your time and budget, so this one stays.'
          : 'No further matches for these preferences.'
      setMessages({ [outgoing]: msg })
      announce(msg)
      return
    }
    const next = [...visibleIds]
    next[slot] = res.next.id
    const note = res.recycled ? `You have seen every match for these answers, so we are showing earlier ideas again.` : ''
    setMessages(note ? { [res.next.id]: note } : {})
    announce(`Swapped for ${res.next.title}. ${res.next.setting === 'in' ? 'Stay in' : 'Go out'}, ${formatDuration(res.next.minutes)}, ${formatCost(res.next.cost)}. ${note}`)
    // The swapped card is a new element; take focus to its title so keyboard users stay in place.
    setFocusId(res.next.id)
    navigate(`/results${prefsToSearch(prefs, next)}`, { replace: true })
  }

  function applyAdjustment(a: Adjustment) {
    setDraft({ ...a.prefs })
    pendingFocus.adjusted = true
    navigate(`/results${prefsToSearch(a.prefs)}`)
  }

  const visibleFull = visible.filter((a) => isFullMatch(a, prefs)).length
  const count = visible.length

  // Announce the new set whenever the answers change (first load, edits, or an adjustment).
  useEffect(() => {
    const fit =
      count === 0
        ? 'Nothing fits those answers; see the suggestion to broaden them.'
        : visibleFull === count
          ? 'All fit your time, budget, company and mood.'
          : `${visibleFull} of ${count} fit everything you asked for; the others are marked as partial fits.`
    announce(`${count === 0 ? 'No ideas' : numberWord[count]} for ${timePhrase(prefs.time)}. ${fit}`)
    if (pendingFocus.adjusted) {
      // Same page, new results: move focus to the heading so the change is not missed.
      pendingFocus.adjusted = false
      headingRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="results">
      <header className="results__head">
        <p className="eyebrow">Your suggestions</p>
        <h1 className="display-1 results__title" ref={headingRef} tabIndex={-1}>
          {count === 0 ? (
            <>Nothing fits just yet.</>
          ) : (
            <>
              {numberWord[count]} for <em>{timePhrase(prefs.time).replace('your ', 'your ')}</em>
            </>
          )}
        </h1>
        <Summary prefs={prefs} />
      </header>

      <FitNotice prefs={prefs} count={count} visibleFull={visibleFull} hardTotal={ranked.length} adjustment={adjustment} onApply={applyAdjustment} />

      {count > 0 && (
        <ol className={`suggestions suggestions--${count}`}>
          {visible.map((a, i) => (
            <Suggestion
              key={a.id}
              activity={a}
              prefs={prefs}
              index={i}
              message={messages[a.id]}
              autoFocus={focusId === a.id}
              onSwap={() => doSwap(i)}
            />
          ))}
        </ol>
      )}

      <aside className="results__foot">
        <p>
          Suggestions come from our curated guides and are matched on your answers — they are general ideas, not live listings. Off Hours has not checked any local
          places, and costs are estimates per person.
        </p>
        <div className="results__foot-actions">
          <Link to="/plan/setting" className="btn btn--outline">
            Edit preferences
          </Link>
          <Link to="/guides" className="btn btn--text">
            Browse every guide <ArrowRight />
          </Link>
        </div>
      </aside>
    </div>
  )
}

function Summary({ prefs }: { prefs: Prefs }) {
  const items: { step: StepId; label: string; value: string }[] = [
    { step: 'setting', label: 'Setting', value: prefs.setting === 'in' ? 'Stay in' : prefs.setting === 'out' ? 'Go out' : 'Surprise me' },
  ]
  if (prefs.setting !== 'in') items.push({ step: 'location', label: 'Location', value: prefs.location || 'Not given' })
  items.push(
    { step: 'time', label: 'Time', value: timeLabel(prefs.time) },
    { step: 'company', label: 'With', value: companyLabel(prefs.company) },
    { step: 'budget', label: 'Budget', value: prefs.budget === null ? 'Flexible' : prefs.budget === 0 ? 'Free' : `${budgetLabel(prefs.budget)} pp` },
    { step: 'mood', label: 'Mood', value: moodLabel(prefs.mood) },
  )
  return (
    <div className="summary">
      <h2 className="visually-hidden">Your answers</h2>
      <dl className="summary__list">
        {items.map((it) => (
          <div key={it.step} className="summary__item">
            <dt>{it.label}</dt>
            <dd>
              <Link to={`/plan/${it.step}`} aria-label={`${it.label}: ${it.value}. Change`}>
                {it.value}
              </Link>
            </dd>
          </div>
        ))}
      </dl>
      <Link to="/plan/setting" className="summary__edit">
        Edit preferences
      </Link>
    </div>
  )
}

function FitNotice({
  prefs,
  count,
  visibleFull,
  hardTotal,
  adjustment,
  onApply,
}: {
  prefs: Prefs
  count: number
  visibleFull: number
  hardTotal: number
  adjustment: Adjustment | null
  onApply: (a: Adjustment) => void
}) {
  const limits = `${timeLabel(prefs.time).toLowerCase()} and ${prefs.budget === 0 ? 'no spending' : prefs.budget === null ? 'a flexible budget' : `${budgetLabel(prefs.budget).toLowerCase()} per person`}`

  if (count === 3 && visibleFull === 3) {
    return (
      <p className="fit-line">
        <span className="fit-line__dot" aria-hidden="true" />
        All three fit your time, budget, company and mood.
      </p>
    )
  }

  let heading: string
  let body: string
  if (hardTotal === 0) {
    heading = 'Nothing in our guides fits all of that.'
    body = `None of our ideas can be done within ${limits}${prefs.setting === 'surprise' ? '' : prefs.setting === 'in' ? ' at home' : ' out and about'}. We would rather say so than stretch your time or budget.`
  } else if (hardTotal < 3) {
    heading = `Only ${hardTotal === 1 ? 'one idea fits' : 'two ideas fit'} within ${limits}.`
    body = 'We have not padded the list with things that would run over your time or budget.'
  } else {
    heading = visibleFull === 0 ? 'No perfect match this time.' : `${visibleFull === 1 ? 'One of these fits' : 'Two of these fit'} everything you asked for.`
    body = `${visibleFull === 0 ? 'These' : 'The others'} fit your time and budget, but are not a natural fit for ${
      prefs.mood === 'different' ? 'something different' : `a ${moodLabel(prefs.mood).toLowerCase()} mood`
    } with ${companyLabel(prefs.company).toLowerCase()}. Each one says where it falls short.`
  }

  return (
    <section className="notice" aria-labelledby="notice-title">
      <div className="notice__text">
        <h2 id="notice-title">{heading}</h2>
        <p>{body}</p>
      </div>
      {adjustment && (
        <div className="notice__action">
          <p>
            {adjustment.detail} and {adjustment.partial ? 'we can show' : 'you would have'}{' '}
            <strong>
              {adjustment.gain} more {adjustment.gain === 1 ? 'idea' : 'ideas'}
            </strong>{' '}
            {adjustment.partial
              ? `that ${adjustment.gain === 1 ? 'fits' : 'fit'} your time and budget.`
              : `that ${adjustment.gain === 1 ? 'fits' : 'fit'} everything else you asked for.`}
          </p>
          <button type="button" className="btn btn--outline" onClick={() => onApply(adjustment)}>
            {adjustment.label} <ArrowRight />
          </button>
        </div>
      )}
    </section>
  )
}

function Suggestion({
  activity: a,
  prefs,
  index,
  message,
  autoFocus,
  onSwap,
}: {
  activity: Activity
  prefs: Prefs
  index: number
  message?: string
  autoFocus?: boolean
  onSwap: () => void
}) {
  const titleRef = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    if (autoFocus) titleRef.current?.focus({ preventScroll: true })
  }, [autoFocus])
  const { fits, caveats } = explain(a, prefs)
  const full = isFullMatch(a, prefs)
  const sizes = index === 0 ? '(min-width: 960px) 60vw, 100vw' : '(min-width: 960px) 40vw, 100vw'
  return (
    <li className={`suggestion suggestion--${index + 1}`}>
      <article aria-labelledby={`s-${a.id}`}>
        <Link to={`/guide/${a.id}`} className="suggestion__media" tabIndex={-1} aria-hidden="true">
          <Photo image={a.image} sizes={sizes} priority={index === 0} />
        </Link>
        <div className="suggestion__body">
          <div className="suggestion__kicker">
            <span className="suggestion__num">{String(index + 1).padStart(2, '0')}</span>
            <SettingLabel setting={a.setting} />
            {!full && <span className="tag tag--partial">Partial fit</span>}
          </div>
          <h2 className="suggestion__title" id={`s-${a.id}`}>
            <Link to={`/guide/${a.id}`} ref={titleRef}>
              {a.title}
            </Link>
          </h2>
          <p className="suggestion__standfirst">{a.standfirst}</p>

          <dl className="facts">
            <div>
              <dt>
                <Clock /> Time
              </dt>
              <dd>{formatDuration(a.minutes)}</dd>
            </div>
            <div>
              <dt>
                <Pound /> Cost
              </dt>
              <dd>
                {formatCost(a.cost)}
                {a.cost.high > 0 && <span className="est"> per person, est.</span>}
              </dd>
            </div>
          </dl>

          <div className="why">
            <h3 className="why__title">Why it fits</h3>
            <ul className="why__list">
              {fits.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {caveats.length > 0 && (
              <ul className="why__list why__list--caveats" aria-label="Where it falls short">
                {caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="suggestion__actions">
            <Link to={`/guide/${a.id}`} className="btn btn--primary">
              View the guide <ArrowRight />
            </Link>
            <SaveButton id={a.id} title={a.title} />
            <button type="button" className="btn btn--text" onClick={onSwap} aria-label={`Swap ${a.title} for another idea`}>
              <Swap /> Swap
            </button>
          </div>
          {message && (
            <p className="suggestion__message" role="status">
              {message}
            </p>
          )}
        </div>
      </article>
    </li>
  )
}
