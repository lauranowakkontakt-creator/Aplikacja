import { daysSince } from './prayerStats.js'

// Filtry i porządek próśb w widoku „Dziś".
//
// Wszystko tutaj liczy się z samych danych prośby — bez Firestore i bez
// Reacta — więc każdy wariant („po osobach", „najdawniej", tagi) da się
// sprawdzić w teście. Widok tylko podaje listę i wybór użytkownika.

export const MAX_TAGS = 8

const key = (s) => String(s || '').trim().toLowerCase()

// Tagi wpisuje się po przecinku albo z nowej linii — ludzie robią i tak, i tak.
export function parseTags(input) {
  return normalizeTags(String(input || '').split(/[,\n]/))
}

// Puste wypadają, powtórki (bez względu na wielkość liter) scalają się do
// pierwszego zapisu, żeby „Zdrowie" i „zdrowie" nie były dwoma tagami.
export function normalizeTags(list) {
  const out = []
  const seen = new Set()
  for (const raw of list || []) {
    const tag = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 24)
    if (!tag || seen.has(key(tag))) continue
    seen.add(key(tag))
    out.push(tag)
    if (out.length >= MAX_TAGS) break
  }
  return out
}

export function toggleTag(list, tag) {
  const cur = list || []
  return cur.some(t => key(t) === key(tag))
    ? cur.filter(t => key(t) !== key(tag))
    : normalizeTags([...cur, tag])
}

export const tagsToText = (tags = []) => tags.join(', ')

// Wszystkie tagi z podanych próśb, od najczęstszego. Z tego robi się pasek
// wyboru — lista tagów nie jest osobnym bytem w bazie, tylko sumą tego, co
// wpisano przy prośbach.
export function collectTags(intentions = []) {
  const map = new Map()
  for (const i of intentions) {
    for (const tag of normalizeTags(i?.tags || [])) {
      const k = key(tag)
      if (map.has(k)) map.get(k).count++
      else map.set(k, { tag, count: 1 })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'pl'))
}

// Wybór tagów działa jak „którykolwiek z" — zaznaczenie Zdrowia i Pracy ma
// pokazać oba tematy, a nie prośby otagowane jednocześnie dwoma.
export function hasAnyTag(item, tags = []) {
  if (!tags.length) return true
  const mine = new Set((item?.tags || []).map(key))
  return tags.some(t => mine.has(key(t)))
}

// Prośba „chwilowa": ma swój okres albo przyszła z wydarzenia w kalendarzu.
// Takie same się kończą, więc w kolejce idą przed te, o które modlić się można
// codziennie i bez pośpiechu.
export const isTemporary = (item) =>
  Boolean(item?.scheduleFrom || item?.scheduleTo || item?.dateTo || item?.eventId)

export const NEGLECT_FILTERS = [
  { id: 'all', label: 'Wszystkie', minDays: 0 },
  { id: 'd3',  label: '3+ dni',    minDays: 3 },
  { id: 'd7',  label: '7+ dni',    minDays: 7 },
  { id: 'd14', label: '14+ dni',   minDays: 14 },
  { id: 'd30', label: '30+ dni',   minDays: 30 },
]

export const findNeglectFilter = (id) =>
  NEGLECT_FILTERS.find(f => f.id === id) || NEGLECT_FILTERS[0]

// Ile dni od ostatniej modlitwy; „nigdy" to nie zero dni, tylko nieskończenie
// dawno — inaczej prośby nietknięte uciekałyby z filtra zaniedbania.
export function neglectDays(item, teraz = new Date()) {
  const d = daysSince(item?.prayedDates, teraz)
  return d === null ? Infinity : d
}

export const matchesNeglect = (item, minDays, teraz = new Date()) =>
  !minDays || neglectDays(item, teraz) >= minDays

export function filterIntentions(items = [], filters = {}, teraz = new Date()) {
  const { tags = [], neglect = 'all', personId = null } = filters
  const minDays = findNeglectFilter(neglect).minDays
  return items.filter(i =>
    (!personId || i.personId === personId) &&
    hasAnyTag(i, tags) &&
    matchesNeglect(i, minDays, teraz)
  )
}

export const SORT_MODES = [
  { id: 'smart',    label: 'Domyślnie' },
  { id: 'person',   label: 'Po osobach' },
  { id: 'priority', label: 'Priorytet' },
  { id: 'neglect',  label: 'Najdawniej' },
]

const prio      = (i) => i.priority || 3
const prayedOn  = (i, date) => Boolean(date && i.prayedDates?.includes(date))
const cmpNum    = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const cmpTitle  = (a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'pl')

// Porządek w obrębie jednego trybu. Odhaczone dziś spadają na dół zawsze —
// widok ma pokazywać, co jeszcze przede mną, a nie chwalić za zrobione.
function comparator(mode, { date, teraz, pinTemporary }) {
  return (a, b) => {
    const ap = prayedOn(a, date), bp = prayedOn(b, date)
    if (ap !== bp) return ap ? 1 : -1
    if (pinTemporary) {
      const at = isTemporary(a), bt = isTemporary(b)
      if (at !== bt) return at ? -1 : 1
    }
    if (mode === 'neglect') {
      const c = cmpNum(neglectDays(b, teraz), neglectDays(a, teraz))
      if (c) return c
    } else if (mode === 'priority') {
      const c = prio(b) - prio(a)
      if (c) return c
    } else {
      // Domyślnie: pilne (P5) przed wszystkim, dalej wprost po priorytecie.
      const a5 = prio(a) === 5, b5 = prio(b) === 5
      if (a5 !== b5) return a5 ? -1 : 1
      const c = prio(b) - prio(a)
      if (c) return c
    }
    return cmpTitle(a, b)
  }
}

export function sortIntentions(items = [], opts = {}) {
  const { mode = 'smart', date = null, teraz = new Date(), pinTemporary = true } = opts
  return [...items].sort(comparator(mode, { date, teraz, pinTemporary }))
}

/**
 * Tryb „po osobach": zamiast jednej wymieszanej listy — kolejno jedna osoba
 * i komplet jej próśb, potem następna. Osoby bez ani jednej prośby w wyniku
 * filtrowania w ogóle się nie pojawiają.
 *
 * Kolejność osób: najpierw te z czymś chwilowym (jak w liście płaskiej),
 * potem od najdawniej niemodlonej. Osoba odhaczona w całości idzie na koniec.
 */
export function groupByPerson(items = [], people = [], opts = {}) {
  const { date = null, teraz = new Date(), pinTemporary = true } = opts
  const byId = new Map()
  for (const item of items) {
    const id = item.personId || null
    if (!byId.has(id)) byId.set(id, [])
    byId.get(id).push(item)
  }
  const grupy = [...byId.entries()].map(([id, lista]) => {
    const posortowane = sortIntentions(lista, { mode: 'smart', date, teraz, pinTemporary })
    const zostalo = posortowane.filter(i => !prayedOn(i, date))
    return {
      id: id || 'bez-osoby',
      person: id ? people.find(p => p.id === id) || null : null,
      label: (id && people.find(p => p.id === id)?.name) || 'Bez osoby',
      items: posortowane,
      done: zostalo.length === 0,
      temporary: pinTemporary && zostalo.some(isTemporary),
      // Najdawniej niemodlona prośba decyduje o miejscu osoby w kolejce.
      days: zostalo.length ? Math.max(...zostalo.map(i => neglectDays(i, teraz))) : -1,
    }
  })
  return grupy.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.temporary !== b.temporary) return a.temporary ? -1 : 1
    const c = cmpNum(b.days, a.days)
    if (c) return c
    return a.label.localeCompare(b.label, 'pl')
  })
}

export const DEFAULT_FILTERS = { tags: [], neglect: 'all', sort: 'smart', pinTemporary: true }

// Zapis z localStorage bywa stary albo z ręcznej edycji — po normalizacji ma
// być zawsze komplet pól o znanych wartościach, żeby widok nie musiał zgadywać.
export function normalizeFilters(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  return {
    tags: normalizeTags(Array.isArray(r.tags) ? r.tags : []),
    neglect: findNeglectFilter(r.neglect).id,
    sort: SORT_MODES.some(m => m.id === r.sort) ? r.sort : DEFAULT_FILTERS.sort,
    pinTemporary: r.pinTemporary !== false,
  }
}

export const isDefaultFilters = (f) => {
  const n = normalizeFilters(f)
  return !n.tags.length && n.neglect === 'all' && n.sort === 'smart' && n.pinTemporary
}

const STORAGE_KEY = 'mw_prayer_filters'

export function loadFilters() {
  try { return normalizeFilters(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) }
  catch { return { ...DEFAULT_FILTERS } }
}

export function saveFilters(filters) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeFilters(filters))) }
  catch { /* prywatne okno / brak miejsca — filtry po prostu nie przeżyją odświeżenia */ }
}
