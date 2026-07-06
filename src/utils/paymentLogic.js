// Czysta logika płatności regularnych — BEZ zależności od Firebase, dzięki czemu
// da się ją testować bez inicjalizacji bazy. Funkcje Firestore są w `regularPayments.js`.
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'

export const periodKey = (d = new Date()) => format(d, 'yyyy-MM')

// Czy płatność jest aktywna w danym dniu (mieści się w zakresie dat)
export function isPaymentActive(p, today = startOfDay(new Date())) {
  if (p.dateFrom && isBefore(today, startOfDay(parseISO(p.dateFrom)))) return false
  if (p.dateTo   && isAfter(today,  startOfDay(parseISO(p.dateTo))))   return false
  return true
}

// Czy płatność powinna zostać automatycznie/ręcznie zaksięgowana w tym okresie
export function isPaymentDue(p, period = periodKey(), today = new Date()) {
  if (p.donePeriods?.includes(period)) return false
  if (!isPaymentActive(p, startOfDay(today))) return false
  if (p.frequency === 'monthly' && today.getDate() < (p.dayOfMonth || 1)) return false
  return true
}
