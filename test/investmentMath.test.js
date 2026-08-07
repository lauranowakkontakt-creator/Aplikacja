import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isInvestment, investmentStats, sumByCurrency, mergeTotals,
  investmentTotals, makeSnapshot, historyWithDeltas,
  investmentChartScale, investmentChartData,
} from '../src/utils/investmentMath.js'

test('isInvestment rozpoznaje konto typu investment', () => {
  assert.equal(isInvestment({ type: 'investment' }), true)
  assert.equal(isInvestment({ type: 'bank' }), false)
  assert.equal(isInvestment(null), false)
})

test('investmentStats liczy zysk i procent', () => {
  const s = investmentStats({ balance: 4200, invested: 3500 })
  assert.equal(s.value, 4200)
  assert.equal(s.invested, 3500)
  assert.equal(s.profit, 700)
  assert.ok(Math.abs(s.percent - 20) < 1e-9)
})

test('investmentStats: strata daje ujemny zysk', () => {
  const s = investmentStats({ balance: 800, invested: 1000 })
  assert.equal(s.profit, -200)
  assert.ok(Math.abs(s.percent - (-20)) < 1e-9)
})

test('investmentStats: brak wpłat → percent null, brak pól → zera', () => {
  assert.equal(investmentStats({ balance: 500, invested: 0 }).percent, null)
  const empty = investmentStats({})
  assert.deepEqual(empty, { value: 0, invested: 0, profit: 0, percent: null })
})

test('sumByCurrency grupuje wg waluty', () => {
  const r = sumByCurrency([
    { balance: 100, currency: 'PLN' },
    { balance: 50, currency: 'PLN' },
    { balance: 10, currency: 'EUR' },
    { balance: 5 }, // domyślnie PLN
  ])
  assert.deepEqual(r, { PLN: 155, EUR: 10 })
})

test('mergeTotals scala mapy walut i pomija puste', () => {
  const r = mergeTotals({ PLN: 100, EUR: 10 }, { PLN: 50 }, null, undefined)
  assert.deepEqual(r, { PLN: 150, EUR: 10 })
})

test('investmentTotals sumuje wartość, wpłacone i zysk per waluta', () => {
  const accounts = [
    { type: 'bank', balance: 9999, currency: 'PLN' }, // ignorowane
    { type: 'investment', balance: 4200, invested: 3500, currency: 'PLN' },
    { type: 'investment', balance: 800, invested: 1000, currency: 'PLN' },
    { type: 'investment', balance: 120, invested: 100, currency: 'EUR' },
  ]
  const t = investmentTotals(accounts)
  assert.deepEqual(t.value,    { PLN: 5000, EUR: 120 })
  assert.deepEqual(t.invested, { PLN: 4500, EUR: 100 })
  assert.deepEqual(t.profit,   { PLN: 500,  EUR: 20 })
})

test('makeSnapshot tworzy wpis z datą i liczbami', () => {
  const now = new Date('2026-08-07T12:00:00Z')
  assert.deepEqual(makeSnapshot('4200', '3500', now), { date: now, value: 4200, invested: 3500 })
})

test('historyWithDeltas liczy zmianę względem poprzedniego i odwraca kolejność', () => {
  const hist = [
    { date: 1, value: 3750, invested: 3500 },
    { date: 2, value: 3900, invested: 3500 },
    { date: 3, value: 4200, invested: 3500 },
  ]
  const r = historyWithDeltas(hist)
  assert.deepEqual(r.map(h => h.value), [4200, 3900, 3750]) // najnowszy pierwszy
  assert.deepEqual(r.map(h => h.delta), [300, 150, null])   // najstarszy bez delty
})

test('historyWithDeltas: pusta historia → pusto', () => {
  assert.deepEqual(historyWithDeltas([]), [])
  assert.deepEqual(historyWithDeltas(), [])
})

test('investmentChartScale: margines 15% i 3 znaczniki', () => {
  const s = investmentChartScale([3750, 3900, 4200])
  // rozpiętość 450, margines 67.5
  assert.ok(Math.abs(s.min - 3682.5) < 1e-9)
  assert.ok(Math.abs(s.max - 4267.5) < 1e-9)
  assert.deepEqual(s.yTicks, [3683, 3975, 4268])
})

test('investmentChartScale: równe wartości → margines od wartości', () => {
  const s = investmentChartScale([1000, 1000])
  assert.equal(s.min, 900)
  assert.equal(s.max, 1100)
})

test('investmentChartScale: pusto → bezpieczna skala', () => {
  assert.deepEqual(investmentChartScale([]), { min: 0, max: 1, yTicks: [] })
})

test('investmentChartData: buduje punkty {value,label} + skalę', () => {
  const hist = [
    { date: new Date('2026-07-25'), value: 3750 },
    { date: new Date('2026-08-01'), value: 3900 },
  ]
  const r = investmentChartData(hist, d => `d${d.getUTCDate()}`)
  assert.deepEqual(r.data, [{ value: 3750, label: 'd25' }, { value: 3900, label: 'd1' }])
  assert.ok(r.max > r.min)
  assert.equal(r.yTicks.length, 3)
})

test('investmentChartData: obsługuje Timestamp (.toDate) i brak daty', () => {
  const hist = [
    { date: { toDate: () => new Date('2026-08-01') }, value: 100 },
    { value: 200 }, // brak daty
  ]
  const r = investmentChartData(hist, () => 'X')
  assert.deepEqual(r.data.map(d => d.label), ['X', ''])
  assert.deepEqual(r.data.map(d => d.value), [100, 200])
})
