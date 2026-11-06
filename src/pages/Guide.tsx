import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, Link2, Photo, SaveButton, SettingLabel } from '../components/ui'
import { activities, getActivity } from '../data/activities'
import type { Activity, Company, Mood } from '../data/types'
import { formatCost, formatDuration, formatMinutes } from '../lib/labels'
import { checkLocation } from '../lib/prefs'
import { getDraft, setDraft, useLastResults } from '../lib/store'
import NotFound from './NotFound'
import { photoSourceUrl } from '../data/photos'

const companyWords: Record<Company, string> = { solo: 'on your own', partner: 'as a pair', friends: 'with friends', family: 'with family' }
const moodWords: Record<Mood, string> = { relaxed: 'relaxed', active: 'active', creative: 'creative', social: 'social', different: 'something different' }

function listWords(words: string[]) {
  if (words.length <= 1) return words.join('')
  return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`
}

export default function Guide() {
  const { id } = useParams()
  const a = getActivity(id)
  if (!a) return <NotFound />
  return <GuideView key={a.id} a={a} />
}

function GuideView({ a }: { a: Activity }) {
  const lastResults = useLastResults()
  const related = useMemo(() => relatedTo(a), [a])

  return (
    <article className="guide">
      <div className="guide__back">
        {lastResults ? (
          <Link to={lastResults} className="btn btn--text back-btn">
            <ArrowLeft size={18} /> Back to your suggestions
          </Link>
        ) : (
          <Link to="/guides" className="btn btn--text back-btn">
            <ArrowLeft size={18} /> All guides
          </Link>
        )}
      </div>

      <header className={`guide__hero${a.image.portrait ? ' guide__hero--portrait' : ''}`}>
        <div className="guide__heading">
          <SettingLabel setting={a.setting} />
          <h1 className="guide__title">{a.title}</h1>
          <p className="guide__standfirst">{a.standfirst}</p>
          <dl className="guide__facts">
            <div>
              <dt>Time</dt>
              <dd>
                {formatDuration(a.minutes)}
                {a.minutes.max > a.minutes.ideal && <span className="est"> · up to {formatMinutes(a.minutes.max)}</span>}
              </dd>
            </div>
            <div>
              <dt>Cost per person</dt>
              <dd>
                {formatCost(a.cost)}
                {a.cost.high > 0 && <span className="est"> · estimate</span>}
              </dd>
            </div>
            <div>
              <dt>Good</dt>
              <dd>{listWords(a.company.map((c) => companyWords[c]))}</dd>
            </div>
            <div>
              <dt>Mood</dt>
              <dd className="capitalise">{listWords(a.moods.map((m) => moodWords[m]))}</dd>
            </div>
          </dl>
          <div className="guide__actions">
            <SaveButton id={a.id} title={a.title} variant="solid" />
            <ShareButton title={a.title} />
          </div>
        </div>
        <Photo image={a.image} priority sizes="(min-width: 960px) 58vw, 100vw" className="guide__photo" />
      </header>

      <div className="guide__content">
        <div className="guide__main">
          <p className="guide__intro">{a.intro}</p>

          <section aria-labelledby="steps-title" className="guide__section">
            <h2 id="steps-title" className="section-kicker">
              What to do
            </h2>
            <ol className="steps">
              {a.steps.map((s, i) => (
                <li key={s.title} className="steps__item">
                  <span className="steps__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {a.weather && (
            <section aria-labelledby="weather-title" className="guide__section guide__weather">
              <h2 id="weather-title" className="section-kicker">
                If the weather turns
              </h2>
              <p>{a.weather}</p>
            </section>
          )}

          {a.cost.high > 0 && a.thrifty && (
            <section aria-labelledby="thrifty-title" className="guide__section">
              <h2 id="thrifty-title" className="section-kicker">
                Keeping the cost down
              </h2>
              <p>{a.thrifty}</p>
            </section>
          )}

          {a.note && <p className="guide__note">{a.note}</p>}
        </div>

        <aside className="guide__side">
          <section aria-labelledby="bring-title" className="bring">
            <h2 id="bring-title" className="section-kicker">
              {a.setting === 'out' ? 'What to bring' : 'What to have ready'}
            </h2>
            <Checklist items={a.bring} />
          </section>

          {a.setting === 'out' && a.mapQuery && <MapSearch query={a.mapQuery} />}

          <p className="guide__estimate">
            Times and costs are estimates for one person and will vary with where you live and what you choose.
            {a.setting === 'out' && ' Off Hours does not name or check local venues.'}
          </p>
          {photoSourceUrl(a.image.name) && (
            <p className="photo-credit">
              Photograph:{' '}
              <a href={photoSourceUrl(a.image.name)} target="_blank" rel="noopener noreferrer">
                Unsplash<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </p>
          )}
        </aside>
      </div>

      <section className="related" aria-labelledby="related-title">
        <h2 id="related-title" className="display-3">
          You might also like
        </h2>
        <ul className="related__list">
          {related.map((r) => (
            <li key={r.id}>
              <Link to={`/guide/${r.id}`} className="related__item">
                <Photo image={r.image} sizes="(min-width: 960px) 25vw, 50vw" />
                <span className="related__meta">
                  <SettingLabel setting={r.setting} /> {formatDuration(r.minutes)}
                </span>
                <span className="related__title">{r.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="related__cta">
          {lastResults ? (
            <Link to={lastResults} className="btn btn--outline">
              <ArrowLeft /> Back to your suggestions
            </Link>
          ) : (
            <Link to="/plan/setting" className="btn btn--outline">
              Find ideas for your free time <ArrowRight />
            </Link>
          )}
        </div>
      </section>
    </article>
  )
}

function relatedTo(a: Activity): Activity[] {
  return activities
    .filter((b) => b.id !== a.id)
    .map((b) => ({
      b,
      s: (b.moods[0] === a.moods[0] ? 3 : 0) + b.moods.filter((m) => a.moods.includes(m)).length + (b.setting !== a.setting ? 1.5 : 0) + b.company.filter((c) => a.company.includes(c)).length * 0.3,
    }))
    .sort((x, y) => y.s - x.s || x.b.id.localeCompare(y.b.id))
    .slice(0, 3)
    .map((x) => x.b)
}

function Checklist({ items }: { items: string[] }) {
  const [done, setDone] = useState<Set<number>>(new Set())
  return (
    <ul className="checklist">
      {items.map((item, i) => (
        <li key={item}>
          <label className={done.has(i) ? 'is-done' : ''}>
            <input
              type="checkbox"
              checked={done.has(i)}
              onChange={() =>
                setDone((prev) => {
                  const next = new Set(prev)
                  if (next.has(i)) next.delete(i)
                  else next.add(i)
                  return next
                })
              }
            />
            <span>{item}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}

function MapSearch({ query }: { query: string }) {
  const [location, setLocation] = useState(() => getDraft().location ?? '')
  const [editing, setEditing] = useState(!location)
  const [text, setText] = useState(location)
  const [error, setError] = useState<string | null>(null)

  const q = location ? `${query} near ${location}` : `${query} near me`
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = checkLocation(text)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setLocation(res.value)
    setDraft({ ...getDraft(), location: res.value })
    setEditing(false)
    setError(null)
  }

  return (
    <section className="mapsearch" aria-labelledby="map-title">
      <h2 id="map-title" className="section-kicker">
        Search the map
      </h2>
      <a className="mapsearch__link" href={href} target="_blank" rel="noopener noreferrer">
        <span>
          Search for <strong>{query}</strong> {location ? <>near <strong>{location}</strong></> : 'near you'}
        </span>
        <ArrowUpRight />
        <span className="visually-hidden">(opens Google Maps in a new tab)</span>
      </a>
      <p className="mapsearch__caveat">
        Opens a Google Maps search. Off Hours has not checked these places — confirm opening times and prices before you go.
      </p>

      {editing ? (
        <form className="mapsearch__form" onSubmit={submit} noValidate>
          <label htmlFor="map-location">Town or postcode</label>
          <div className="mapsearch__row">
            <input
              id="map-location"
              type="text"
              value={text}
              placeholder="e.g. Bristol"
              maxLength={60}
              onChange={(e) => {
                setText(e.target.value)
                setError(null)
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'map-location-error' : undefined}
            />
            <button type="submit" className="btn btn--outline btn--small">
              Use
            </button>
          </div>
          {error && (
            <p id="map-location-error" className="location__error" role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <button type="button" className="btn btn--text btn--small" onClick={() => setEditing(true)}>
          Change location
        </button>
      )}
    </section>
  )
}

function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)
  async function share() {
    const url = window.location.href
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: `${title} — Off Hours`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    } catch {
      /* user cancelled or clipboard unavailable */
    }
  }
  return (
    <button type="button" className="btn btn--text" onClick={share}>
      <Link2 /> <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
    </button>
  )
}
