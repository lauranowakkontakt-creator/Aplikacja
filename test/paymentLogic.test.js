import { test } from 'node:test'
import assert from 'node:assert/strict'
import { periodKey, isPaymentActive, isPaymentDue } from '../src/utils/paymentLogic.js'

test('periodKey — format yyyy-MM', () => {
  assert.equal(periodKey(new Date(2026, 6, 5)), '2026-07')
  assert.equal(periodKey(new Date(2026, 0, 1)), '2026-01')
  assert.match(periodKey(), /^\d{4}-\d{2}$/)
})

test('isPaymentActive — bez zakresu dat zawsze aktywna', () => {
  assert.equal(isPaymentActive({}), true)
})

test('isPaymentActive — przed dateFrom nieaktywna, od dateFrom aktywna', () => {
  const p = { dateFrom: '2026-07-10' }
  assert.equal(isPaymentActive(p, new Date(2026, 6, 9)), false)
  assert.equal(isPaymentActive(p, new Date(2026, 6, 10)), true)
  assert.equal(isPaymentActive(p, new Date(2026, 6, 11)), true)
})

test('isPaymentActive — po dateTo nieaktywna, w dniu dateTo jeszcze aktywna', () => {
  const p = { dateTo: '2026-07-10' }
  assert.equal(isPaymentActive(p, new Date(2026, 6, 10)), true)
  assert.equal(isPaymentActive(p, new Date(2026, 6, 11)), false)
})

test('isPaymentDue — okres już zaksięgowany blokuje', () => {
  const p = { donePeriods: ['2026-07'] }
  assert.equal(isPaymentDue(p, '2026-07', new Date(2026, 6, 5)), false)
  assert.equal(isPaymentDue(p, '2026-08', new Date(2026, 7, 5)), true)
})

test('isPaymentDue — miesięczna czeka na dayOfMonth', () => {
  const p = { frequency: 'monthly', dayOfMonth: 15 }
  assert.equal(isPaymentDue(p, '2026-07', new Date(2026, 6, 14)), false)
  assert.equal(isPaymentDue(p, '2026-07', new Date(2026, 6, 15)), true)
  assert.equal(isPaymentDue(p, '2026-07', new Date(2026, 6, 20)), true)
})

test('isPaymentDue — miesięczna bez dayOfMonth księgowana od 1. dnia', () => {
  const p = { frequency: 'monthly' }
  assert.equal(isPaymentDue(p, '2026-07', new Date(2026, 6, 1)), true)
})

test('isPaymentDue — nieaktywna (poza zakresem dat) nie jest należna', () => {
  const p = { dateTo: '2026-06-30' }
  assert.equal(isPaymentDue(p, '2026-07', new Date(2026, 6, 5)), false)
})
