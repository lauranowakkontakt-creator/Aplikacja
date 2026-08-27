import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeTitheSettings, countsToTithe, tithePool, titheDue,
  sumPaid, titheProgress, ensureTitheCategory,
  DEFAULT_PERCENT, TITHE_CATEGORY_ID,
} from '../src/utils/titheLogic.js'

test('normalizeTitheSettings — domyślnie wyłączona, 10%', () => {
  assert.deepEqual(normalizeTitheSettings(null), { enabled: false, percent: DEFAULT_PERCENT })
  assert.deepEqual(normalizeTitheSettings({}), { enabled: false, percent: 10 })
})

test('normalizeTitheSettings — własny procent, odrzucone bzdury', () => {
  assert.equal(normalizeTitheSettings({ percent: 7.5 }).percent, 7.5)
  assert.equal(normalizeTitheSettings({ percent: 100 }).percent, 100)
  assert.equal(normalizeTitheSettings({ percent: 0 }).percent, 10)
  assert.equal(normalizeTitheSettings({ percent: -5 }).percent, 10)
  assert.equal(normalizeTitheSettings({ percent: 150 }).percent, 10)
  assert.equal(normalizeTitheSettings({ percent: 'abc' }).percent, 10)
  assert.equal(normalizeTitheSettings({ enabled: true }).enabled, true)
  assert.equal(normalizeTitheSettings({ enabled: 'tak' }).enabled, false)
})

test('countsToTithe — tylko zaznaczone, nierozliczone przychody', () => {
  assert.ok(countsToTithe({ type: 'income', tithe: true }))
  assert.ok(!countsToTithe({ type: 'income', tithe: false }))
  assert.ok(!countsToTithe({ type: 'income' }))
  assert.ok(!countsToTithe({ type: 'expense', tithe: true }))
  assert.ok(!countsToTithe({ type: 'income', tithe: true, titheSettledAt: 'kiedys' }))
  assert.ok(!countsToTithe(null))
})

test('tithePool — sumuje tylko to, co wchodzi do puli', () => {
  const txs = [
    { type: 'income', tithe: true, amount: 1000 },
    { type: 'income', tithe: true, amount: 500.55 },
    { type: 'income', tithe: false, amount: 9999 },       // niezaznaczony
    { type: 'income', tithe: true, amount: 300, titheSettledAt: 'x' }, // już rozliczony
    { type: 'expense', tithe: true, amount: 200 },        // wydatek
  ]
  const pool = tithePool(txs)
  assert.equal(pool.base, 1500.55)
  assert.equal(pool.count, 2)
  assert.deepEqual(tithePool([]), { items: [], count: 0, base: 0 })
})

test('titheDue — procent od podstawy, zaokrąglony do groszy', () => {
  assert.equal(titheDue(1000, 10), 100)
  assert.equal(titheDue(1500.55, 10), 150.06)
  assert.equal(titheDue(1234.56, 7.5), 92.59)
  assert.equal(titheDue(0, 10), 0)
  assert.equal(titheDue(1000, 0), 0)
})

test('sumPaid — sumuje wpłaty', () => {
  assert.equal(sumPaid([{ amount: 50 }, { amount: 25.5 }]), 75.5)
  assert.equal(sumPaid([]), 0)
})

test('titheProgress — 0 gdy nie ma z czego płacić', () => {
  assert.equal(titheProgress(0, 0), 0)
  assert.equal(titheProgress(0, 100), 0)
  assert.equal(titheProgress(100, 0), 0)
  assert.equal(titheProgress(100, 50), 50)
  assert.equal(titheProgress(100, 150), 100) // nadpłata nie przekracza 100
  assert.equal(titheProgress(150.06, 150.06), 100)
})

test('ensureTitheCategory — dopisuje kategorię tylko raz', () => {
  const base = [{ id: 'jedzenie' }]
  const out = ensureTitheCategory(base)
  assert.equal(out.length, 2)
  assert.equal(out[1].id, TITHE_CATEGORY_ID)
  assert.equal(out[1].label, 'Dziesięcina')
  assert.equal(ensureTitheCategory(out).length, 2)
  assert.equal(ensureTitheCategory([]).length, 1)
})
