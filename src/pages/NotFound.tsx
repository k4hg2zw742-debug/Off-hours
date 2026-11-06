import { Link } from 'react-router-dom'
import { ArrowRight } from '../components/ui'

export default function NotFound() {
  return (
    <div className="page page--narrow empty">
      <p className="eyebrow">Page not found</p>
      <h1 className="display-1">This page has the day off.</h1>
      <p className="lede">The link may be old or mistyped. Try the full list of guides, or start from the beginning.</p>
      <div className="empty__actions">
        <Link to="/" className="btn btn--primary btn--large">
          Back to the start <ArrowRight />
        </Link>
        <Link to="/guides" className="btn btn--text">
          All guides
        </Link>
      </div>
    </div>
  )
}
