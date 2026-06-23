import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isTransfer, getSubcategoryColor,
  DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES,
} from '../src/utils/categories.js'

test('isTransfer — rozpoznaje przelewy', () => {
  assert.equal(isTransfer({ categoryId: 'transfer' }), true)
  assert.equal(isTransfer({ transferTo: 'acc2' }), true)
  assert.equal(isTransfer({ transferFrom: 'acc1' }), true)
})

test('isTransfer — zwykła transakcja i wartości puste', () => {
  assert.equal(isTransfer({ categoryId: 'jedzenie' }), false)
  assert.equal(!!isTransfer(null), false)
  assert.equal(!!isTransfer(undefined), false)
})

test('getSubcategoryColor — zwraca poprawny hex i jest deterministyczne', () => {
  const a = getSubcategoryColor('#C97A55', 0)
  const b = getSubcategoryColor('#C97A55', 0)
  assert.match(a, /^#[0-9a-fA-F]{6}$/)
  assert.equal(a, b)
})

test('getSubcategoryColor — różne indeksy dają różne odcienie', () => {
  assert.notEqual(getSubcategoryColor('#3B82F6', 0), getSubcategoryColor('#3B82F6', 1))
})

test('getSubcategoryColor — wejście nie-hex zwraca bezpieczny fallback', () => {
  assert.equal(getSubcategoryColor('niebieski', 0), 'niebieski')
  assert.equal(getSubcategoryColor(undefined, 0), '#888')
})

test('domyślne kategorie mają unikalne id i poprawne kolory', () => {
  for (const list of [DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES]) {
    const ids = list.map(c => c.id)
    assert.equal(new Set(ids).size, ids.length)
    for (const c of list) {
      assert.ok(c.label && c.icon)
      assert.match(c.color, /^#[0-9A-Fa-f]{6}$/)
    }
  }
})
