export const CURRENCIES = [
  { code: 'PLN', symbol: 'zł', name: 'Złoty polski' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dolar amerykański' },
  { code: 'GBP', symbol: '£', name: 'Funt brytyjski' },
  { code: 'CHF', symbol: 'CHF', name: 'Frank szwajcarski' },
]

export function getCurrencyCode() {
  return localStorage.getItem('app_currency') || 'PLN'
}

export function setCurrencyCode(code) {
  localStorage.setItem('app_currency', code)
}

export function fmt(n) {
  const code = getCurrencyCode()
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: code }).format(n ?? 0)
}
