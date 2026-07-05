import { useEffect, useRef } from 'react'
import {
  collection, onSnapshot, orderBy, query, updateDoc, arrayUnion,
  addDoc, Timestamp, increment, doc
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'

export const periodKey = (d = new Date()) => format(d, 'yyyy-MM')

// Czy płatność jest aktywna w danym dniu (mieści się w zakresie dat)
export function isPaymentActive(p, today = startOfDay(new Date())) {
  if (p.dateFrom && isBefore(today, startOfDay(parseISO(p.dateFrom)))) return false
  if (p.dateTo   && isAfter(today,  startOfDay(parseISO(p.dateTo))))   return false
  return true
}

// Czy płatność powinna zostać automatycznie/ręcznie zaksięgowana w tym okresie
export function isPaymentDue(p, period = periodKey()) {
  if (p.donePeriods?.includes(period)) return false
  if (!isPaymentActive(p)) return false
  if (p.frequency === 'monthly' && new Date().getDate() < (p.dayOfMonth || 1)) return false
  return true
}

// Dodaje transakcję dla płatności i oznacza okres jako zrobiony
export async function addTransactionForPayment(uid, p, period = periodKey()) {
  await addDoc(collection(db, 'users', uid, 'transactions'), {
    type: p.type, amount: p.amount,
    category: p.category, categoryId: p.categoryId, categoryIcon: p.categoryIcon,
    subcategoryId: p.subcategoryId || null, subcategoryLabel: p.subcategoryLabel || null,
    description: p.name, accountId: p.accountId || null,
    date: Timestamp.now(), createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    fromRegular: p.id
  })
  if (p.accountId) {
    const delta = p.type === 'expense' ? -p.amount : p.amount
    await updateDoc(doc(db, 'users', uid, 'accounts', p.accountId), { balance: increment(delta) })
  }
  await updateDoc(doc(db, 'users', uid, 'regularPayments', p.id), {
    donePeriods: arrayUnion(period)
  })
}

// Hook uruchamiany na poziomie aplikacji — księguje należne płatności AUTO w tle,
// niezależnie od tego, czy użytkownik wejdzie w zakładkę „Regularne".
export function useRegularPaymentsProcessor(uid) {
  const processed = useRef(new Set())
  useEffect(() => {
    if (!uid) return
    processed.current.clear()
    const q = query(collection(db, 'users', uid, 'regularPayments'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      const period = periodKey()
      snap.docs.forEach(d => {
        const p = { id: d.id, ...d.data() }
        if (!p.autoAdd) return
        const key = `${p.id}_${period}`
        if (processed.current.has(key)) return
        if (!isPaymentDue(p, period)) return
        processed.current.add(key)
        addTransactionForPayment(uid, p, period).catch(() => processed.current.delete(key))
      })
    })
  }, [uid])
}
