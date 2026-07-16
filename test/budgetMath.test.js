import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getBounds, shiftPivot, build12MonthTimeline, buildPeriodTimeline, buildDailySpark, prevMonthCompareBounds } from '../src/utils/budgetMath.js'

const d = (s) => new Date(s + 'T12:00:00')

test('getBounds — miesiąc: pełny zakres i polska etykieta', () => {
  const { start, end, label } = getBounds('month', d('2026-02-15'))
  assert.equal(start.getDate(), 1)
  assert.equal(start.getMonth(), 1)
  assert.equal(end.getDate(), 28) // luty 2026 nie jest przestępny
  assert.match(label, /luty/i)
  assert.match(label, /2026/)
})

test('getBounds — tydzień zaczyna się w poniedziałek', () => {
  // 2026-07-04 to sobota → tydzień 29.06 (pon) – 05.07 (nd)
  const { start, end } = getBounds('week', d('2026-07-04'))
  assert.equal(start.getDay(), 1)
  assert.equal(end.getDay(), 0)
  assert.equal(start.getDate(), 29)
  assert.equal(end.getDate(), 5)
})

test('getBounds — dzień i rok obejmują całą dobę / cały rok', () => {
  const day = getBounds('day', d('2026-07-04'))
  assert.equal(day.start.getHours(), 0)
  assert.equal(day.end.getHours(), 23)
  const year = getBounds('year', d('2026-07-04'))
  assert.equal(year.start.getMonth(), 0)
  assert.equal(year.end.getMonth(), 11)
  assert.equal(year.label, '2026')
})

test('shiftPivot — przesuwa o jeden okres w obie strony', () => {
  const pivot = d('2026-03-15')
  assert.equal(shiftPivot('day', pivot, +1).getDate(), 16)
  assert.equal(shiftPivot('day', pivot, -1).getDate(), 14)
  assert.equal(shiftPivot('week', pivot, +1).getDate(), 22)
  assert.equal(shiftPivot('month', pivot, +1).getMonth(), 3)
  assert.equal(shiftPivot('year', pivot, -1).getFullYear(), 2025)
})

test('shiftPivot — miesiąc: 31 stycznia nie przeskakuje do marca', () => {
  const next = shiftPivot('month', d('2026-01-31'), +1)
  assert.equal(next.getMonth(), 1) // luty (koniec miesiąca), nie marzec
})

test('build12MonthTimeline — 12 kubełków, sumy w dobrych miesiącach', () => {
  const now = d('2026-07-04')
  const tx = [
    { date: d('2026-07-01'), type: 'expense', amount: 100 },
    { date: d('2026-07-03'), type: 'expense', amount: 50 },
    { date: d('2026-07-02'), type: 'income',  amount: 300 },
    { date: d('2026-06-15'), type: 'expense', amount: 20 },
    { date: d('2025-08-01'), type: 'income',  amount: 7 },   // 11 miesięcy temu — pierwszy kubełek
    { date: d('2025-07-01'), type: 'income',  amount: 999 }, // 12 miesięcy temu — poza zakresem
  ]
  const out = build12MonthTimeline(tx, now)
  assert.equal(out.length, 12)
  const last = out[11]                      // bieżący miesiąc (lipiec)
  assert.equal(last.expense, 150)
  assert.equal(last.income, 300)
  assert.equal(out[10].expense, 20)         // czerwiec
  assert.equal(out[0].income, 7)            // sierpień 2025
  const total = out.reduce((s, m) => s + m.income + m.expense, 0)
  assert.equal(total, 150 + 300 + 20 + 7)   // 999 z lipca 2025 pominięte
})

test('build12MonthTimeline — puste dane dają 12 zerowych kubełków', () => {
  const out = build12MonthTimeline([], d('2026-07-04'))
  assert.equal(out.length, 12)
  assert.ok(out.every(m => m.income === 0 && m.expense === 0))
})

test('buildPeriodTimeline — rok: 12 kubełków miesięcznych, przypisanych do właściwego miesiąca', () => {
  const txs = [
    { date: d('2026-01-10'), type: 'income',  amount: 100 },
    { date: d('2026-01-20'), type: 'expense', amount: 40 },
    { date: d('2026-03-05'), type: 'expense', amount: 60 },
  ]
  const out = buildPeriodTimeline(txs, 'year', d('2026-06-15'))
  assert.equal(out.length, 12)
  assert.equal(out[0].income, 100)
  assert.equal(out[0].expense, 40)
  assert.equal(out[2].expense, 60)
  assert.equal(out[5].income, 0)
})

test('buildPeriodTimeline — miesiąc: kubełki tygodniowe (T1..T5)', () => {
  const txs = [
    { date: d('2026-02-01'), type: 'income',  amount: 10 }, // T1
    { date: d('2026-02-28'), type: 'expense', amount: 5 },  // ostatni tydzień
  ]
  const out = buildPeriodTimeline(txs, 'month', d('2026-02-15'))
  assert.equal(out.length, 4) // luty 2026 (28 dni) → 4 tygodnie
  assert.equal(out[0].label, 'T1')
  assert.equal(out[0].income, 10)
  assert.equal(out[out.length - 1].expense, 5)
})

test('buildPeriodTimeline — tydzień: 7 kubełków dziennych', () => {
  const out = buildPeriodTimeline([{ date: d('2026-02-16'), type: 'expense', amount: 3 }], 'week', d('2026-02-16'))
  assert.equal(out.length, 7)
  assert.equal(out.reduce((s, b) => s + b.expense, 0), 3)
})

test('buildPeriodTimeline — dzień: brak osi', () => {
  assert.deepEqual(buildPeriodTimeline([], 'day', d('2026-02-15')), [])
})

test('buildDailySpark — ostatnie 7 dni od najstarszego do dziś, tylko wybrany typ', () => {
  const now = d('2026-07-16')
  const txs = [
    { date: d('2026-07-16'), type: 'expense', amount: 30 },  // dziś → ostatni kubełek
    { date: d('2026-07-10'), type: 'expense', amount: 12 },  // 6 dni temu → pierwszy kubełek
    { date: d('2026-07-09'), type: 'expense', amount: 999 }, // 7 dni temu → poza zakresem
    { date: d('2026-07-16'), type: 'income',  amount: 500 }, // inny typ → pominięty
  ]
  const out = buildDailySpark(txs, { days: 7, type: 'expense', now })
  assert.equal(out.length, 7)
  assert.equal(out[0], 12)
  assert.equal(out[6], 30)
  assert.equal(out.reduce((s, v) => s + v, 0), 42) // 999 i 500 pominięte
})

test('buildDailySpark — typ income liczy tylko przychody', () => {
  const now = d('2026-07-16')
  const txs = [
    { date: d('2026-07-15'), type: 'income',  amount: 200 },
    { date: d('2026-07-15'), type: 'expense', amount: 50 },
  ]
  const out = buildDailySpark(txs, { days: 7, type: 'income', now })
  assert.equal(out[5], 200)
  assert.equal(out.reduce((s, v) => s + v, 0), 200)
})

test('prevMonthCompareBounds — bieżący miesiąc: do tego samego dnia poprzedniego', () => {
  const { start, end } = prevMonthCompareBounds(d('2026-07-16'), d('2026-07-16'))
  assert.equal(start.getMonth(), 5)  // czerwiec
  assert.equal(start.getDate(), 1)
  assert.equal(end.getMonth(), 5)
  assert.equal(end.getDate(), 16)    // ten sam dzień
  assert.equal(end.getHours(), 23)   // koniec doby
})

test('prevMonthCompareBounds — miesiąc zamknięty: pełny poprzedni miesiąc', () => {
  // oglądamy maj, a jest lipiec → porównanie do pełnego kwietnia
  const { start, end } = prevMonthCompareBounds(d('2026-05-10'), d('2026-07-16'))
  assert.equal(start.getMonth(), 3)  // kwiecień
  assert.equal(end.getMonth(), 3)
  assert.equal(end.getDate(), 30)
})

test('prevMonthCompareBounds — 31. dnia nie wypada poza krótszy poprzedni miesiąc', () => {
  // 31 marca vs luty (28 dni w 2026)
  const { end } = prevMonthCompareBounds(d('2026-03-31'), d('2026-03-31'))
  assert.equal(end.getMonth(), 1)    // luty
  assert.equal(end.getDate(), 28)
})
