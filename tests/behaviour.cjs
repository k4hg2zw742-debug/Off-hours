// End-to-end behaviour checks in Chromium. Usage: node tests/behaviour.cjs [baseUrl]
const { chromium } = require('playwright')
const base = process.argv[2] || 'http://localhost:4173'

let failures = 0
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!ok) failures++
}
const status = (p) => p.$eval('[role=status][aria-live]', (e) => e.textContent.trim())
const focused = (p) => p.evaluate(() => {
  const el = document.activeElement
  return `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}: ${(el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 60)}`
})

;(async () => {
  const browser = await browser_()
  async function browser_() {
    return chromium.launch()
  }

  /* ---------- Keyboard-only journey ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } })
    const p = await ctx.newPage()
    const errors = []
    p.on('pageerror', (e) => errors.push(e.message))
    await p.goto(base + '/', { waitUntil: 'networkidle' })

    await p.keyboard.press('Tab')
    check((await focused(p)).includes('Skip to content'), 'first Tab reaches the skip link')
    // Tab to "Go out"
    for (let i = 0; i < 12; i++) {
      await p.keyboard.press('Tab')
      if ((await focused(p)).includes('Go out')) break
    }
    check((await focused(p)).includes('Go out'), 'starting choices are reachable by keyboard')
    const ring = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle)
    check(ring !== 'none', `focused element has a visible outline (${ring})`)
    await p.keyboard.press('Enter')
    await p.waitForURL('**/plan/location')
    await p.waitForTimeout(200)
    check((await focused(p)).startsWith('h1'), 'focus moves to the question heading on a new step')
    check((await p.textContent('h1')).includes('Question 2 of 6'), 'question heading includes position for screen readers')

    await p.keyboard.press('Tab') // input? (heading -> back button order depends on DOM)
    await p.focus('#location-input')
    await p.keyboard.type('12345')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(150)
    check((await p.$('#location-error')) !== null, 'invalid postcode shows an error')
    check((await focused(p)).startsWith('input'), 'focus returns to the input after an error')
    await p.fill('#location-input', 'york')
    await p.keyboard.press('Enter')
    await p.waitForURL('**/plan/time')

    // Arrow keys select radios; Continue is explicit
    await p.focus('input[name=time] >> nth=0')
    await p.keyboard.press('Space')
    await p.keyboard.press('ArrowDown')
    await p.keyboard.press('ArrowDown')
    check(p.url().endsWith('/plan/time'), 'choosing an option does not change the screen')
    check(await p.isChecked('input[value="120"]'), 'arrow keys move the selection')
    await p.keyboard.press('Enter')
    await p.waitForURL('**/plan/company')

    // Back keeps answers
    await p.goBack()
    await p.waitForURL('**/plan/time')
    check(await p.isChecked('input[value="120"]'), 'browser back keeps the previous answer')
    await p.goForward()
    await p.waitForURL('**/plan/company')
    check((await p.textContent('h1')).includes('Who is coming'), 'browser forward returns to the next question')

    await p.check('input[value=partner]', { force: true })
    await p.keyboard.press('Enter')
    await p.waitForURL('**/plan/budget')
    await p.check('input[value="10"]', { force: true })
    await p.keyboard.press('Enter')
    await p.waitForURL('**/plan/mood')
    await p.check('input[value=relaxed]', { force: true })
    await p.keyboard.press('Enter')
    await p.waitForURL('**/results?**')
    await p.waitForTimeout(300)
    check((await focused(p)).startsWith('h1'), 'focus moves to the results heading')
    check(/Three ideas/.test(await status(p)), `results are announced ("${(await status(p)).slice(0, 60)}…")`)
    check((await p.title()).includes('Off Hours'), `document title updates ("${await p.title()}")`)

    // Swap via keyboard
    const firstTitle = await p.textContent('.suggestion--1 .suggestion__title')
    await p.focus('.suggestion--1 button:has-text("Swap")')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(300)
    const newTitle = await p.textContent('.suggestion--1 .suggestion__title')
    check(newTitle !== firstTitle, `swap replaces the first idea (${firstTitle} → ${newTitle})`)
    check((await focused(p)).includes(newTitle.trim().slice(0, 20)), 'focus lands on the new idea’s title after a swap')
    check((await status(p)).startsWith('Swapped for'), 'swap is announced')

    // Save is announced and toggles aria-pressed
    await p.focus('.suggestion--2 .save-btn')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(100)
    check((await p.getAttribute('.suggestion--2 .save-btn', 'aria-pressed')) === 'true', 'save button reports pressed state')
    check((await status(p)).startsWith('Saved'), 'saving is announced')

    // Refresh keeps the same results
    const resultsUrl = p.url()
    const before = await p.$$eval('.suggestion__title', (e) => e.map((x) => x.textContent))
    await p.reload({ waitUntil: 'networkidle' })
    const after = await p.$$eval('.suggestion__title', (e) => e.map((x) => x.textContent))
    check(JSON.stringify(before) === JSON.stringify(after), 'refreshing results keeps the same three ideas')

    // Guide, then back to results with scroll position, then forward
    await p.evaluate(() => window.scrollTo(0, 900))
    await p.click('.suggestion--3 .suggestion__title a')
    await p.waitForURL('**/guide/**')
    await p.waitForTimeout(200)
    check((await focused(p)).startsWith('h1'), 'focus moves to the guide heading')
    await p.goBack()
    await p.waitForURL(resultsUrl.split('?')[0] + '?**')
    await p.waitForTimeout(300)
    const y = await p.evaluate(() => window.scrollY)
    check(y > 300, `browser back to results restores scroll position (scrollY ${y})`)
    await p.goForward()
    await p.waitForURL('**/guide/**')
    check((await p.$('.guide__title')) !== null, 'browser forward returns to the guide')
    check(errors.length === 0, `no page errors (${errors.join('; ')})`)
    await ctx.close()
  }

  /* ---------- Direct links and refresh ---------- */
  {
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    const r = await p.goto(base + '/guide/dark-sky-stargazing', { waitUntil: 'networkidle' })
    check(r.status() === 200 && (await p.textContent('h1')).includes('Dark-sky'), 'direct guide link works in a fresh browser')
    check((await p.textContent('.guide__back')).includes('All guides'), 'without results, the back link goes to All guides')
    await p.reload({ waitUntil: 'networkidle' })
    check((await p.textContent('h1')).includes('Dark-sky'), 'refreshing a guide works')
    await p.goto(base + '/guide/not-a-guide', { waitUntil: 'networkidle' })
    check((await p.textContent('h1')).includes('day off'), 'unknown guide shows the not-found page')
    await p.goto(base + '/results?setting=banana', { waitUntil: 'networkidle' })
    check((await p.textContent('h1')).includes('few answers'), 'invalid results URL is handled')
    await p.goto(base + '/plan/mood', { waitUntil: 'networkidle' })
    check(p.url().endsWith('/plan/setting'), 'jumping to a later question without answers redirects to the first')
    await ctx.close()
  }

  /* ---------- Corrupt storage ---------- */
  {
    const ctx = await browser.newContext()
    await ctx.addInitScript(() => {
      localStorage.setItem('offhours.saved', '{"not":"an array"')
      sessionStorage.setItem('offhours.draft', '[1,2,3]')
      sessionStorage.setItem('offhours.seen', '"oops"')
      sessionStorage.setItem('offhours.lastResults', '"javascript:alert(1)"')
    })
    const p = await ctx.newPage()
    const errors = []
    p.on('pageerror', (e) => errors.push(e.message))
    await p.goto(base + '/guide/walk-with-a-picnic', { waitUntil: 'networkidle' })
    check((await p.textContent('.site-nav .count')).trim() === '0', 'malformed saved data is ignored')
    check((await p.textContent('.guide__back')).includes('All guides'), 'unsafe “back to results” value is rejected')
    await p.click('.guide__actions .save-btn')
    check((await p.textContent('.site-nav .count')).trim() === '1', 'saving still works after bad data')
    await p.goto(base + '/', { waitUntil: 'networkidle' })
    await p.click('text=Stay in')
    await p.waitForURL('**/plan/time')
    check(true, 'question flow starts after malformed draft data')
    check(errors.length === 0, `no page errors with corrupt storage (${errors.join('; ')})`)
    await ctx.close()
  }

  /* ---------- Storage unavailable ---------- */
  {
    const ctx = await browser.newContext()
    await ctx.addInitScript(() => {
      const deny = () => {
        throw new DOMException('denied', 'SecurityError')
      }
      Object.defineProperty(window, 'localStorage', { get: deny, configurable: true })
      Object.defineProperty(window, 'sessionStorage', { get: deny, configurable: true })
    })
    const p = await ctx.newPage()
    const errors = []
    p.on('pageerror', (e) => errors.push(e.message))
    await p.goto(base + '/', { waitUntil: 'networkidle' })
    await p.click('text=Surprise me')
    await p.click('text=Skip for now')
    for (const v of ['60', 'friends', 'any', 'social']) {
      await p.check(`input[value="${v}"]`, { force: true })
      await p.click('button[type=submit]')
    }
    await p.waitForSelector('.suggestion')
    check((await p.$$('.suggestion')).length === 3, 'full journey works with storage blocked')
    await p.click('.suggestion--1 .save-btn')
    check((await p.textContent('.site-nav .count')).trim() === '1', 'saving works in memory with storage blocked')
    await p.click('.site-nav a[href="/saved"]')
    check((await p.textContent('.saved__note')).includes('not allowing'), 'saved page explains that saves will not persist')
    check(errors.length === 0, `no page errors with storage blocked (${errors.join('; ')})`)
    await ctx.close()
  }

  /* ---------- Images fail to load ---------- */
  {
    const ctx = await browser.newContext()
    await ctx.route('**/images/**', (r) => r.abort())
    const p = await ctx.newPage()
    await p.goto(base + '/guide/bookshop-browse-and-a-drink', { waitUntil: 'networkidle' })
    await p.waitForTimeout(300)
    const fb = await p.$$('.photo--fallback')
    check(fb.length > 0, `failed images show a fallback panel (${fb.length})`)
    check((await p.getAttribute('.guide__photo', 'aria-label'))?.length > 10, 'fallback keeps the image description')
    check((await p.$('.photo-credit a')) !== null, 'guide shows a photo source link')
    await ctx.close()
  }

  /* ---------- Reduced motion ---------- */
  {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' })
    const p = await ctx.newPage()
    await p.goto(base + '/results?setting=in&time=60&with=solo&budget=free&mood=relaxed', { waitUntil: 'networkidle' })
    const d = await p.$eval('.suggestion', (e) => getComputedStyle(e).animationDuration)
    const t = await p.$eval('.photo img', (e) => getComputedStyle(e).transitionDuration)
    check(parseFloat(d) < 0.01 && parseFloat(t) < 0.01, `reduced motion disables animation (${d}, ${t})`)
    await ctx.close()
  }

  /* ---------- Wording ---------- */
  {
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    await p.goto(base + '/guide/bookshop-browse-and-a-drink', { waitUntil: 'networkidle' })
    const text = await p.textContent('main')
    check(/has not checked these places/.test(text), 'outing guide says local places are unchecked')
    check(/estimate/i.test(text), 'guide marks costs as estimates')
    await p.goto(base + '/results?setting=out&time=120&with=solo&budget=25&mood=relaxed', { waitUntil: 'networkidle' })
    const r = await p.textContent('main')
    check(/not checked any local/.test(r) && /estimates per person/.test(r), 'results page states places are unchecked and costs are estimates')
    await ctx.close()
  }

  await browser.close()
  console.log(failures ? `${failures} failed` : 'All behaviour checks passed')
  process.exit(failures ? 1 : 0)
})()
