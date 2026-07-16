// Czysta logika wykresów budżetu — BEZ zależności od Firebase i Reacta,
// dzięki czemu da się ją testować w node (patrz test/budgetMath.test.js).
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, startOfDay, endOfDay,
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

// Oś czasu dopasowana do wybranego okresu:
//  - 'year'  → 12 kubełków miesięcznych danego roku,
//  - 'month' → kubełki dzienne danego miesiąca,
//  - 'week'  → 7 kubełków dziennych,
//  - 'day'   → pusta (pojedynczy dzień nie ma sensownej osi).
// Transakcje muszą mieć `date` (Date), `type` ('income'|'expense') i `amount`.
export function buildPeriodTimeline(transactions, period, pivot) {
  if (period === 'day') return []
  const gran = period === 'year' ? 'month' : 'day'
  const range =
    period === 'year'  ? { start: startOfYear(pivot),  end: endOfYear(pivot) } :
    period === 'week'  ? { start: startOfWeek(pivot, { weekStartsOn: 1 }), end: endOfWeek(pivot, { weekStartsOn: 1 }) } :
                         { start: startOfMonth(pivot), end: endOfMonth(pivot) }
  const keyFmt = gran === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd'
  const lblFmt = gran === 'month' ? 'LLL' : 'd'
  const units  = gran === 'month' ? eachMonthOfInterval(range) : eachDayOfInterval(range)

  const map = {}
  transactions.forEach(t => {
    const k = format(t.date, keyFmt)
    if (!map[k]) map[k] = { income: 0, expense: 0 }
    if (t.type === 'income')  map[k].income  += t.amount
    else if (t.type === 'expense') map[k].expense += t.amount
  })
  return units.map(u => {
    const k = format(u, keyFmt)
    return {
      label: format(u, lblFmt, { locale: pl }),
      income:  map[k]?.income  || 0,
      expense: map[k]?.expense || 0,
    }
  })
}
