// Przeglądanie wpisów: losowa „przypominajka" i skakanie między pozycjami.
// Wspólne dla Wdzięcznika i Wspomnika (patrz test/browsing.test.js).

// Deterministyczny wybór „na chybił trafił". Ten sam `seed` daje zawsze ten sam
// wpis, więc przypominajka nie podmienia się przy każdym przerysowaniu ekranu —
// zmienia się dopiero, gdy zmieni się dzień albo klikniesz „losuj".
export function pickBySeed(list, seed = 0) {
  if (!Array.isArray(list) || list.length === 0) return null
  // xorshift na liczbie całkowitej — tanio i wystarczająco „losowo" jak na
  // wybór jednego wpisu z listy.
  let x = Math.abs(Math.floor(seed)) + 0x9e3779b9
  x ^= x << 13; x >>>= 0
  x ^= x >> 17
  x ^= x << 5;  x >>>= 0
  return list[x % list.length]
}

// Numer dnia — bazowy seed, żeby przypominajka była „jedna na dzień".
export function daySeed(dateStr) {
  const t = Date.parse(String(dateStr) + 'T00:00:00Z')
  return Number.isNaN(t) ? 0 : Math.floor(t / 86400000)
}

// Sąsiedzi na liście — do strzałek „poprzedni / następny" w podglądzie wpisu.
// Zwraca null-e na krańcach, więc przyciski da się po prostu wyłączyć.
export function neighbors(list, id) {
  const items = Array.isArray(list) ? list : []
  const index = items.findIndex(x => x?.id === id)
  if (index === -1) return { index: -1, total: items.length, prev: null, next: null }
  return {
    index,
    total: items.length,
    prev: index > 0 ? items[index - 1] : null,
    next: index < items.length - 1 ? items[index + 1] : null,
  }
}
