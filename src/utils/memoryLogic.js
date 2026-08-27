// Czysta logika modułu Wspomnik — bez Firebase, testowalna w node
// (patrz test/memoryLogic.test.js). Operacje na Firestore są w MemoriesDashboard.
//
// Model danych: jeden dokument = jedno wspomnienie.
//   { date: 'yyyy-MM-dd', title, text, tags: [], favorite: bool, createdAt, updatedAt }

import { normalize, collectTags } from './notesLogic.js'

export { collectTags }

const ts = (v) => (typeof v?.toMillis === 'function' ? v.toMillis() : v instanceof Date ? v.getTime() : 0)

// Oś czasu: od najnowszego dnia. W obrębie dnia — ostatnio dodane u góry.
export function sortMemories(memories) {
  return [...memories].sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || '')) ||
    ts(b.createdAt) - ts(a.createdAt)
  )
}

// Filtry łączą się (AND): fraza w tytule/treści/tagach, wybrany tag, ulubione.
export function filterMemories(memories, { search = '', tag = null, favoritesOnly = false } = {}) {
  const q = normalize(search.trim())
  const tagKey = tag ? normalize(tag) : null
  return memories.filter(m => {
    if (favoritesOnly && !m.favorite) return false
    if (tagKey && !(m.tags || []).some(t => normalize(t) === tagKey)) return false
    if (!q) return true
    const hay = normalize(`${m.title || ''} ${m.text || ''} ${(m.tags || []).join(' ')}`)
    return hay.includes(q)
  })
}

// Grupowanie w miesiące ('yyyy-MM'), od najnowszego. Wspomnienia bez daty
// trafiają do grupy 'bez-daty' na końcu — nie chcemy ich gubić.
export function groupByMonth(memories) {
  const map = new Map()
  for (const m of sortMemories(memories)) {
    const key = /^\d{4}-\d{2}/.test(String(m.date || '')) ? String(m.date).slice(0, 7) : 'bez-daty'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(m)
  }
  const groups = [...map.entries()].map(([key, items]) => ({ key, items }))
  const dated = groups.filter(g => g.key !== 'bez-daty').sort((a, b) => (a.key < b.key ? 1 : -1))
  return [...dated, ...groups.filter(g => g.key === 'bez-daty')]
}

// „Tego dnia" — wspomnienia z tego samego dnia i miesiąca w minionych latach.
// Zwraca kopie z polem `yearsAgo`, od najświeższych (rok temu przed pięć lat temu).
export function onThisDay(memories, today) {
  const mmdd = String(today).slice(5)
  const year = Number(String(today).slice(0, 4))
  return memories
    .filter(m => String(m.date || '').slice(5) === mmdd && Number(String(m.date).slice(0, 4)) < year)
    .map(m => ({ ...m, yearsAgo: year - Number(String(m.date).slice(0, 4)) }))
    .sort((a, b) => a.yearsAgo - b.yearsAgo || String(a.title || '').localeCompare(String(b.title || '')))
}

// Statystyki do kafelków.
export function memoryStats(memories, today) {
  const year = String(today).slice(0, 4)
  return {
    total: memories.length,
    thisYear: memories.filter(m => String(m.date || '').startsWith(year)).length,
    favorites: memories.filter(m => m.favorite).length,
    years: new Set(memories.map(m => String(m.date || '').slice(0, 4)).filter(y => /^\d{4}$/.test(y))).size,
  }
}

// Krótki podgląd treści na karcie.
export function preview(text, maxLen = 180) {
  const s = String(text || '').replace(/\s+/g, ' ').trim()
  return s.length <= maxLen ? s : s.slice(0, maxLen).trimEnd() + '…'
}
