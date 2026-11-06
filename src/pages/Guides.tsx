import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Photo } from '../components/ui'
import { activities } from '../data/activities'
import type { Setting } from '../data/types'
import { formatCost, formatDuration } from '../lib/labels'

type Filter = 'all' | Setting

export default function Guides() {
  const [filter, setFilter] = useState<Filter>('all')
  const [hover, setHover] = useState(activities[0])
  const list = activities.filter((a) => filter === 'all' || a.setting === filter)

  const tabs: { value: Filter; label: string }[] = [
    { value: 'all', label: `All ${activities.length}` },
    { value: 'in', label: 'Stay in' },
    { value: 'out', label: 'Go out' },
  ]

  return (
    <div className="index">
      <header className="index__head">
        <p className="eyebrow">The index</p>
        <h1 className="display-1">Every guide, in one place.</h1>
        <p className="lede">Browse the full collection, or answer a few questions and let us choose three.</p>
        <div className="index__controls">
          <div className="segmented" role="group" aria-label="Filter guides">
            {tabs.map((t) => (
              <button key={t.value} type="button" aria-pressed={filter === t.value} onClick={() => setFilter(t.value)}>
                {t.label}
              </button>
            ))}
          </div>
          <Link to="/plan/setting" className="btn btn--text">
            Help me choose <ArrowRight />
          </Link>
        </div>
      </header>

      <div className="index__layout">
        <ol className="index__list">
          {list.map((a) => (
            <li key={a.id}>
              <Link
                to={`/guide/${a.id}`}
                className="index__row"
                onMouseEnter={() => setHover(a)}
                onFocus={() => setHover(a)}
              >
                <span className="index__num">{String(activities.indexOf(a) + 1).padStart(2, '0')}</span>
                <span className="index__title">{a.title}</span>
                <span className="index__setting">{a.setting === 'in' ? 'Stay in' : 'Go out'}</span>
                <span className="index__time">{formatDuration(a.minutes)}</span>
                <span className="index__cost">{formatCost(a.cost)}</span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="index__preview" aria-hidden="true">
          <div className="index__preview-sticky">
            <Photo key={hover.id} image={hover.image} sizes="30vw" />
            <p>{hover.standfirst}</p>
          </div>
        </div>
      </div>
      <p className="index__foot">Costs are estimates per person.</p>
    </div>
  )
}
