# Off Hours

**Make something of your spare time.** Off Hours helps people across the UK decide what to do with free time — staying in or going out. Visitors answer a few quick questions and get three thoughtful suggestions, each opening into a practical activity guide.

This is a complete working prototype: curated content, deterministic matching, no accounts, backend, paid APIs or AI service.

## Run it

```bash
npm install
npm run dev        # local development
npm test           # content + matching checks across all 1,200 answer combinations
npm run build      # production build in dist/ (includes 404.html fallback for static hosts)
npm run preview    # serve the production build on http://localhost:4173
npm run test:browser  # with the preview running: axe accessibility audit + end-to-end behaviour checks
```

`test:browser` needs Playwright with Chromium available (`npm i -D playwright && npx playwright install chromium` if it is not already installed).

### Hosted preview

`npm run build:artifact` builds a variant for the claude.ai artifact host in `dist-artifact/`. It uses `#` links instead of paths (that host can't serve path-based URLs), relative asset paths, and an `off-hours.html` page without its own `<html>` wrapper. The normal build is unaffected.

### Hosting

It is a static single-page app. Any static host works as long as unknown paths serve `index.html`, so that refreshes and direct guide links resolve:
`dist/404.html` covers GitHub Pages, `public/_redirects` covers Netlify, and `vite preview` handles it locally. To host under a sub-path, build with `vite build --base=/sub-path/`.

## What's inside

| Route | Purpose |
| --- | --- |
| `/` | Editorial homepage with the three starting choices (Stay in · Go out · Surprise me) |
| `/plan/:step` | One question at a time: setting, location (outings only), time, company, budget, mood |
| `/results?…` | Three suggestions. The URL holds the answers and visible picks, so results are shareable and survive refresh |
| `/guide/:id` | Full activity guide — shareable route |
| `/guides` | Index of all 46 guides |
| `/saved` | Saved guides (stored in this browser) |

### Matching (`src/lib/match.ts`)

- **Hard constraints, never broken:** setting, available time (an activity's shortest sensible length must fit), budget (its lowest realistic cost per person must fit).
- **Ranking:** mood first, then company, then how well it fills the time. Ties break with a stable hash, so the same answers always give the same ideas.
- **Variety:** full matches of different kinds are preferred (not three walks); "Surprise me" mixes staying in and going out where it can without displacing a full match.
- **Honesty:** if fewer than three ideas fit everything, the page says so, labels partial fits with where they fall short, and offers the single change (mood, time, budget or setting) that opens up the most full matches. If an activity *can* cost more than the budget, the card says how to keep it within budget.
- **Swap:** keeps preferences, never shows something already visible, prefers ideas not yet seen, cycles back only when everything has been seen, and says when there are no further matches.

### Content (`src/data/`)

46 guides (23 stay in, 23 go out) with steps, what to bring, a bad-weather alternative for weather-dependent activities, and a cost-saving tip. Costs and times are estimates. No real venues, events, distances, opening times, ratings or ticket prices are named. Outings offer a clearly labelled Google Maps *search* using the visitor's town or postcode — not a verified recommendation. Location is never requested from the device.

### Accessibility and resilience

- Every control works by keyboard, with a skip link and a visible focus ring (accent outline). The answer options are native radio buttons, so arrow keys work, and Continue is always an explicit step.
- On each new question, focus moves to its heading, which includes "Question 2 of 6". On other pages, focus moves to the main heading and the document title updates.
- One persistent live region announces results, swaps, saves and removals. After a swap, focus moves to the new idea's title. After a removal on the Saved page, focus moves to the next item.
- `prefers-reduced-motion` turns off animation and transitions.
- Storage (`src/lib/store.ts`) validates every value it reads, discards malformed data, and falls back to memory when storage is blocked. The Saved page says when saves won't persist. Saved guides sync across tabs.
- Back and forward keep the scroll position. Results, guides and questions all survive a refresh or direct link. Unknown or invalid URLs get a helpful page.
- If a photo fails to load, a neutral panel with the image description takes its place.

### Photography

Photos are from Unsplash, downloaded and bundled in `public/images` (900px and 1800px versions). Each image's source is listed in [`PHOTOS.md`](PHOTOS.md) (generated from `src/data/photos.ts` with `npx tsx scripts/photo-credits.ts`) and linked from its guide page.

## Stack

Vite, React 19, TypeScript, React Router. Fonts (Fraunces, Instrument Sans) are bundled via Fontsource. Styling is a single hand-written stylesheet (`src/index.css`).
