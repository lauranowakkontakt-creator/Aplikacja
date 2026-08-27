import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Testy spójności aplikacji jako całości: czy nowy moduł jest podpięty wszędzie
// tam, gdzie trzeba, czy nazwa się zgadza i czy usunięte rzeczy naprawdę znikły.
// Wcześniej dodanie modułu wymagało pamiętania o pięciu miejscach naraz.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

const APP    = read('src/App.jsx')
const PULPIT = read('src/components/Pulpit.jsx')
const HTML   = read('index.html')
const VITE   = read('vite.config.js')

// Id modułów z buildModules() w App.jsx
const moduleIds = [...APP.matchAll(/\{\s*id:\s*'([a-z]+)'\s*,\s*label:/g)].map(m => m[1])

test('App: buildModules zwiera komplet modułów, w tym nowe', () => {
  for (const id of ['home', 'budget', 'habits', 'calendar', 'gratitude', 'memories']) {
    assert.ok(moduleIds.includes(id), `brak modułu ${id} w buildModules`)
  }
  assert.equal(new Set(moduleIds).size, moduleIds.length, 'zdublowane id modułu')
})

test('App: każdy moduł ma kolor akcentu', () => {
  const accents = APP.match(/const MODULE_ACCENTS = \{[\s\S]*?\n\}/)?.[0] || ''
  for (const id of moduleIds) {
    assert.match(accents, new RegExp(`${id}\\s*:`), `moduł ${id} nie ma koloru w MODULE_ACCENTS`)
  }
})

test('App: każdy moduł poza Pulpitem ma leniwy import i jest renderowany', () => {
  for (const id of moduleIds) {
    if (id === 'home') continue
    assert.match(APP, new RegExp(`activeModule === '${id}'`), `moduł ${id} nie jest renderowany`)
  }
  // Nowe moduły dokładamy jako osobne chunki — inaczej rosłoby wejście na telefonie.
  assert.match(APP, /lazy\(\(\) => import\('\.\/components\/gratitude\/GratitudeDashboard'\)\)/)
  assert.match(APP, /lazy\(\(\) => import\('\.\/components\/memories\/MemoriesDashboard'\)\)/)
})

test('App: kolejność i ukrywanie modułów idzie przez moduleLayout', () => {
  assert.match(APP, /from '\.\/utils\/moduleLayout'/)
  assert.match(APP, /navModules\(modules\)/)
  // Stała lista modułów na pasku zniknęła — decyduje układ użytkownika.
  assert.ok(!APP.includes('PRIMARY_NAV'), 'PRIMARY_NAV powinno zniknąć na rzecz układu użytkownika')
})

test('App: ukrycie aktywnego modułu cofa na Pulpit', () => {
  // Bez tego użytkownik zostaje w widoku, do którego nie ma już jak wrócić.
  assert.match(APP, /m\.hidden\)\) setActiveModule\('home'\)/)
})

test('Pulpit: pokazuje tylko moduły zostawione przez użytkownika', () => {
  assert.match(PULPIT, /visibleIds/)
  const cards = (PULPIT.match(/<PulpitCard/g) || []).length
  const guards = (PULPIT.match(/\{shows\('/g) || []).length
  assert.equal(guards, cards, 'każda karta Pulpitu musi być pod warunkiem shows()')
  assert.ok(cards >= 8, `spodziewano się co najmniej 8 kart, jest ${cards}`)
})

test('Pulpit: agenda pomija pozycje z ukrytych modułów', () => {
  assert.match(PULPIT, /items\.filter\(it => shows\(it\.module\)\)/)
})

test('Nazwa aplikacji to Apka — wszędzie', () => {
  assert.match(HTML, /<title>Apka<\/title>/)
  assert.match(HTML, /content="Apka"/)
  assert.match(VITE, /name: 'Apka'/)
  assert.match(VITE, /short_name: 'Apka'/)
  const stale = walk(join(ROOT, 'src'))
    .filter(f => read(f.replace(ROOT + '/', '')).includes('Mój Świat'))
  assert.deepEqual(stale, [], 'gdzieś została stara nazwa')
})

test('Wdzięcznik i Wspomnik nie mają czarnej belki .mod-header', () => {
  // .mod-header ma nieprzezroczyste tło i psuł szklany nagłówek w tych modułach.
  for (const f of ['src/components/gratitude/GratitudeDashboard.jsx',
                   'src/components/memories/MemoriesDashboard.jsx']) {
    assert.ok(!read(f).includes('mod-header'), `${f} nadal używa .mod-header`)
  }
})

test('Dziesięcina: nie ma już osobnej ofiary', () => {
  const cats  = read('src/utils/categories.js')
  const tithe = read('src/components/budget/TitheView.jsx')
  assert.ok(!cats.includes("id: 'ofiara'"), 'kategoria „ofiara" nadal na liście wyboru')
  assert.ok(!/ofiara/i.test(tithe), 'widok dziesięciny nadal wspomina ofiarę')
})

test('Dziesięcina: procent od użytkownika, podstawa z zaznaczonych przychodów', () => {
  const tithe = read('src/components/budget/TitheView.jsx')
  const form  = read('src/components/TransactionForm.jsx')
  assert.ok(!tithe.includes('* 0.10'), 'procent nie może być zaszyty na sztywno')
  assert.match(tithe, /settings\.percent/)
  // Zaznaczenie przy przychodzie + rozliczanie puli po wpłacie
  assert.match(form, /tithe: type === 'income' \? tithe : false/)
  assert.match(tithe, /titheSettledAt/)
})

test('Kalendarz: klik w dzień pokazuje, co się dzieje', () => {
  const cal = read('src/components/calendar/CalendarDashboard.jsx')
  assert.match(cal, /<DayDetail/)
  assert.match(cal, /function DayDetail\(/)
  // Pusty dzień podpowiada najbliższe wydarzenia zamiast pokazywać nic.
  assert.match(cal, /upcomingEvents\(/)
})

test('Nawyki: dzień zrobiony mimo wyjazdu ma własne oznaczenie', () => {
  const logic = read('src/utils/habitLogic.js')
  assert.match(logic, /'done-paused'/)
  for (const f of ['src/components/habits/HabitDayGrid.jsx',
                   'src/components/habits/HabitsDashboard.jsx']) {
    assert.match(read(f), /done-paused/, `${f} nie wyróżnia dnia z przerwy`)
  }
})

test('Nowe kolekcje wchodzą do kopii danych', () => {
  const exp = read('src/utils/dataExport.js')
  for (const col of ['gratitude', 'memories']) {
    assert.match(exp, new RegExp(`'${col}'`), `kolekcja ${col} nie jest eksportowana`)
  }
})

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(jsx?|css)$/.test(name)) out.push(p)
  }
  return out
}
