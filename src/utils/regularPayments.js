import { useEffect, useRef } from 'react'
import {
  collection, onSnapshot, orderBy, query, where, getDocs,
  arrayUnion, arrayRemove, Timestamp, increment, doc, writeBatch
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { periodKey, isPaymentDue } from './paymentLogic'

export { periodKey, isPaymentActive, isPaymentDue } from './paymentLogic'

// Dodaje transakcję dla płatności i oznacza okres jako zrobiony.
// Atomowo: transakcja + saldo + odhaczenie okresu w jednym batchu.
// Bez batcha przerwanie między zapisami mogło dodać transakcję bez
// odhaczenia okresu → duplikat przy odświeżeniu.
export async function addTransactionForPayment(uid, p, period = periodKey()) {
  const batch = writeBatch(db)
  batch.set(doc(collection(db, 'users', uid, 'transactions')), {
    type: p.type, amount: p.amount,
    category: p.category, categoryId: p.categoryId, categoryIcon: p.categoryIcon,
    subcategoryId: p.subcategoryId || null, subcategoryLabel: p.subcategoryLabel || null,
    description: p.name, accountId: p.accountId || null,
    date: Timestamp.now(), createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    fromRegular: p.id
  })
  if (p.accountId) {
    const delta = p.type === 'expense' ? -p.amount : p.amount
    batch.update(doc(db, 'users', uid, 'accounts', p.accountId), { balance: increment(delta) })
  }
  batch.update(doc(db, 'users', uid, 'regularPayments', p.id), {
    donePeriods: arrayUnion(period)
  })
  await batch.commit()
}

// Cofa zaksięgowanie płatności: usuwa transakcje tego okresu utworzone przez
// „Zrobione"/auto-księgowanie, oddaje saldo kont i zdejmuje odhaczenie okresu.
// Atomowo (batch) — dzięki temu „Cofnij" + ponowne „Zrobione" nie duplikuje
// transakcji ani nie odejmuje salda podwójnie.
export async function removeTransactionForPayment(uid, p, period = periodKey()) {
  const snap = await getDocs(query(
    collection(db, 'users', uid, 'transactions'),
    where('fromRegular', '==', p.id)
  ))
  const batch = writeBatch(db)
  const balanceDeltas = {}
  snap.docs.forEach(d => {
    const t = d.data()
    const date = t.date?.toDate?.() ?? t.createdAt?.toDate?.()
    if (!date || periodKey(date) !== period) return
    batch.delete(d.ref)
    if (t.accountId) {
      const delta = t.type === 'expense' ? t.amount : -t.amount
      balanceDeltas[t.accountId] = (balanceDeltas[t.accountId] || 0) + delta
    }
  })
  Object.entries(balanceDeltas).forEach(([accountId, delta]) => {
    batch.update(doc(db, 'users', uid, 'accounts', accountId), { balance: increment(delta) })
  })
  batch.update(doc(db, 'users', uid, 'regularPayments', p.id), {
    donePeriods: arrayRemove(period)
  })
  await batch.commit()
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
