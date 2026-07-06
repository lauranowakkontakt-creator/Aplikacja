import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// currency.js czyta localStorage przy wywołaniu — w Node podstawiamy prostą atrapę.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const { CURRENCIES, getCurrencyCode, setCurrencyCode, fmt, parseAmount } = await import('../src/utils/currency.js')

beforeEach(() => store.clear())

test('CURRENCIES — unikalne kody, komplet pól, PLN dostępny', () => {
  const codes = CURRENCIES.map(c => c.code)
  assert.equal(new Set(codes).size, codes.length)
  assert.ok(codes.includes('PLN'))
  for (const c of CURRENCIES) assert.ok(c.code && c.symbol && c.name)
})

test('getCurrencyCode — domyślnie PLN, po zmianie zapamiętane', () => {
  assert.equal(getCurrencyCode(), 'PLN')
  setCurrencyCode('EUR')
  assert.equal(getCurrencyCode(), 'EUR')
})

test('fmt — formatuje kwotę w wybranej walucie (pl-PL)', () => {
  assert.match(fmt(1234.5), /1\s?234,50\s?zł$/u)
  setCurrencyCode('EUR')
  assert.match(fmt(10), /10,00\s?€$/u)
})

test('fmt — null/undefined traktowane jak zero', () => {
  assert.match(fmt(null), /0,00/)
  assert.match(fmt(undefined), /0,00/)
})

test('parseAmount — kropka i przecinek dziesiętny', () => {
  assert.equal(parseAmount('12.50'), 12.5)
  assert.equal(parseAmount('12,50'), 12.5)
  assert.equal(parseAmount('0,99'), 0.99)
})

test('parseAmount — spacje (separator tysięcy) i liczby', () => {
  assert.equal(parseAmount('1 200'), 1200)
  assert.equal(parseAmount('1 200,75'), 1200.75)
  assert.equal(parseAmount(15), 15)
})

test('parseAmount — puste/nieprawidłowe wejście daje NaN (walidacja je odrzuca)', () => {
  assert.ok(Number.isNaN(parseAmount('')))
  assert.ok(Number.isNaN(parseAmount(null)))
  assert.ok(Number.isNaN(parseAmount(undefined)))
  assert.ok(Number.isNaN(parseAmount('abc')))
  // wzorzec używany w formularzach: !(parseAmount(x) > 0) blokuje NaN i zera
  assert.equal(!(parseAmount('abc') > 0), true)
  assert.equal(!(parseAmount('0') > 0), true)
  assert.equal(!(parseAmount('12,50') > 0), false)
})
