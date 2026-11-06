import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Activity } from '../data/types'
import { announce, useSaved } from '../lib/store'

const base = import.meta.env.BASE_URL

export function imageSrc(name: string, size: 'sm' | 'lg') {
  return `${base}images/${name}-${size}.jpg`
}

export function Photo({
  image,
  sizes = '100vw',
  priority = false,
  className = '',
}: {
  image: Activity['image']
  sizes?: string
  priority?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    // Graceful fallback: a quiet typographic panel that keeps the layout and still describes the picture.
    return (
      <div className={`photo photo--fallback ${className}`} role="img" aria-label={image.alt}>
        <span className="photo__fallback-mark" aria-hidden="true">
          Off Hours
        </span>
        <span className="photo__fallback-text" aria-hidden="true">
          {image.alt}
        </span>
      </div>
    )
  }
  return (
    <div className={`photo ${className}`}>
      <img
        ref={(el) => {
          if (el && el.complete) {
            if (el.naturalWidth > 0) el.parentElement?.classList.add('is-loaded')
            else if (el.currentSrc) setFailed(true)
          }
        }}
        src={imageSrc(image.name, 'lg')}
        srcSet={`${imageSrc(image.name, 'sm')} 900w, ${imageSrc(image.name, 'lg')} 1800w`}
        sizes={sizes}
        alt={image.alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        style={image.position ? { objectPosition: image.position } : undefined}
        onLoad={(e) => e.currentTarget.parentElement?.classList.add('is-loaded')}
        onError={() => setFailed(true)}
      />
    </div>
  )
}

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className={`wordmark${small ? ' wordmark--small' : ''}`}>
      <span className="wordmark__off">Off</span> <span className="wordmark__hours">Hours</span>
      <span className="visually-hidden">, home</span>
    </Link>
  )
}

export function SettingLabel({ setting }: { setting: Activity['setting'] }) {
  return <span className={`tag tag--${setting}`}>{setting === 'in' ? 'Stay in' : 'Go out'}</span>
}

/* ---------- Icons (simple strokes, inherit currentColor) ---------- */

type IconProps = { size?: number }
const svg = (size: number, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
)

export const ArrowRight = ({ size = 20 }: IconProps) => svg(size, <path d="M4 12h15m-6-6 6 6-6 6" />)
export const ArrowLeft = ({ size = 20 }: IconProps) => svg(size, <path d="M20 12H5m6-6-6 6 6 6" />)
export const ArrowUpRight = ({ size = 18 }: IconProps) => svg(size, <path d="M7 17 17 7M8 7h9v9" />)
export const Swap = ({ size = 18 }: IconProps) => svg(size, <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />)
export const Check = ({ size = 18 }: IconProps) => svg(size, <path d="m5 12.5 4.5 4.5L19 7.5" />)
export const Bookmark = ({ size = 18, filled = false }: IconProps & { filled?: boolean }) =>
  svg(size, <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" fill={filled ? 'currentColor' : 'none'} />)
export const Clock = ({ size = 16 }: IconProps) => svg(size, <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>)
export const Pound = ({ size = 16 }: IconProps) => svg(size, <path d="M16.5 7.5A3.5 3.5 0 0 0 9.5 8v9.5M7 12.5h7M7 18h10" />)
export const Link2 = ({ size = 18 }: IconProps) => svg(size, <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />)

export function SaveButton({ id, title, variant = 'quiet' }: { id: string; title: string; variant?: 'quiet' | 'solid' }) {
  const { isSaved, toggle } = useSaved()
  const saved = isSaved(id)
  return (
    <button
      type="button"
      className={`btn btn--${variant === 'solid' ? 'outline' : 'text'} save-btn${saved ? ' is-saved' : ''}`}
      aria-pressed={saved}
      onClick={() => {
        toggle(id)
        announce(saved ? `Removed ${title} from saved.` : `Saved ${title}. Find it under Saved.`)
      }}
      aria-label={saved ? `Saved: ${title}. Remove from saved` : `Save ${title}`}
    >
      <Bookmark filled={saved} />
      <span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  )
}
