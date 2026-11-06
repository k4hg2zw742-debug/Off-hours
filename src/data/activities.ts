import { stayIn } from './activities-in'
import { goOut } from './activities-out'
import type { Activity } from './types'

const KIND: Record<string, string> = {
  'themed-film-evening': 'screen', 'home-cafe-afternoon': 'food', 'board-game-evening': 'games',
  'cook-something-new-together': 'food', 'kitchen-table-sketching': 'making', 'bake-a-simple-loaf': 'baking',
  'one-bowl-biscuit-bake': 'baking', 'tea-tasting-flight': 'food', 'jigsaw-and-a-podcast': 'games',
  'album-listening-session': 'music', 'write-a-real-letter': 'writing', 'plan-the-season-ahead': 'writing',
  'living-room-circuit': 'fitness', 'stretch-and-breathe': 'fitness', 'repot-your-houseplants': 'growing',
  'windowsill-herb-garden': 'growing', 'unhurried-reading-hour': 'reading', 'learn-a-new-card-game': 'games',
  'homemade-pizza-night': 'food', 'roll-your-own-sushi': 'food', 'try-acrylic-painting': 'making',
  'host-a-homemade-quiz': 'games', 'make-a-one-sheet-zine': 'making',
  'neighbourhood-photography-challenge': 'walk', 'walk-with-a-picnic': 'walk', 'bring-a-dish-park-picnic': 'food',
  'bookshop-browse-and-a-drink': 'reading', 'an-hour-at-the-library': 'reading', 'slow-looking-gallery-visit': 'culture',
  'family-museum-mission': 'culture', 'market-wander-and-cook': 'food', 'woodland-walk-and-sit-spot': 'walk',
  'full-day-hill-walk': 'walk', 'walk-to-the-water': 'walk', 'quiet-roads-bike-loop': 'fitness',
  'find-a-5k-loop': 'fitness', 'lengths-at-the-local-pool': 'fitness', 'open-mic-or-live-music': 'music',
  'pub-quiz-team': 'games', 'independent-cinema-matinee': 'screen', 'creative-taster-class': 'making',
  'dark-sky-stargazing': 'nature', 'charity-shop-and-record-dig': 'shopping', 'look-up-architecture-walk': 'walk',
  'try-a-new-cuisine': 'food', 'park-games-afternoon': 'games',
}

export const activities: Activity[] = [...stayIn, ...goOut].map((a) => ({ ...a, kind: KIND[a.id] ?? a.id }))

const byId = new Map(activities.map((a) => [a.id, a]))

export function getActivity(id: string | undefined): Activity | undefined {
  return id ? byId.get(id) : undefined
}
