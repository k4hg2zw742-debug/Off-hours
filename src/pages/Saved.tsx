import { Link } from 'react-router-dom'
import { ArrowRight, Photo, SettingLabel } from '../components/ui'
import { getActivity } from '../data/activities'
import type { Activity } from '../data/types'
import { formatCost, formatDuration } from '../lib/labels'
import { useRef } from 'react'
import { announce, persistentStorageAvailable, useSaved } from '../lib/store'

export default function Saved() {
  const { ids, remove } = useSaved()
  const items = ids.map((id) => getActivity(id)).filter((a): a is Activity => !!a)
  const listRef = useRef<HTMLUListElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const persistent = persistentStorageAvailable()

  function removeAt(i: number, a: Activity) {
    remove(a.id)
    announce(`Removed ${a.title} from saved.`)
    // Keep focus nearby: the next item's Remove button, the previous one, or the heading.
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('.saved__remove')
      const target = buttons?.[Math.min(i, buttons.length - 1)]
      if (target) target.focus()
      else headingRef.current?.focus()
    })
  }

  return (
    <div className="saved page">
      <header className="saved__head">
        <p className="eyebrow">Saved</p>
        <h1 className="display-1" ref={headingRef} tabIndex={-1}>
          For another day.
        </h1>
        <p className="lede">
          {items.length === 0
            ? 'Nothing saved yet. Tap Save on any suggestion or guide and it will wait for you here.'
            : `${items.length} ${items.length === 1 ? 'guide' : 'guides'} saved on this device.`}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="saved__empty">
          <Link to="/plan/setting" className="btn btn--primary btn--large">
            Find something to do <ArrowRight />
          </Link>
          <Link to="/guides" className="btn btn--text">
            Browse all guides
          </Link>
        </div>
      ) : (
        <ul className="saved__list" ref={listRef}>
          {items.map((a, i) => (
            <li key={a.id} className="saved__item">
              <Link to={`/guide/${a.id}`} className="saved__media" tabIndex={-1} aria-hidden="true">
                <Photo image={a.image} sizes="(min-width: 720px) 220px, 35vw" />
              </Link>
              <div className="saved__body">
                <SettingLabel setting={a.setting} />
                <h2 className="saved__title">
                  <Link to={`/guide/${a.id}`}>{a.title}</Link>
                </h2>
                <p className="meta-line">
                  {formatDuration(a.minutes)} <span aria-hidden="true">·</span> {formatCost(a.cost)}
                  {a.cost.high > 0 && <span className="est"> est. per person</span>}
                </p>
              </div>
              <button type="button" className="btn btn--text saved__remove" onClick={() => removeAt(i, a)} aria-label={`Remove ${a.title} from saved`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="saved__note">
        {persistent
          ? 'Saved guides are stored in this browser only. There are no accounts in this version.'
          : 'Your browser is not allowing this site to store data, so saved guides will be forgotten when you close or reload the page.'}
      </p>
    </div>
  )
}
