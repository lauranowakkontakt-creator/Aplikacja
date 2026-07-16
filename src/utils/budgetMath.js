// Czysta logika wykresów budżetu — BEZ zależności od Firebase i Reacta,
// dzięki czemu da się ją testować w node (patrz test/budgetMath.test.js).
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, startOfDay, endOfDay, getDaysInMonth,
  subMonths, addMonths, eachMonthOfInterval, eachDayOfInterval,
  subWeeks, addWeeks, subYears, addYears, subDays, addDays,
} from 'date-fns'
import { pl } from 'date-fns/locale'

// Zakres dat i etykieta dla wybranego okresu ('day' | 'week' | 'month' | 'year').
export function getBounds(period, pivot) {
  if (period === 'day') {
    return { start: startOfDay(pivot), end: endOfDay(pivot), label: format(pivot, 'd MMMM yyyy', { locale: pl }) }
  }
  if (period === 'week') {
    const start = startOfWeek(pivot, { weekStartsOn: 1 })
    const end   = endOfWeek(pivot,   { weekStartsOn: 1 })
    return { start, end, label: `${format(start, 'd MMM', { locale: pl })} – ${format(end, 'd MMM yyyy', { locale: pl })}` }
  }
  if (period === 'year') {
    return { start: startOfYear(pivot), end: endOfYear(pivot), label: format(pivot, 'yyyy') }
  }
  return { start: startOfMonth(pivot), end: endOfMonth(pivot), label: format(pivot, 'LLLL yyyy', { locale: pl }) }
}

// Przesunięcie okresu o jeden w przód (dir > 0) lub w tył (dir < 0).
export function shiftPivot(period, pivot, dir) {
  if (period === 'day')  return dir > 0 ? addDays(pivot, 1)  : subDays(pivot, 1)
  if (period === 'week') return dir > 0 ? addWeeks(pivot, 1) : subWeeks(pivot, 1)
  if (period === 'year') return dir > 0 ? addYears(pivot, 1) : subYears(pivot, 1)
  return dir > 0 ? addMonths(pivot, 1) : subMonths(pivot, 1)
}

// Sumy przychodów/wydatków w miesięcznych kubełkach za ostatnie 12 miesięcy.
// Transakcje muszą mieć `date` (Date), `type` ('income'|'expense') i `amount`.
// `now` można podać w testach; domyślnie bieżąca chwila.
export function build12MonthTimeline(transactions, now = new Date()) {
  const months = eachMonthOfInterval({ start: subMonths(now, 11), end: now })
  return months.map(m => {
    const mStr = format(m, 'yyyy-MM')
    const txs = transactions.filter(t => format(t.date, 'yyyy-MM') === mStr)
    return {
      label: format(m, 'MMM', { locale: pl }),
      income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  })
}

// Dzienne sumy transakcji danego typu z ostatnich `days` dni, od najstarszego
// dnia do dziś — dane do mini-wykresów (sparkline) na kafelkach budżetu.
// Transakcje muszą mieć `date` (Date), `type` i `amount`.
export function buildDailySpark(transactions, { days = 7, type = 'expense', now = new Date() } = {}) {
  return Array.from({ length: days }, (_, i) => {
    const key = format(subDays(now, days - 1 - i), 'yyyy-MM-dd')
    return transactions
      .filter(t => t.type === type && format(t.date, 'yyyy-MM-dd') === key)
      .reduce((s, t) => s + t.amount, 0)
  })
}

// Zakres poprzedniego miesiąca do uczciwego porównania „miesiąc do miesiąca".
// Dla bieżącego (niepełnego) miesiąca porównujemy tylko do tego samego dnia
// poprzedniego miesiąca — porównanie z pełnym miesiącem na jego początku
// zawsze pokazywałoby duży „spadek". Dla miesięcy zamkniętych: pełny zakres.
export function prevMonthCompareBounds(currentMonth, now = new Date()) {
  const prev = subMonths(currentMonth, 1)
  const start = startOfMonth(prev)
  if (format(currentMonth, 'yyyy-MM') !== format(now, 'yyyy-MM')) {
    return { start, end: endOfMonth(prev) }
  }
  // krótszy poprzedni miesiąc (np. 31 marca vs luty) — dosuwamy do jego końca
  const day = Math.min(now.getDate(), endOfMonth(prev).getDate())
  return { start, end: endOfDay(new Date(prev.getFullYear(), prev.getMonth(), day)) }
}

// Oś czasu dopasowana do wybranego okresu — grube, czytelne kubełki:
//  - 'year'  → 12 kubełków miesięcznych danego roku,
//  - 'month' → tygodnie danego miesiąca (T1..T5),
//  - 'week'  → 7 kubełków dziennych (pon–nd),
//  - 'day'   → pusta (pojedynczy dzień nie ma sensownej osi).
// Transakcje muszą mieć `date` (Date), `type` ('income'|'expense') i `amount`.
export function buildPeriodTimeline(transactions, period, pivot) {
  if (period === 'day') return []

  // Lista kubełków jako zakresy dat [start, end] + etykieta.
  let buckets = []
  if (period === 'year') {
    buckets = eachMonthOfInterval({ start: startOfYear(pivot), end: endOfYear(pivot) })
      .map(m => ({ label: format(m, 'LLL', { locale: pl }), start: startOfMonth(m), end: endOfMonth(m) }))
  } else if (period === 'week') {
    buckets = eachDayOfInterval({ start: startOfWeek(pivot, { weekStartsOn: 1 }), end: endOfWeek(pivot, { weekStartsOn: 1 }) })
      .map(d => ({ label: format(d, 'EEEEEE', { locale: pl }), start: startOfDay(d), end: endOfDay(d) }))
  } else { // month → tygodnie
    const ms = startOfMonth(pivot)
    const total = getDaysInMonth(pivot)
    for (let i = 0, wk = 1; i < total; i += 7, wk++) {
      const s = addDays(ms, i)
      const e = addDays(ms, Math.min(i + 6, total - 1))
      buckets.push({ label: `T${wk}`, start: startOfDay(s), end: endOfDay(e) })
    }
  }

  return buckets.map(b => {
    let income = 0, expense = 0
    transactions.forEach(t => {
      if (t.date < b.start || t.date > b.end) return
      if (t.type === 'income')  income  += t.amount
      else if (t.type === 'expense') expense += t.amount
    })
    return {
      label: b.label,
      income,
      expense,
    }
  })
}
