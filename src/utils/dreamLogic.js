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

// Formy osoby, którymi można ją oznaczyć w śnie: pełne imię, samo imię (pierwszy człon)
// oraz dowolne ksywki zapisane w polu `aliases`. Bez pustych i duplikatów.
export function personForms(person) {
  if (!person) return []
  const forms = new Set()
  const name = (person.name || '').trim()
  if (name) {
    forms.add(name)
    const first = name.split(/\s+/)[0]
    if (first) forms.add(first)
  }
  for (const a of (person.aliases || [])) {
    const t = (a || '').trim()
    if (t) forms.add(t)
  }
  return [...forms]
}

// Wyłuskaj z treści snu osoby wspomniane przez @Forma (najdłuższe dopasowanie pierwsze).
// Formą może być pełne imię, samo imię lub ksywka (patrz personForms).
export function parseMentions(text, people) {
  if (!text) return []
  const found = new Set()
  const entries = []
  for (const p of people) for (const form of personForms(p)) entries.push({ form, id: p.id })
  entries.sort((a, b) => b.form.length - a.form.length)
  for (const { form, id } of entries) {
    const esc = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp('@' + esc + '(?![\\p{L}\\p{N}])', 'u')
    if (re.test(text)) found.add(id)
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

// Wykrywa aktywny „trigger" autouzupełniania na końcu tekstu przed kursorem.
//  - @osoba  — jedno słowo (imię/odmiana),
//  - #symbol — do 4 słów oddzielonych POJEDYNCZĄ spacją (np. „#stary dom"),
//    dzięki czemu można tworzyć symbole wielowyrazowe; spacja po ostatnim słowie
//    kończy tag, więc dalsze pisanie zdania działa normalnie.
// Zwraca { type, query, start } albo null. `start` to indeks znaku # / @.
export function detectTrigger(before) {
  const mSymbol = before.match(/#([\p{L}\p{N}]*(?: +[\p{L}\p{N}]+){0,3})$/u)
  if (mSymbol) return { type: 'symbol', query: mSymbol[1], start: before.length - mSymbol[1].length - 1 }
  const mPerson = before.match(/@([\p{L}\p{N}]*)$/u)
  if (mPerson) return { type: 'person', query: mPerson[1], start: before.length - mPerson[1].length - 1 }
  return null
}

// Tokenizacja treści snu do podświetlania. Zwraca segmenty:
//   { t: tekst do wyświetlenia (BEZ prefiksu @/#), kind: 'plain'|'person'|'symbol',
//     id: id encji lub null, color: kolor lub null }
// Zasada: znaczniki @Imię i #symbol są w zapisanym tekście, ale prefiks NIE jest
// pokazywany — segment dostaje kolor. Dzięki temu podświetlanie jest pewne
// (klucz to prefiks, nie zgadywanie po nazwie). Dla zgodności ze starymi snami
// (symbole bez #) podświetlamy też zwykłe słowa równe DOKŁADNIE nazwie symbolu.
export function tokenizeDreamText(text, people = [], symbols = []) {
  if (!text) return []
  const isWord = (c) => !!c && /[\p{L}\p{N}]/u.test(c)
  const lowText = text.toLowerCase()

  // Symbole przypięte do snu — najdłuższa nazwa pierwsza (żeby „stary dom" wygrał
  // nad „dom"). Dopasowujemy zarówno po #, jak i w zwykłym tekście (także WIELE słów).
  const symList = symbols.filter(s => s.name?.trim())
    .map(s => ({ s, low: s.name.trim().toLowerCase() }))
    .sort((a, b) => b.low.length - a.low.length)
  // Formy osób (imię, odmiany, ksywki) — najdłuższa pierwsza.
  const forms = []
  for (const p of people) for (const f of personForms(p)) if (f) forms.push({ p, low: f.toLowerCase(), len: f.length })
  forms.sort((a, b) => b.len - a.len)

  const segs = []
  let plain = ''
  const pushPlain = () => { if (plain) { segs.push({ t: plain, kind: 'plain', id: null, color: null }); plain = '' } }
  const symAt = (pos) => {
    const rest = lowText.slice(pos)
    return symList.find(({ low }) => rest.startsWith(low) && !isWord(text[pos + low.length]))
  }

  let i = 0
  while (i < text.length) {
    const c = text[i]
    const atBoundary = i === 0 || !isWord(text[i - 1])

    // Znaczniki #symbol / @osoba — prefiks jest pochłaniany (nie pokazujemy go).
    if (atBoundary && (c === '#' || c === '@')) {
      const restLow = lowText.slice(i + 1)
      if (c === '#') {
        const m = symAt(i + 1)
        if (m) { pushPlain(); segs.push({ t: text.slice(i + 1, i + 1 + m.low.length), kind: 'symbol', id: m.s.id, color: m.s.color || '#5BB6D9' }); i += 1 + m.low.length; continue }
        const w = text.slice(i + 1).match(/^[\p{L}\p{N}]+/u)
        if (w) { pushPlain(); segs.push({ t: w[0], kind: 'symbol', id: null, color: '#5BB6D9' }); i += 1 + w[0].length; continue }
      } else {
        const m = forms.find(({ low, len }) => restLow.startsWith(low) && !isWord(text[i + 1 + len]))
        if (m) { pushPlain(); segs.push({ t: text.slice(i + 1, i + 1 + m.len), kind: 'person', id: m.p.id, color: m.p.color || null }); i += 1 + m.len; continue }
        const w = text.slice(i + 1).match(/^[\p{L}\p{N}]+/u)
        if (w) { pushPlain(); segs.push({ t: w[0], kind: 'person', id: null, color: null }); i += 1 + w[0].length; continue }
      }
    }

    // Zwykły tekst: podświetl nazwę symbolu (też wielowyrazową) bez #.
    if (atBoundary && isWord(c)) {
      const m = symAt(i)
      if (m) { pushPlain(); segs.push({ t: text.slice(i, i + m.low.length), kind: 'symbol', id: m.s.id, color: m.s.color || '#5BB6D9' }); i += m.low.length; continue }
    }

    plain += c
    i++
  }
  pushPlain()
  return segs
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
