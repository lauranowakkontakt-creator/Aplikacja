import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  shiftDay, groupByDay, currentStreak, longestStreak,
  countInMonth, filterEntries, gratitudeStats,
} from '../src/utils/gratitudeLogic.js'

test('shiftDay — przesuwa dni, także przez granice miesiąca i roku', () => {
  assert.equal(shiftDay('2026-08-27', 1), '2026-08-28')
  assert.equal(shiftDay('2026-08-01', -1), '2026-07-31')
  assert.equal(shiftDay('2026-01-01', -1), '2025-12-31')
  assert.equal(shiftDay('2024-02-28', 1), '2024-02-29') // rok przestępny
  assert.equal(shiftDay('2026-02-28', 1), '2026-03-01')
})

test('shiftDay — zmiana czasu nie gubi dnia', () => {
  // ostatnia niedziela marca / października w Polsce
  assert.equal(shiftDay('2026-03-28', 1), '2026-03-29')
  assert.equal(shiftDay('2026-03-29', 1), '2026-03-30')
  assert.equal(shiftDay('2026-10-25', 1), '2026-10-26')
})

test('groupByDay — dni od najnowszego, w dniu kolejność dodania', () => {
  const d = (ms) => ({ toMillis: () => ms })
  const entries = [
    { id: 'b', date: '2026-08-27', createdAt: d(200) },
    { id: 'a', date: '2026-08-27', createdAt: d(100) },
    { id: 'c', date: '2026-08-25', createdAt: d(50) },
    { id: 'x', text: 'bez daty' },
  ]
  const g = groupByDay(entries)
  assert.deepEqual(g.map(x => x.date), ['2026-08-27', '2026-08-25'])
  assert.deepEqual(g[0].items.map(i => i.id), ['a', 'b'])
  assert.deepEqual(g[1].items.map(i => i.id), ['c'])
})

test('currentStreak — liczy dni z rzędu do dziś', () => {
  const e = (date) => ({ date })
  assert.equal(currentStreak([e('2026-08-27'), e('2026-08-26'), e('2026-08-25')], '2026-08-27'), 3)
  // dwa wpisy tego samego dnia to nadal jeden dzień serii
  assert.equal(currentStreak([e('2026-08-27'), e('2026-08-27')], '2026-08-27'), 1)
  assert.equal(currentStreak([], '2026-08-27'), 0)
})

test('currentStreak — brak wpisu dziś nie zeruje serii, brak wczoraj tak', () => {
  const e = (date) => ({ date })
  assert.equal(currentStreak([e('2026-08-26'), e('2026-08-25')], '2026-08-27'), 2)
  assert.equal(currentStreak([e('2026-08-24'), e('2026-08-23')], '2026-08-27'), 0)
})

test('longestStreak — najdłuższy ciąg w historii', () => {
  const e = (date) => ({ date })
  const entries = [
    e('2026-08-01'), e('2026-08-02'), e('2026-08-03'), // 3
    e('2026-08-10'),                                    // 1
    e('2026-08-20'), e('2026-08-21'),                   // 2
  ]
  assert.equal(longestStreak(entries), 3)
  assert.equal(longestStreak([]), 0)
  assert.equal(longestStreak([e('2026-08-05')]), 1)
})

test('countInMonth — tylko wpisy z danego miesiąca', () => {
  const e = (date) => ({ date })
  const entries = [e('2026-08-01'), e('2026-08-31'), e('2026-07-31'), e('2025-08-15')]
  assert.equal(countInMonth(entries, '2026-08'), 2)
  assert.equal(countInMonth(entries, '2026-09'), 0)
})

test('filterEntries — szuka bez polskich znaków', () => {
  const entries = [
    { id: 1, text: 'Za spokojny wieczór w domu' },
    { id: 2, text: 'Za rozmowę z mamą' },
  ]
  assert.deepEqual(filterEntries(entries, 'rozmowe').map(e => e.id), [2])
  assert.deepEqual(filterEntries(entries, 'WIECZOR').map(e => e.id), [1])
  assert.equal(filterEntries(entries, '  ').length, 2)
})

test('gratitudeStats — komplet liczb do kafelków', () => {
  const e = (date) => ({ date })
  const entries = [e('2026-08-27'), e('2026-08-27'), e('2026-08-26'), e('2026-07-01')]
  assert.deepEqual(gratitudeStats(entries, '2026-08-27'), {
    total: 4, days: 3, streak: 2, best: 2, month: 3,
  })
})
