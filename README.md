# Off Hours

**Make something of your spare time.** Off Hours helps people across the UK decide what to do with free time — staying in or going out. Visitors answer a few quick questions and get three thoughtful suggestions, each opening into a practical activity guide.

This is a complete working prototype: curated content, deterministic matching, no accounts, backend, paid APIs or AI service.

## Run it

```bash
npm install
npm run dev        # local development
npm test           # content + matching checks across all 1,200 answer combinations
npm run build      # production build in dist/ (includes 404.html fallback for static hosts)
npm run preview    # serve the production build
```

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

### Photography

Photos are from Unsplash, downloaded and bundled in `public/images` (900px and 1800px versions).

## Stack

Vite, React 19, TypeScript, React Router. Fonts (Fraunces, Instrument Sans) are bundled via Fontsource. Styling is a single hand-written stylesheet (`src/index.css`).
