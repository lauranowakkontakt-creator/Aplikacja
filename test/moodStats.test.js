import { test } from 'node:test'
import assert from 'node:assert/strict'

const { wpisyOkresu, statystykiNastroju, podsumowanieLat } =
  await import('../src/utils/moodStats.js')

const logi = [
  { date: '2026-09-01', moodValue: 5 },
  { date: '2026-09-01', moodValue: 3 },   // ten sam dzień, drugi wpis
  { date: '2026-09-20', moodValue: 4 },
  { date: '2026-08-15', moodValue: 2 },
  { date: '2025-12-31', moodValue: 1 },
]

test('wpisyOkresu — miesiąc, rok i całość', () => {
  assert.equal(wpisyOkresu(logi, 'month', '2026-09').length, 3)
  assert.equal(wpisyOkresu(logi, 'year', '2026').length, 4)
  assert.equal(wpisyOkresu(logi, 'all').length, 5)
})

test('wpisyOkresu — wpis bez daty nie wpada do żadnego okresu', () => {
  const z = [...logi, { moodValue: 5 }]
  assert.equal(wpisyOkresu(z, 'month', '2026-09').length, 3)
  assert.equal(wpisyOkresu(z, 'all').length, 6)
})

test('statystykiNastroju — dni liczone osobno od wpisów', () => {
  // Dwa wpisy z 1 września to jeden dzień, ale dwa wpisy.
  const s = statystykiNastroju(wpisyOkresu(logi, 'month', '2026-09'))
  assert.equal(s.wpisy, 3)
  assert.equal(s.dni, 2)
  assert.equal(s.srednia, 4)   // (5 + 3 + 4) / 3
})

test('statystykiNastroju — wpis bez oceny nie zaniża średniej', () => {
  const s = statystykiNastroju([{ date: '2026-09-01', moodValue: 4 }, { date: '2026-09-02' }])
  assert.equal(s.wpisy, 2)
  assert.equal(s.dni, 2)
  assert.equal(s.srednia, 4)
})

test('statystykiNastroju — brak ocen daje null, nie zero', () => {
  // Zero i „nie ma czego liczyć" to co innego: kafelek ma pokazać „—".
  assert.equal(statystykiNastroju([{ date: '2026-09-01' }]).srednia, null)
  assert.equal(statystykiNastroju([]).srednia, null)
  assert.equal(statystykiNastroju([]).wpisy, 0)
})

test('podsumowanieLat — od najnowszego roku, ze średnią i dniami', () => {
  const lata = podsumowanieLat(logi)
  assert.deepEqual(lata.map(r => r.rok), ['2026', '2025'])
  assert.equal(lata[0].wpisy, 4)
  assert.equal(lata[0].dni, 3)
  assert.equal(lata[1].srednia, 1)
})

test('podsumowanieLat — pomija wpisy bez sensownej daty', () => {
  const lata = podsumowanieLat([{ moodValue: 3 }, { date: '', moodValue: 3 }, { date: '2026-01-01', moodValue: 3 }])
  assert.deepEqual(lata.map(r => r.rok), ['2026'])
})
