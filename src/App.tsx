import { useEffect, useRef } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { Wordmark } from './components/ui'
import { useAnnouncement, useSaved } from './lib/store'
import Guide from './pages/Guide'
import Guides from './pages/Guides'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Plan from './pages/Plan'
import Results from './pages/Results'
import Saved from './pages/Saved'

/**
 * On a new page: scroll to the top (but let back/forward keep their position),
 * update the document title, and move keyboard and screen-reader focus to the
 * page's main heading so the change is announced. The question flow manages
 * its own focus.
 */
function RouteChange() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const first = useRef(true)
  useEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0)
    const h1 = document.querySelector<HTMLElement>('main h1')
    const title = h1?.textContent?.replace(/\s+/g, ' ').trim()
    document.title = pathname === '/' || !title ? 'Off Hours — Make something of your spare time' : `${title} — Off Hours`
    if (first.current) {
      first.current = false
      return
    }
    if (!pathname.startsWith('/plan') && h1) {
      h1.setAttribute('tabindex', '-1')
      h1.focus({ preventScroll: navType === 'POP' })
    }
  }, [pathname, navType])
  return null
}

function Announcer() {
  const text = useAnnouncement()
  return (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  )
}

function Header() {
  const { ids } = useSaved()
  const { pathname } = useLocation()
  const inPlan = pathname.startsWith('/plan')
  return (
    <header className={`site-header${inPlan ? ' site-header--plan' : ''}`}>
      <div className="site-header__inner">
        <Wordmark />
        <nav className="site-nav" aria-label="Main">
          <NavLink to="/guides">All guides</NavLink>
          <NavLink to="/saved">
            Saved <span className="count">{ids.length}</span>
            <span className="visually-hidden"> {ids.length === 1 ? 'guide' : 'guides'}</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Wordmark small />
          <p>Ideas for a quiet hour, an unexpected afternoon or a whole day ahead.</p>
        </div>
        <nav className="site-footer__nav" aria-label="Footer">
          <Link to="/plan/setting">Find something to do</Link>
          <Link to="/guides">All guides</Link>
          <Link to="/saved">Saved</Link>
        </nav>
        <p className="site-footer__small">
          A working prototype using a curated set of ideas. Costs are estimates per person and will vary. Off Hours does not check or recommend specific venues.
          Photography from{' '}
          <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">
            Unsplash<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          ; each guide links to its photo’s source.
        </p>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <RouteChange />
      <Announcer />
      <Header />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/plan/:step" element={<Plan />} />
          <Route path="/results" element={<Results />} />
          <Route path="/guide/:id" element={<Guide />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
