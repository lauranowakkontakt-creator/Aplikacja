// Czysta logika modułu Notatnik — bez Firebase, testowalna w node
// (patrz test/notesLogic.test.js). Operacje na Firestore są w NotesDashboard.

// Normalizacja do wyszukiwania: małe litery + bez polskich znaków,
// żeby "swieta" znalazło "Święta".
export const normalize = (s) => (s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/ł/g, 'l')

// Tagi z pola tekstowego: rozdzielone przecinkami, bez pustych i duplikatów,
// bez wiodącego #, przycięte.
export function parseTags(input) {
  const seen = new Set()
  const out = []
  for (const raw of String(input || '').split(',')) {
    const t = raw.trim().replace(/^#+/, '')
    if (!t) continue
    const key = normalize(t)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

// Filtrowanie: fraza przeszukuje tytuł, treść i tagi (bez znaków diakrytycznych);
// tag (jeśli podany) musi występować w notatce.
export function filterNotes(notes, search = '', tag = null) {
  const q = normalize(search.trim())
  const tagKey = tag ? normalize(tag) : null
  return notes.filter(n => {
    if (tagKey && !(n.tags || []).some(t => normalize(t) === tagKey)) return false
    if (!q) return true
    const hay = normalize(`${n.title || ''} ${n.content || ''} ${(n.tags || []).join(' ')}`)
    return hay.includes(q)
  })
}

// Sortowanie: przypięte najpierw, w obrębie grup — ostatnio edytowane u góry.
// `updatedAt`/`createdAt` mogą być Timestampami Firestore (mają .toMillis) albo datami.
const ts = (v) => (typeof v?.toMillis === 'function' ? v.toMillis() : v instanceof Date ? v.getTime() : 0)

export function sortNotes(notes) {
  return [...notes].sort((a, b) =>
    (b.pinned === true) - (a.pinned === true) ||
    (ts(b.updatedAt) || ts(b.createdAt)) - (ts(a.updatedAt) || ts(a.createdAt))
  )
}

// Wszystkie tagi z notatek (unikalne, zachowana pierwsza pisownia), posortowane
// wg liczby użyć malejąco.
export function collectTags(notes) {
  const counts = new Map() // key -> { label, count }
  for (const n of notes) for (const t of (n.tags || [])) {
    const key = normalize(t)
    const e = counts.get(key)
    if (e) e.count++
    else counts.set(key, { label: t, count: 1 })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).map(e => e.label)
}

// Krótki podgląd treści do karty notatki.
export function preview(content, maxLen = 160) {
  const s = String(content || '').replace(/\s+/g, ' ').trim()
  return s.length <= maxLen ? s : s.slice(0, maxLen).trimEnd() + '…'
}
