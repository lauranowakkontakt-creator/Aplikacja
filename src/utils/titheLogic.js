// Czysta logika Dziesięciny (patrz test/titheLogic.test.js).
//
// Jak to działa po zmianie:
//  * dziesięcinę włącza się w ustawieniach modułu i samemu ustawia procent,
//  * podstawy NIE liczymy z wybranych kategorii przychodu — przy każdym
//    przychodzie zaznacza się „wliczyć do dziesięciny" (pole `tithe: true`),
//  * zaznaczone przychody zbierają się w pulę; po oddaniu dziesięciny
//    dostają `titheSettledAt` i znikają z puli (zaczyna się od zera).

export const DEFAULT_PERCENT = 10
export const TITHE_CATEGORY_ID = 'dziesiecina'
export const TITHE_CATEGORY = {
  id: TITHE_CATEGORY_ID, label: 'Dziesięcina', icon: 'IcCross', color: '#C97A55',
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Ustawienia z Firestore bywają niepełne albo z ręcznie wpisanym procentem —
// domykamy je do sensownego zakresu, żeby UI nigdy nie dostał NaN.
export function normalizeTitheSettings(raw) {
  const pct = Number(raw?.percent)
  return {
    enabled: raw?.enabled === true,
    percent: Number.isFinite(pct) && pct > 0 && pct <= 100 ? pct : DEFAULT_PERCENT,
  }
}

// Czy przychód wchodzi do puli: zaznaczony i jeszcze nierozliczony.
export const countsToTithe = (t) =>
  t?.type === 'income' && t?.tithe === true && !t?.titheSettledAt

// Pula: nierozliczone, zaznaczone przychody.
export function tithePool(transactions = []) {
  const items = transactions.filter(countsToTithe)
  return {
    items,
    count: items.length,
    base: round2(items.reduce((s, t) => s + (Number(t.amount) || 0), 0)),
  }
}

// Kwota do oddania przy danym procencie.
export const titheDue = (base, percent) =>
  round2((Number(base) || 0) * ((Number(percent) || 0) / 100))

// Ile już oddano z bieżącej puli (wpłaty po ostatnim rozliczeniu). Podajemy
// jawnie listę wydatków w kategorii dziesięcina — widok filtruje je po dacie.
export const sumPaid = (payments = []) =>
  round2(payments.reduce((s, t) => s + (Number(t.amount) || 0), 0))

// Postęp 0–100. Gdy nie ma z czego płacić, pokazujemy 0 — nie 100 —
// bo „nic do oddania" to nie to samo co „oddane".
export function titheProgress(due, paid) {
  if (!(due > 0)) return 0
  return Math.max(0, Math.min(100, Math.round((paid / due) * 100)))
}

// Kategoria „Dziesięcina" dopisuje się sama, gdy funkcja zostanie włączona —
// bez niej nie byłoby jak zaksięgować wpłaty.
export function ensureTitheCategory(categories = []) {
  return categories.some(c => c.id === TITHE_CATEGORY_ID)
    ? categories
    : [...categories, TITHE_CATEGORY]
}
