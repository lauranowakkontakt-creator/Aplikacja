// Czysta logika inwestycji (krypto, surowce itp.) — BEZ Firebase i Reacta,
// żeby dało się ją testować w node (patrz test/investmentMath.test.js).
//
// Inwestycja to konto typu 'investment': jej `balance` to AKTUALNA WARTOŚĆ
// rynkowa (nie zmienia się transakcjami, tylko ręczną aktualizacją), a `invested`
// to łączna kwota wpłacona (koszt). Różnica to zysk/strata.

export const isInvestment = (a) => a?.type === 'investment'

// Zysk/strata pojedynczej inwestycji. `percent` jest null, gdy nic nie wpłacono
// (nie da się policzyć procentu od zera).
export function investmentStats(account) {
  const value = account?.balance || 0
  const invested = account?.invested || 0
  const profit = value - invested
  const percent = invested > 0 ? (profit / invested) * 100 : null
  return { value, invested, profit, percent }
}

// Sumy pola `balance` (= aktualna wartość) w rozbiciu na waluty.
export function sumByCurrency(accounts) {
  return accounts.reduce((acc, a) => {
    const cur = a.currency || 'PLN'
    acc[cur] = (acc[cur] || 0) + (a.balance || 0)
    return acc
  }, {})
}

// Scala kilka map { waluta: kwota } w jedną (do wiersza „Razem").
export function mergeTotals(...maps) {
  const out = {}
  for (const m of maps) {
    if (!m) continue
    for (const [cur, v] of Object.entries(m)) out[cur] = (out[cur] || 0) + v
  }
  return out
}

// Zbiorcze sumy inwestycji w rozbiciu na waluty: wartość, wpłacone, zysk.
export function investmentTotals(accounts) {
  const invs = accounts.filter(isInvestment)
  const value = {}, invested = {}, profit = {}
  for (const a of invs) {
    const cur = a.currency || 'PLN'
    const s = investmentStats(a)
    value[cur]    = (value[cur]    || 0) + s.value
    invested[cur] = (invested[cur] || 0) + s.invested
    profit[cur]   = (profit[cur]   || 0) + s.profit
  }
  return { value, invested, profit }
}

// Przygotowuje wpis historii wartości. `now` można podać w testach.
export function makeSnapshot(value, invested, now = new Date()) {
  return { date: now, value: Number(value) || 0, invested: Number(invested) || 0 }
}

// Historia z policzoną zmianą względem POPRZEDNIego (starszego) wpisu.
// Wejście: tablica wpisów { date, value, invested } w kolejności chronologicznej
// (najstarszy pierwszy). Zwraca od najnowszego do najstarszego, każdy z `delta`
// (zmiana wartości względem wpisu wcześniejszego; null dla pierwszego pomiaru).
export function historyWithDeltas(history = []) {
  return history.map((h, i) => ({
    ...h,
    delta: i > 0 ? h.value - history[i - 1].value : null,
  })).reverse()
}
