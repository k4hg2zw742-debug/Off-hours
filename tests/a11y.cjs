// Accessibility audit with axe-core across the main pages. Usage: node tests/a11y.cjs [baseUrl]
const { chromium } = require('playwright')
const { default: AxeBuilder } = require('@axe-core/playwright')
const base = process.argv[2] || 'http://localhost:4173'
const pages = [
  '/',
  '/plan/setting',
  '/plan/location',
  '/results?setting=out&where=York&time=120&with=partner&budget=10&mood=relaxed',
  '/results?setting=in&time=30&with=family&budget=free&mood=social',
  '/guide/walk-with-a-picnic',
  '/guides',
  '/saved',
  '/nowhere',
]
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await ctx.newPage()
  await p.goto(base + '/')
  await p.click('text=Go out')
  let total = 0
  for (const path of pages) {
    await p.goto(base + path, { waitUntil: 'networkidle' })
    await p.waitForTimeout(400)
    const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze()
    for (const v of r.violations) {
      total++
      console.log(`${path}  [${v.impact}] ${v.id}: ${v.help}`)
      for (const n of v.nodes.slice(0, 3)) console.log('    ', n.target.join(' '), n.failureSummary?.split('\n')[1] ?? '')
    }
  }
  console.log(total ? `${total} violation groups` : 'No axe violations')
  await b.close()
  process.exit(total ? 1 : 0)
})()
