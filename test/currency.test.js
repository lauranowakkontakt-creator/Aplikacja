import { test } from 'node:test'
import assert from 'node:assert/strict'

// utils/currency.js czyta localStorage — w node podstawiamy prostą atrapę
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null },
  setItem(k, v) { this.store[k] = String(v) },
}

const { parseAmount, fmt, getCurrencyCode, setCurrencyCode, CURRENCIES } =
  await import('../src/utils/currency.js')

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

test('fmt — formatuje w PLN domyślnie i reaguje na zmianę waluty', () => {
  assert.equal(getCurrencyCode(), 'PLN')
  assert.match(fmt(1234.5), /1\s?234,50/)
  assert.match(fmt(1234.5), /zł/)
  assert.match(fmt(null), /0,00/) // brak wartości nie wywala formatowania
  setCurrencyCode('EUR')
  assert.equal(getCurrencyCode(), 'EUR')
  assert.match(fmt(5), /€/)
  setCurrencyCode('PLN')
})

test('CURRENCIES — unikalne kody i komplet pól', () => {
  const codes = CURRENCIES.map(c => c.code)
  assert.equal(new Set(codes).size, codes.length)
  for (const c of CURRENCIES) assert.ok(c.code && c.symbol && c.name)
})
