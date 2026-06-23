import { collection, query, where, getDocs, updateDoc, arrayRemove } from 'firebase/firestore'
import { db } from '../firebase/config'

// Sny są zapisywane w kolekcji `users/{uid}/dreams`.
// Osoba może być powiązana ze snem na dwa sposoby:
//   - peopleIds  — uczestnicy wybrani jawnie z listy „kto brał udział"
//   - mentionIds — osoby wspomniane w treści przez @Imię (parsowane przy zapisie)
// Sekcja „Sny" w karcie osoby (Osoby) pokazuje sny, gdzie osoba jest uczestnikiem LUB wspomniana.

// ─── Emocje po obudzeniu ───────────────────────────────────────────────────
export const DREAM_EMOTIONS = [
  { id: 'spokoj',        label: 'Spokój',          color: '#5FBF98' },
  { id: 'radosc',        label: 'Radość',          color: '#E6C04A' },
  { id: 'ulga',          label: 'Ulga',            color: '#7CC4E6' },
  { id: 'wdziecznosc',   label: 'Wdzięczność',     color: '#C9A24A' },
  { id: 'nadzieja',      label: 'Nadzieja',        color: '#7BCBB0' },
  { id: 'ekscytacja',    label: 'Ekscytacja',      color: '#EA964B' },
  { id: 'milosc',        label: 'Miłość',          color: '#E8607A' },
  { id: 'tesknota',      label: 'Tęsknota',        color: '#9FB2EC' },
  { id: 'zdezorientowanie', label: 'Zagubienie',   color: '#B79AE0' },
  { id: 'niepokoj',      label: 'Niepokój',        color: '#E0B15A' },
  { id: 'lek',           label: 'Lęk',             color: '#6E89DE' },
  { id: 'smutek',        label: 'Smutek',          color: '#6E89DE' },
  { id: 'zlosc',         label: 'Złość',           color: '#E66A4E' },
  { id: 'wstyd',         label: 'Wstyd',           color: '#D98B5F' },
  { id: 'obrzydzenie',   label: 'Obrzydzenie',     color: '#A878DC' },
]

// ─── Kategorie snów ─────────────────────────────────────────────────────────
export const DREAM_CATEGORIES = [
  { id: 'zwykly',       label: 'Zwykły',           color: '#7C8AF0' },
  { id: 'przyjemny',    label: 'Przyjemny',        color: '#5FBF98' },
  { id: 'koszmar',      label: 'Koszmar',          color: '#E66A4E' },
  { id: 'proroczy',     label: 'Proroczy',         color: '#C9A24A' },
  { id: 'duchowy',      label: 'Duchowy',          color: '#9CCB5E' },
  { id: 'powtarzajacy', label: 'Powtarzający się', color: '#5BB6D9' },
  { id: 'swiadomy',     label: 'Świadomy (lucid)', color: '#9B7CF0' },
  { id: 'dziwny',       label: 'Dziwny',           color: '#B79AE0' },
  { id: 'o_bliskich',   label: 'O bliskich',       color: '#D98B5F' },
  { id: 'koik',         label: 'Inny',             color: '#9E9E9E' },
]

export const getEmotion  = (id) => DREAM_EMOTIONS.find(e => e.id === id)
export const getCategory = (id) => DREAM_CATEGORIES.find(c => c.id === id)

// Wyłuskaj z treści snu osoby wspomniane przez @Imię.
// Dopasowuje najdłuższe pasujące imię (obsługa imion wielowyrazowych, np. „Przyjaciel Paweł").
export function parseMentions(text, people) {
  if (!text) return []
  const found = new Set()
  const sorted = [...people].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0))
  for (const p of sorted) {
    if (!p.name) continue
    // @Imię jako całe słowo (z granicą na końcu lub spacją/znakiem interpunkcyjnym)
    const esc = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp('@' + esc + '(?![\\p{L}\\p{N}])', 'u')
    if (re.test(text)) found.add(p.id)
  }
  return [...found]
}

// Wszystkie osoby powiązane ze snem (uczestnicy + wspomniani).
export const dreamPeopleIds = (dream) =>
  [...new Set([...(dream.peopleIds || []), ...(dream.mentionIds || [])])]

// Przy trwałym usunięciu osoby — odpiąć ją od snów (sny zostają).
export async function scrubPersonFromDreams(uid, personId) {
  for (const field of ['peopleIds', 'mentionIds']) {
    const snap = await getDocs(query(
      collection(db, 'users', uid, 'dreams'), where(field, 'array-contains', personId)
    ))
    await Promise.all(snap.docs.map(d =>
      updateDoc(d.ref, { [field]: arrayRemove(personId) })
    ))
  }
}
