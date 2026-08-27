import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sortMemories, filterMemories, groupByMonth,
  onThisDay, memoryStats, preview,
} from '../src/utils/memoryLogic.js'

test('sortMemories — najnowsza data u góry, w dniu ostatnio dodane', () => {
  const c = (ms) => ({ toMillis: () => ms })
  const list = [
    { id: 'a', date: '2026-08-20', createdAt: c(100) },
    { id: 'b', date: '2026-08-27', createdAt: c(100) },
    { id: 'c', date: '2026-08-27', createdAt: c(300) },
    { id: 'd', date: '2025-12-31', createdAt: c(900) },
  ]
  assert.deepEqual(sortMemories(list).map(m => m.id), ['c', 'b', 'a', 'd'])
})

test('filterMemories — fraza w tytule, treści i tagach', () => {
  const list = [
    { id: 1, title: 'Wesele Kasi', text: 'było pięknie', tags: ['rodzina'] },
    { id: 2, title: 'Wyjazd w góry', text: 'śnieg po kolana', tags: ['podróże'] },
    { id: 3, title: 'Zwykły dzień', text: '', tags: ['Rodzina'] },
  ]
  assert.deepEqual(filterMemories(list, { search: 'gory' }).map(m => m.id), [2])
  assert.deepEqual(filterMemories(list, { search: 'PIEKNIE' }).map(m => m.id), [1])
  assert.deepEqual(filterMemories(list, { tag: 'rodzina' }).map(m => m.id), [1, 3])
  assert.deepEqual(filterMemories(list, { search: 'wesele', tag: 'rodzina' }).map(m => m.id), [1])
  assert.equal(filterMemories(list, { search: 'wesele', tag: 'podróże' }).length, 0)
  assert.equal(filterMemories(list).length, 3)
})

test('filterMemories — tylko ulubione', () => {
  const list = [
    { id: 1, favorite: true, title: 'a' },
    { id: 2, title: 'b' },
    { id: 3, favorite: true, title: 'c' },
  ]
  assert.deepEqual(filterMemories(list, { favoritesOnly: true }).map(m => m.id), [1, 3])
  assert.deepEqual(filterMemories(list, { favoritesOnly: true, search: 'c' }).map(m => m.id), [3])
})

test('groupByMonth — miesiące od najnowszego, bez daty na końcu', () => {
  const list = [
    { id: 'a', date: '2026-08-27' },
    { id: 'b', date: '2026-08-02' },
    { id: 'c', date: '2026-07-15' },
    { id: 'd', date: '2025-01-01' },
    { id: 'e' },
  ]
  const g = groupByMonth(list)
  assert.deepEqual(g.map(x => x.key), ['2026-08', '2026-07', '2025-01', 'bez-daty'])
  assert.deepEqual(g[0].items.map(m => m.id), ['a', 'b'])
  assert.deepEqual(g[3].items.map(m => m.id), ['e'])
})

test('onThisDay — ten sam dzień i miesiąc z minionych lat', () => {
  const list = [
    { id: 'rok', date: '2025-08-27', title: 'b' },
    { id: 'dwa', date: '2024-08-27', title: 'c' },
    { id: 'dzis', date: '2026-08-27', title: 'a' },   // ten rok — pomijamy
    { id: 'inny', date: '2025-08-26', title: 'd' },   // inny dzień
    { id: 'brak', title: 'e' },
  ]
  const r = onThisDay(list, '2026-08-27')
  assert.deepEqual(r.map(m => m.id), ['rok', 'dwa'])
  assert.deepEqual(r.map(m => m.yearsAgo), [1, 2])
  assert.equal(onThisDay(list, '2026-01-01').length, 0)
})

test('memoryStats — łącznie, ten rok, ulubione, liczba lat', () => {
  const list = [
    { date: '2026-08-27', favorite: true },
    { date: '2026-01-02' },
    { date: '2024-05-05', favorite: true },
    { title: 'bez daty' },
  ]
  assert.deepEqual(memoryStats(list, '2026-08-27'), {
    total: 4, thisYear: 2, favorites: 2, years: 2,
  })
})

test('preview — skraca i skleja białe znaki', () => {
  assert.equal(preview('linia1\n\nlinia2   dalej'), 'linia1 linia2 dalej')
  const long = 'x'.repeat(300)
  assert.equal(preview(long).length, 181)
  assert.ok(preview(long).endsWith('…'))
  assert.equal(preview(null), '')
})
