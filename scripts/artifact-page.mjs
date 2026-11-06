// Turns dist-artifact/index.html into a page body for the claude.ai artifact host,
// which supplies its own <html>/<head>/<body> skeleton. Run after `vite build --mode artifact`.
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync('dist-artifact/index.html', 'utf8')
const css = [...src.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1])
const js = [...src.matchAll(/<script type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1])
if (!css.length || !js.length) throw new Error('Could not find built CSS/JS in dist-artifact/index.html')

const page = `<title>Off Hours</title>
<meta name="description" content="Make something of your spare time. Three thoughtful ideas for staying in or going out, anywhere in the UK.">
${css.map((h) => `<link rel="stylesheet" href="${h.replace(/^\//, '')}">`).join('\n')}
<style>body{background:#f3ede3;color:#1f1d1a}</style>
<div id="root"></div>
${js.map((h) => `<script type="module" src="${h.replace(/^\//, '')}"></script>`).join('\n')}
`
writeFileSync('dist-artifact/off-hours.html', page)
console.log('Wrote dist-artifact/off-hours.html')
