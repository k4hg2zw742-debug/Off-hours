import { useEffect } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Wordmark } from './components/ui'
import { useSaved } from './lib/store'
import Guide from './pages/Guide'
import Guides from './pages/Guides'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Plan from './pages/Plan'
import Results from './pages/Results'
import Saved from './pages/Saved'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
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
          <NavLink to="/saved" aria-label={`Saved guides, ${ids.length}`}>
            Saved <span className="count" aria-hidden="true">{ids.length}</span>
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
          Photography via Unsplash.
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
      <ScrollToTop />
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
