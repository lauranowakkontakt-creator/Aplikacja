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

// Statystyki do kafelków. Świadomie BEZ serii i rekordu — wdzięczność nie jest
// wyścigiem, a licznik dni z rzędu robi z niej obowiązek.
export function gratitudeStats(entries, today) {
  return {
    total: entries.length,
    days: new Set(entries.map(e => e?.date).filter(Boolean)).size,
    month: countInMonth(entries, String(today).slice(0, 7)),
  }
}

// Wszystkie wpisy jako płaska lista, od najnowszych — do przeglądania
// i skakania między nimi strzałkami.
export function flatEntries(entries) {
  return groupByDay(entries).flatMap(g => [...g.items].reverse())
}
