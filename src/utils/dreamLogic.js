// Czysta logika modułu Sen — BEZ zależności od Firebase, dzięki czemu da się ją
// testować bez inicjalizacji bazy. Funkcje operujące na Firestore są w `dreams.js`.

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

export const SYMBOL_COLORS = [
  '#5BB6D9', '#5FBF98', '#9B7CF0', '#E0B15A', '#E8607A', '#7BCBB0',
  '#B79AE0', '#EA964B', '#6E89DE', '#C9A24A', '#A878DC', '#7C8AF0',
]

export const getEmotion  = (id) => DREAM_EMOTIONS.find(e => e.id === id)
export const getCategory = (id) => DREAM_CATEGORIES.find(c => c.id === id)

// Wyłuskaj z treści snu osoby wspomniane przez @Imię (najdłuższe dopasowanie pierwsze).
export function parseMentions(text, people) {
  if (!text) return []
  const found = new Set()
  const sorted = [...people].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0))
  for (const p of sorted) {
    if (!p.name) continue
    const esc = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp('@' + esc + '(?![\\p{L}\\p{N}])', 'u')
    if (re.test(text)) found.add(p.id)
  }
  return [...found]
}

// Wyłuskaj z treści snu symbole oznaczone przez #nazwa (najdłuższe dopasowanie pierwsze).
export function parseSymbols(text, symbols) {
  if (!text) return []
  const found = new Set()
  const sorted = [...symbols].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0))
  for (const s of sorted) {
    if (!s.name) continue
    const esc = s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp('#' + esc + '(?![\\p{L}\\p{N}])', 'u')
    if (re.test(text)) found.add(s.id)
  }
  return [...found]
}

// Wszystkie osoby powiązane ze snem (uczestnicy + wspomniani).
export const dreamPeopleIds = (dream) =>
  [...new Set([...(dream.peopleIds || []), ...(dream.mentionIds || [])])]

// Rdzeń imienia/słowa — bez końcowej samogłoski, żeby łapać polskie odmiany
// (Kasia → Kasi → Kasię/Kasią/Kasi, Ola → Ol → Olę/Olą...).
export const nameStem = (name) => {
  const s = (name || '').trim()
  return s.length >= 3 ? s.replace(/(a|e|o|y|i|ą|ę|u|ó)$/u, '') : s
}
