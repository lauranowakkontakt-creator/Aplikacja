// Czysta matematyka przewalutowania — BEZ Firebase i Reacta, żeby dało się ją
// testować w node (patrz test/exchange.test.js).
//
// Umowa jest jedna i trzyma się jej cały formularz przelewu:
//
//     otrzymane = wysłane × kurs
//
// czyli kurs zawsze mówi „ile jednostek waluty docelowej dostaję za jedną
// jednostkę waluty źródłowej". Przy wymianie 1000 PLN → 230 EUR kurs to 0,23,
// a nie 4,35. Ludzie na co dzień mówią raczej „euro po 4,35", więc do
// wyświetlenia jest osobny `formatRateLine`, który pokazuje obie strony.

// Pieniądze zaokrąglamy do groszy, kursy do 6 miejsc — przy kursach rzędu 0,23
// dwa miejsca gubiłyby grube dziesiątki złotych na większych kwotach.
const MONEY_DECIMALS = 2
const RATE_DECIMALS  = 6

const roundTo = (n, decimals) => {
  if (!Number.isFinite(n)) return null
  const f = 10 ** decimals
  // Korekta błędu binarnego: 1.005 * 100 to 100.49999... i Math.round zaniża.
  return Math.round((n + Number.EPSILON * Math.abs(n)) * f) / f
}

export const roundMoney = (n) => roundTo(n, MONEY_DECIMALS)
export const roundRate  = (n) => roundTo(n, RATE_DECIMALS)

// Kurs z dwóch kwot — ile waluty docelowej wyszło z jednostki źródłowej.
// Zwraca null, gdy którejś kwoty jeszcze nie ma albo jest zerowa/ujemna:
// formularz w takiej sytuacji po prostu nie pokazuje kursu, zamiast liczyć
// dzielenie przez zero albo wynik ujemny.
export function rateFromAmounts(sent, received) {
  if (!(sent > 0) || !(received > 0)) return null
  return roundRate(received / sent)
}

// Kwota otrzymana z kursu. Symetryczna do rateFromAmounts.
export function receivedFromRate(sent, rate) {
  if (!(sent > 0) || !(rate > 0)) return null
  return roundMoney(sent * rate)
}

// Kwota wysłana potrzebna, żeby otrzymać zadaną kwotę przy danym kursie.
export function sentFromRate(received, rate) {
  if (!(received > 0) || !(rate > 0)) return null
  return roundMoney(received / rate)
}

// Kurs do wpisania w polu formularza — bez zbędnych zer na końcu, żeby
// „0,230000" nie straszyło w inpucie.
export function formatRateInput(rate) {
  if (!(rate > 0)) return ''
  return String(roundRate(rate))
}

// Czytelny opis kursu pokazywany pod polami. Podajemy obie strony, bo przy
// wymianie PLN → EUR sam kurs 0,23 nic nikomu nie mówi, a „1 EUR = 4,3478 PLN"
// od razu daje się porównać z kantorem.
export function formatRateLine(sent, received, fromCur, toCur) {
  const rate = rateFromAmounts(sent, received)
  if (rate == null || !fromCur || !toCur || fromCur === toCur) return null
  const num = (n) => n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  return `1 ${fromCur} = ${num(rate)} ${toCur}  ·  1 ${toCur} = ${num(roundRate(1 / rate))} ${fromCur}`
}
