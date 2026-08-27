import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Testy zgodności z telefonem — pilnują rzeczy, które łatwo zgubić przy
// dopisywaniu stylów, a które psują apkę tylko na Androidzie albo tylko na
// iOS (i przez to nie widać ich na desktopie w trakcie pracy).

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS  = readFileSync(join(ROOT, 'src/styles/main.css'), 'utf8')
const HTML = readFileSync(join(ROOT, 'index.html'), 'utf8')
const VITE = readFileSync(join(ROOT, 'vite.config.js'), 'utf8')

// Komentarze /* ... */ opisują pułapki iOS-a i same w sobie nie są regułami CSS.
const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '')

test('iOS: każdy backdrop-filter ma odpowiednik -webkit-', () => {
  // Bez prefiksu Safari nie rozmywa tła — szklana belka i dolny pasek robią
  // się płaskimi, nieprzezroczystymi płytami.
  const plain  = (cssCode.match(/(?<!-webkit-)backdrop-filter\s*:/g) || []).length
  const webkit = (cssCode.match(/-webkit-backdrop-filter\s*:/g) || []).length
  assert.equal(webkit, plain,
    `backdrop-filter bez prefiksu: ${plain} deklaracji, -webkit-: ${webkit}`)
})

test('iOS: pełnoekranowe wysokości mają wariant dvh', () => {
  // Na iOS 100vh liczy się razem z paskiem adresu — ekran startowy i logowanie
  // wychodziłyby poza widoczny obszar.
  const blocks = cssCode.split('}')
  const offenders = blocks
    .filter(b => /min-height:\s*100vh/.test(b))
    .filter(b => !/100dvh/.test(b))
    .map(b => b.trim().split('\n')[0])
  assert.deepEqual(offenders, [], 'Reguły z samym 100vh, bez fallbacku na 100dvh')
})

test('iOS: pasek dolny i szuflady respektują safe-area', () => {
  // Bez tego dolna nawigacja chowa się pod paskiem gestów iPhone'a.
  const bottomNav = cssCode.match(/\.bottom-nav\s*\{[^}]*\}/)?.[0] || ''
  assert.match(bottomNav, /env\(safe-area-inset-bottom\)/)
  assert.ok(cssCode.includes('safe-area-inset-top'), 'brak safe-area-inset-top (notch)')
})

test('Android + iOS: brak blokady powiększania (dostępność)', () => {
  const viewport = HTML.match(/<meta name="viewport"[^>]*>/)?.[0] || ''
  assert.ok(viewport, 'brak meta viewport')
  assert.ok(!/user-scalable\s*=\s*(no|0)/.test(viewport), 'viewport blokuje zoom')
  assert.ok(!/maximum-scale\s*=\s*1/.test(viewport), 'viewport blokuje zoom przez maximum-scale')
})

test('Notch: viewport-fit=cover, żeby safe-area w ogóle działało', () => {
  assert.match(HTML, /viewport-fit=cover/)
})

test('PWA: apka instaluje się i na Androidzie, i na iOS', () => {
  // Android/Chrome czyta mobile-web-app-capable, iOS swój apple- wariant.
  assert.match(HTML, /<meta name="mobile-web-app-capable" content="yes"/)
  assert.match(HTML, /<meta name="apple-mobile-web-app-capable" content="yes"/)
  assert.match(HTML, /<meta name="theme-color"/)
  assert.match(HTML, /rel="apple-touch-icon"/)
})

test('PWA: manifest ma ikony 192 i 512 (wymóg instalacji na Androidzie)', () => {
  assert.match(VITE, /192x192/)
  assert.match(VITE, /512x512/)
})

test('iOS: brak podświetlania kafelków przy dotknięciu', () => {
  assert.match(cssCode, /-webkit-tap-highlight-color:\s*transparent/)
})

test('iOS: tekst nie puchnie po obrocie ekranu', () => {
  assert.match(cssCode, /-webkit-text-size-adjust:\s*100%/)
})

test('Dotyk: cele dotykowe powiększone na ekranach dotykowych', () => {
  // Wzorzec z reszty apki: @media (pointer: coarse) podbija małe przyciski.
  assert.ok(cssCode.includes('(pointer: coarse)'), 'brak reguł dla ekranów dotykowych')
  const coarse = cssCode.match(/@media\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?\n\}/g) || []
  assert.ok(coarse.length >= 2, 'zbyt mało reguł dopasowanych do dotyku')
})

test('Android: natywne kontrolki w ciemnym motywie (color-scheme)', () => {
  // Bez tego pola daty i selecty potrafią być czarnym tekstem na czarnym tle.
  assert.match(cssCode, /color-scheme:\s*dark/)
})

test('Modal nie blokuje przewijania na iOS (backdrop-filter na kontenerze)', () => {
  // Regresja opisana w komentarzu w CSS: filtr na .modal / .modal-overlay
  // zabijał scroll wewnątrz modala na iOS Safari.
  const overlay = cssCode.match(/\.modal-overlay\s*\{[^}]*\}/)?.[0] || ''
  const modal   = cssCode.match(/\n\.modal\s*\{[^}]*\}/)?.[0] || ''
  assert.ok(!/backdrop-filter/.test(overlay), '.modal-overlay ma backdrop-filter — blokuje scroll na iOS')
  assert.ok(!/backdrop-filter/.test(modal), '.modal ma backdrop-filter — blokuje scroll na iOS')
})

test('Poziome wychodzenie poza ekran: siatki mają min-width: 0', () => {
  // Przycisk w gridzie ma domyślnie min-width: auto — długie słowo rozpycha
  // kolumnę i cały Pulpit wyjeżdża poza ekran telefonu (realny błąd z 08.2026).
  const card = cssCode.match(/\.pulpit-card\s*\{[^}]*\}/)?.[0] || ''
  assert.match(card, /min-width:\s*0/)
  const body = cssCode.match(/\.pulpit-card-body\s*\{[^}]*\}/)?.[0] || ''
  assert.match(body, /min-width:\s*0/)
})
