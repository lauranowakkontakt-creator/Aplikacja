import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getBounds, shiftPivot, build12MonthTimeline, buildPeriodTimeline } from '../src/utils/budgetMath.js'

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

test('buildPeriodTimeline — miesiąc: kubełki dzienne wg liczby dni w miesiącu', () => {
  const txs = [
    { date: d('2026-02-01'), type: 'income',  amount: 10 },
    { date: d('2026-02-28'), type: 'expense', amount: 5 },
  ]
  const out = buildPeriodTimeline(txs, 'month', d('2026-02-15'))
  assert.equal(out.length, 28) // luty 2026
  assert.equal(out[0].income, 10)
  assert.equal(out[27].expense, 5)
})

test('buildPeriodTimeline — dzień: brak osi', () => {
  assert.deepEqual(buildPeriodTimeline([], 'day', d('2026-02-15')), [])
})
