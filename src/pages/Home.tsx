import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Photo, SettingLabel } from '../components/ui'
import { activities, getActivity } from '../data/activities'
import type { SettingChoice } from '../data/types'
import { formatCost, formatDuration, settingOptions } from '../lib/labels'
import { stepsFor } from '../lib/prefs'
import { getDraft, setDraft } from '../lib/store'

const featureIds = ['themed-film-evening', 'neighbourhood-photography-challenge', 'bookshop-browse-and-a-drink']

export default function Home() {
  const navigate = useNavigate()
  const heroMain = getActivity('unhurried-reading-hour')!
  const heroInset = getActivity('walk-with-a-picnic')!

  function start(setting: SettingChoice) {
    // Start a fresh plan, but keep any location already entered this visit.
    const prev = getDraft()
    setDraft({ setting, location: prev.location })
    navigate(`/plan/${stepsFor(setting)[1]}`)
  }

  const features = featureIds.map((id) => getActivity(id)!)
  const inCount = activities.filter((a) => a.setting === 'in').length
  const outCount = activities.length - inCount

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__text">
          <p className="eyebrow">Free time, well spent</p>
          <h1 id="hero-title" className="hero__title">
            Make something of your <em>spare&nbsp;time.</em>
          </h1>
          <p className="hero__lede">
            A quiet hour. An unexpected afternoon.
            <br />A whole day ahead.
          </p>

          <div className="start" role="group" aria-labelledby="start-label">
            <p id="start-label" className="start__label">
              Where would you like to begin?
            </p>
            <ul className="start__list">
              {settingOptions.map((o, i) => (
                <li key={o.value}>
                  <button type="button" className="start__choice" onClick={() => start(o.value)}>
                    <span className="start__num" aria-hidden="true">0{i + 1}</span>
                    <span className="start__name">{o.label}</span>
                    <span className="start__hint">{o.hint}</span>
                    <span className="start__arrow" aria-hidden="true">
                      <ArrowRight size={22} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="start__foot">Five or six quick questions. No sign-up.</p>
          </div>
        </div>

        <figure className="hero__media">
          <Photo image={heroMain.image} priority sizes="(min-width: 960px) 50vw, 100vw" className="hero__photo" />
          <Photo image={heroInset.image} sizes="(min-width: 960px) 18vw, 40vw" className="hero__inset" />
          <figcaption className="hero__caption">
            <span>Plate I</span>
            <Link to={`/guide/${heroMain.id}`}>{heroMain.title}</Link>
          </figcaption>
        </figure>
      </section>

      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title" className="section-kicker">How it works</h2>
        <ol className="how__list">
          <li>
            <span className="how__num">i.</span>
            <h3>Tell us your time</h3>
            <p>Staying in or going out, how long you have, who is with you, a rough budget and your mood. One question at a time.</p>
          </li>
          <li>
            <span className="how__num">ii.</span>
            <h3>Get three ideas</h3>
            <p>Chosen from our guides to fit your time and budget first, then your mood and company — with an honest note when something is not a perfect fit.</p>
          </li>
          <li>
            <span className="how__num">iii.</span>
            <h3>Open the guide</h3>
            <p>Practical steps, what to bring and a plan for bad weather. Save the ones you like for another day.</p>
          </li>
        </ol>
      </section>

      <section className="features" aria-labelledby="features-title">
        <div className="features__head">
          <h2 id="features-title" className="display-2">
            From the guides
          </h2>
          <p>
            {activities.length} ideas, {inCount} for staying in and {outCount} for going out — from a half-hour sketch to a full day on the hills.
          </p>
        </div>

        <div className="features__grid">
          {features.map((a, i) => (
            <article key={a.id} className={`feature feature--${i + 1}`}>
              <Link to={`/guide/${a.id}`} className="feature__link">
                <Photo image={a.image} sizes={i === 0 ? '(min-width: 960px) 58vw, 100vw' : '(min-width: 960px) 30vw, 100vw'} />
                <div className="feature__body">
                  <SettingLabel setting={a.setting} />
                  <h3 className="feature__title">{a.title}</h3>
                  <p className="feature__standfirst">{a.standfirst}</p>
                  <p className="meta-line">
                    {formatDuration(a.minutes)} <span aria-hidden="true">·</span> {formatCost(a.cost)}
                    {a.cost.high > 0 && <span className="est"> est. per person</span>}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="features__cta">
          <Link to="/guides" className="btn btn--outline">
            Browse all {activities.length} guides <ArrowRight />
          </Link>
          <button type="button" className="btn btn--text" onClick={() => start('surprise')}>
            Or let us choose <ArrowRight />
          </button>
        </div>
      </section>
    </div>
  )
}
