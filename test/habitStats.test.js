import { test } from 'node:test'
import assert from 'node:assert/strict'

const { ymd, statRange, statBuckets, dayAggregate, getPauseIcon, getPauseColor } =
  await import('../src/utils/habitStats.js')

const D = (s) => new Date(`${s}T12:00:00`)

test('ymd formatuje datę lokalnie jako yyyy-MM-dd', () => {
  assert.equal(ymd(D('2026-09-03')), '2026-09-03')
  assert.equal(ymd(D('2026-01-05')), '2026-01-05')
})

test('statRange — tydzień liczy się od poniedziałku do niedzieli', () => {
  // 2026-09-03 to czwartek; tydzień musi objąć pon 31.08 – nd 06.09.
  const r = statRange('week', { weekAnchor: D('2026-09-03') })
  assert.deepEqual(r, { start: '2026-08-31', end: '2026-09-06' })
})

test('statRange — tydzień zaczepiony w niedzielę nie ucieka do przodu', () => {
  // Klasyczna pułapka: domyślny startOfWeek to niedziela, więc bez
  // weekStartsOn: 1 niedziela zaczynałaby NOWY tydzień zamiast kończyć stary.
  const r = statRange('week', { weekAnchor: D('2026-09-06') })
  assert.deepEqual(r, { start: '2026-08-31', end: '2026-09-06' })
})

test('statRange — miesiąc obejmuje pierwszy i ostatni dzień', () => {
  assert.deepEqual(statRange('month', { monthAnchor: D('2026-02-15') }),
    { start: '2026-02-01', end: '2026-02-28' })
  assert.deepEqual(statRange('month', { monthAnchor: D('2024-02-15') }),
    { start: '2024-02-01', end: '2024-02-29' })  // rok przestępny
})

test('statRange — rok', () => {
  assert.deepEqual(statRange('year', { year: 2026 }),
    { start: '2026-01-01', end: '2026-12-31' })
})

// Nawyk codzienny bez pauz — najprostszy przypadek do liczenia procentów.
const NAWYK = [{ id: 'h1', name: 'Woda', frequency: 'daily', createdAt: null,
                 doneDates: ['2026-08-31', '2026-09-01'] }]

test('statBuckets — tydzień daje siedem słupków z etykietami dni', () => {
  const b = statBuckets(NAWYK, [], 'week', { weekAnchor: D('2026-09-03') }, [], D('2026-09-03'))
  assert.equal(b.length, 7)
  assert.equal(b.filter(x => x.active).length, 1, 'dokładnie jeden słupek to dziś')
})

test('statBuckets — przyszłe dni mają zero, nie liczą się jako niezrobione', () => {
  // Bez tego reszta tygodnia od razu po poniedziałku ciągnęłaby wynik w dół,
  // choć te dni jeszcze nie nadeszły.
  const b = statBuckets(NAWYK, [], 'week', { weekAnchor: D('2026-09-03') }, [], D('2026-09-03'))
  // czwartek = indeks 3; piątek, sobota, niedziela to przyszłość
  for (const przyszly of b.slice(4)) assert.equal(przyszly.value, 0)
})

test('statBuckets — miesiąc dzieli się na tygodnie T1..Tn', () => {
  const b = statBuckets(NAWYK, [], 'month', { monthAnchor: D('2026-09-15') }, [], D('2026-09-30'))
  assert.equal(b[0].label, 'T1')
  assert.ok(b.length >= 4 && b.length <= 5)
})

test('statBuckets — rok daje słupek na każdy rok z danymi', () => {
  const b = statBuckets(NAWYK, [], 'year', { year: 2026 }, [2024, 2025, 2026], D('2026-09-03'))
  assert.deepEqual(b.map(x => x.label), ['2024', '2025', '2026'])
  assert.deepEqual(b.map(x => x.active), [false, false, true])
})

test('statBuckets — brak lat z danymi daje pustą listę, nie wywala się', () => {
  assert.deepEqual(statBuckets(NAWYK, [], 'year', { year: 2026 }, [], D('2026-09-03')), [])
})

test('dayAggregate — zwraca cel, wykonane i ułamek', () => {
  const a = dayAggregate(NAWYK, [], '2026-09-01')
  assert.ok(typeof a.due === 'number')
  assert.ok(typeof a.done === 'number')
  assert.ok(a.pct >= 0 && a.pct <= 1, 'ułamek musi mieścić się w 0..1')
  assert.equal(a.paused, false)
})

test('dayAggregate — dzień pauzy jest oznaczony', () => {
  const pauzy = [{ from: '2026-09-10', to: '2026-09-12', reason: 'wyjazd' }]
  assert.equal(dayAggregate(NAWYK, pauzy, '2026-09-11').paused, true)
  assert.equal(dayAggregate(NAWYK, pauzy, '2026-09-13').paused, false)
})

test('getPauseIcon i getPauseColor — null poza pauzą', () => {
  const pauzy = [{ from: '2026-09-10', to: '2026-09-12', reason: 'choroba', reasonIcon: 'pill' }]
  assert.equal(getPauseIcon(pauzy, '2026-09-11'), 'pill')
  assert.equal(getPauseIcon(pauzy, '2026-09-20'), null)
  assert.ok(getPauseColor(pauzy, '2026-09-11'))
  assert.equal(getPauseColor(pauzy, '2026-09-20'), null)
})

test('getPauseIcon — pauza bez ikony daje null, nie undefined', () => {
  const pauzy = [{ from: '2026-09-10', to: '2026-09-12', reason: 'wyjazd' }]
  assert.equal(getPauseIcon(pauzy, '2026-09-11'), null)
})
