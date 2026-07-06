// Czysta logika wykresów budżetu — BEZ zależności od Firebase i Reacta,
// dzięki czemu da się ją testować w node (patrz test/budgetMath.test.js).
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, startOfDay, endOfDay,
  subMonths, addMonths, eachMonthOfInterval,
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
