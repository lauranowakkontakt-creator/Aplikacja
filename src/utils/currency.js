export const CURRENCIES = [
  { code: 'PLN', symbol: 'zł', name: 'Złoty polski' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dolar amerykański' },
  { code: 'GBP', symbol: '£', name: 'Funt brytyjski' },
  { code: 'CHF', symbol: 'CHF', name: 'Frank szwajcarski' },
  { code: 'CZK', symbol: 'Kč', name: 'Korona czeska' },
]

export function getCurrencyCode() {
  return localStorage.getItem('app_currency') || 'PLN'
}

export function setCurrencyCode(code) {
  localStorage.setItem('app_currency', code)
}

// Parsowanie kwoty wpisanej przez użytkownika: akceptuje przecinek dziesiętny
// ("12,50") i spacje ("1 200"). Zwraca NaN dla pustych/nieprawidłowych wartości.
export function parseAmount(v) {
  if (typeof v === 'number') return v
  const s = String(v ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (!s) return NaN
  return parseFloat(s)
}

export function fmt(n) {
  const code = getCurrencyCode()
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: code }).format(n ?? 0)
}

// Rozbija kwotę na część całkowitą (z grupowaniem tysięcy i ewentualnym znakiem
// minus) oraz dwucyfrową część dziesiętną — do dużego „hero" w stylu Revolut,
// gdzie grosze wyświetlamy mniejszą czcionką. Znak minus to U+2212 (−).
export function splitAmount(n) {
  const num = Number(n)
  const safe = Number.isFinite(num) ? num : 0
  const parts = Math.abs(safe)
    .toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .split(',')
  return { int: (safe < 0 ? '−' : '') + parts[0], dec: parts[1] ?? '00' }
}
