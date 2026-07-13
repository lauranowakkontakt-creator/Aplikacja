import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sortTransactionsByDate } from '../src/utils/txSort.js'

// Pomocnicze: udawany Firestore Timestamp
const ts = (ms) => ({ toMillis: () => ms })

test('najnowsza data transakcji jest na górze, niezależnie od momentu dodania', () => {
  const txs = [
    { id: 'stara-dodana-ostatnio', date: new Date('2026-07-01'), createdAt: ts(Date.parse('2026-07-13T10:00:00')) },
    { id: 'nowa-dodana-wczesniej', date: new Date('2026-07-12'), createdAt: ts(Date.parse('2026-07-12T08:00:00')) },
  ]
  const sorted = sortTransactionsByDate(txs)
  assert.deepEqual(sorted.map(t => t.id), ['nowa-dodana-wczesniej', 'stara-dodana-ostatnio'])
})

test('przy tej samej dacie wygrywa transakcja dodana później', () => {
  const txs = [
    { id: 'dodana-rano',    date: new Date('2026-07-13'), createdAt: ts(Date.parse('2026-07-13T08:00:00')) },
    { id: 'dodana-wieczor', date: new Date('2026-07-13'), createdAt: ts(Date.parse('2026-07-13T20:00:00')) },
  ]
  const sorted = sortTransactionsByDate(txs)
  assert.deepEqual(sorted.map(t => t.id), ['dodana-wieczor', 'dodana-rano'])
})

test('radzi sobie z brakiem createdAt i brakiem daty', () => {
  const txs = [
    { id: 'bez-createdAt', date: new Date('2026-07-10') },
    { id: 'pelna',         date: new Date('2026-07-11'), createdAt: ts(1) },
    { id: 'bez-daty' },
  ]
  const sorted = sortTransactionsByDate(txs)
  assert.deepEqual(sorted.map(t => t.id), ['pelna', 'bez-createdAt', 'bez-daty'])
})

test('nie modyfikuje oryginalnej tablicy', () => {
  const txs = [
    { id: 'b', date: new Date('2026-07-10') },
    { id: 'a', date: new Date('2026-07-11') },
  ]
  const kopia = [...txs]
  sortTransactionsByDate(txs)
  assert.deepEqual(txs, kopia)
})

test('akceptuje datę jako Firestore Timestamp (bez konwersji na Date)', () => {
  const txs = [
    { id: 'starsza', date: ts(Date.parse('2026-07-01')) },
    { id: 'nowsza',  date: ts(Date.parse('2026-07-05')) },
  ]
  const sorted = sortTransactionsByDate(txs)
  assert.deepEqual(sorted.map(t => t.id), ['nowsza', 'starsza'])
})
