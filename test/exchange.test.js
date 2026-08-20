import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  roundMoney, roundRate, rateFromAmounts, receivedFromRate, sentFromRate,
  formatRateInput, formatRateLine,
} from '../src/utils/exchange.js'

test('roundMoney — grosze, bez binarnych ogonków', () => {
  assert.equal(roundMoney(230.004), 230)
  assert.equal(roundMoney(230.005), 230.01)
  assert.equal(roundMoney(1000 * 0.23), 230)
  assert.equal(roundMoney(0.1 + 0.2), 0.3)
  assert.equal(roundMoney(NaN), null)
})

test('roundRate — sześć miejsc po przecinku', () => {
  assert.equal(roundRate(1 / 4.35), 0.229885)
  assert.equal(roundRate(0.2298854), 0.229885)
})

test('rateFromAmounts — kurs jako otrzymane/wysłane', () => {
  assert.equal(rateFromAmounts(1000, 230), 0.23)
  assert.equal(rateFromAmounts(230, 1000), 4.347826)
})

test('rateFromAmounts — brak kursu przy zerach i wartościach ujemnych', () => {
  assert.equal(rateFromAmounts(0, 230), null)
  assert.equal(rateFromAmounts(1000, 0), null)
  assert.equal(rateFromAmounts(-1000, 230), null)
  assert.equal(rateFromAmounts(NaN, 230), null)
  assert.equal(rateFromAmounts(1000, NaN), null)
})

test('receivedFromRate — kwota docelowa z kursu', () => {
  assert.equal(receivedFromRate(1000, 0.23), 230)
  assert.equal(receivedFromRate(100, 0.229885), 22.99)
  assert.equal(receivedFromRate(1000, 0), null)
  assert.equal(receivedFromRate(0, 0.23), null)
})

test('sentFromRate — kwota źródłowa z kursu', () => {
  assert.equal(sentFromRate(230, 0.23), 1000)
  assert.equal(sentFromRate(230, 0), null)
})

test('przeliczenia w obie strony trzymają się razem', () => {
  const sent = 1234.56
  const received = 283.95
  const rate = rateFromAmounts(sent, received)
  assert.equal(receivedFromRate(sent, rate), received)
  assert.equal(sentFromRate(received, rate), sent)
})

test('formatRateInput — bez zer na końcu, pusto dla braku kursu', () => {
  assert.equal(formatRateInput(0.23), '0.23')
  assert.equal(formatRateInput(4.347826), '4.347826')
  assert.equal(formatRateInput(0), '')
  assert.equal(formatRateInput(null), '')
})

test('formatRateLine — obie strony kursu', () => {
  const line = formatRateLine(1000, 230, 'PLN', 'EUR')
  assert.ok(line.includes('1 PLN = 0,23 EUR'))
  assert.ok(line.includes('1 EUR = 4,347826 PLN'))
})

test('formatRateLine — brak linii, gdy nie ma czego przeliczać', () => {
  assert.equal(formatRateLine(1000, 230, 'PLN', 'PLN'), null)
  assert.equal(formatRateLine(0, 230, 'PLN', 'EUR'), null)
  assert.equal(formatRateLine(1000, 230, 'PLN', ''), null)
})
