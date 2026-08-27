// Czysta logika modułu Wdzięcznik — bez Firebase, testowalna w node
// (patrz test/gratitudeLogic.test.js). Operacje na Firestore są w GratitudeDashboard.
//
// Model danych: jeden dokument = jedna rzecz, za którą jesteśmy wdzięczni.
//   { date: 'yyyy-MM-dd', text: string, createdAt: Timestamp }
// Dzień jest kluczem tekstowym (yyyy-MM-dd), więc porównania i sortowanie
// robimy na stringach — bez stref czasowych.

import { normalize } from './notesLogic.js'

const DAY_MS = 86400000

// Przesunięcie dnia o `delta` dób. Liczone w UTC, żeby zmiana czasu
// (letni/zimowy) nie gubiła ani nie dublowała dnia w serii.
export function shiftDay(dateStr, delta) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d) + delta * DAY_MS)
  const p = (n) => String(n).padStart(2, '0')
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`
}

// `createdAt` bywa Timestampem Firestore (.toMillis), Datą albo niczym.
const ts = (v) => (typeof v?.toMillis === 'function' ? v.toMillis() : v instanceof Date ? v.getTime() : 0)

// Wpisy zgrupowane w dni: dni od najnowszego, w dniu — w kolejności dodania.
export function groupByDay(entries) {
  const map = new Map()
  for (const e of entries) {
    if (!e?.date) continue
    if (!map.has(e.date)) map.set(e.date, [])
    map.get(e.date).push(e)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([date, items]) => ({
      date,
      items: [...items].sort((a, b) => ts(a.createdAt) - ts(b.createdAt)),
    }))
}

// Seria: ile dni z rzędu (do dziś) ma choć jeden wpis. Jeśli dzisiaj jeszcze
// nic nie zapisano, seria liczy się od wczoraj — dzień jeszcze trwa, więc
// nie zerujemy jej przedwcześnie.
export function currentStreak(entries, today) {
  const days = new Set(entries.map(e => e?.date).filter(Boolean))
  if (days.size === 0) return 0
  let cur = days.has(today) ? today : shiftDay(today, -1)
  let n = 0
  while (days.has(cur)) { n++; cur = shiftDay(cur, -1) }
  return n
}

// Najdłuższa seria w całej historii.
export function longestStreak(entries) {
  const days = [...new Set(entries.map(e => e?.date).filter(Boolean))].sort()
  let best = 0, run = 0, prev = null
  for (const d of days) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1
    if (run > best) best = run
    prev = d
  }
  return best
}

// Liczba wpisów w miesiącu podanym jako 'yyyy-MM'.
export function countInMonth(entries, month) {
  return entries.filter(e => String(e?.date || '').startsWith(month)).length
}

// Filtrowanie po treści — bez znaków diakrytycznych, żeby „wdziecznosc"
// znalazło „wdzięczność".
export function filterEntries(entries, search = '') {
  const q = normalize(search.trim())
  if (!q) return entries
  return entries.filter(e => normalize(e?.text || '').includes(q))
}

// Statystyki do kafelków: wpisy łącznie, dni z wpisem, seria, ten miesiąc.
export function gratitudeStats(entries, today) {
  return {
    total: entries.length,
    days: new Set(entries.map(e => e?.date).filter(Boolean)).size,
    streak: currentStreak(entries, today),
    best: longestStreak(entries),
    month: countInMonth(entries, String(today).slice(0, 7)),
  }
}
