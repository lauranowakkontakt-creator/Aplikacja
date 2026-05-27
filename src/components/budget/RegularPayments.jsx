import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc, updateDoc, arrayUnion, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format } from 'date-fns'
import { fmt } from '../../utils/currency'
import RegularPaymentForm from './RegularPaymentForm'

const FREQ_LABELS = { monthly: 'miesięcznie', weekly: 'tygodniowo', yearly: 'rocznie' }

export default function RegularPayments({ user }) {
  const [payments, setPayments] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPayment, setEditPayment] = useState(null)

  const THIS_PERIOD = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'regularPayments'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPayments(list)
      setLoading(false)
    })
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  // Auto-add payments that aren't done yet
  useEffect(() => {
    if (!payments.length) return
    payments.forEach(async (p) => {
      if (p.autoAdd && !p.donePeriods?.includes(THIS_PERIOD)) {
        await addTransactionForPayment(p)
      }
    })
  }, [payments.map(p=>p.id).join(',')])

  const addTransactionForPayment = async (p) => {
    try {
      await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        type: p.type, amount: p.amount,
        category: p.category, categoryId: p.categoryId, categoryIcon: p.categoryIcon,
        description: p.name, accountId: p.accountId || null,
        date: Timestamp.now(), createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
        fromRegular: p.id
      })
      await updateDoc(doc(db, 'users', user.uid, 'regularPayments', p.id), {
        donePeriods: arrayUnion(THIS_PERIOD)
      })
    } catch {}
  }

  const markDone = async (p) => {
    if (p.autoAdd) {
      await addTransactionForPayment(p)
    } else {
      await updateDoc(doc(db, 'users', user.uid, 'regularPayments', p.id), {
        donePeriods: arrayUnion(THIS_PERIOD)
      })
    }
  }

  const markUndone = async (p) => {
    const next = (p.donePeriods || []).filter(d => d !== THIS_PERIOD)
    await updateDoc(doc(db, 'users', user.uid, 'regularPayments', p.id), { donePeriods: next })
  }

  const handleDelete = async (id) => {
    if (!confirm('Usunąć tę regularną płatność?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'regularPayments', id))
  }

  const totalMonthly = payments
    .filter(p => p.frequency === 'monthly' && p.type === 'expense')
    .reduce((s, p) => s + p.amount, 0)

  const getAccount = (id) => accounts.find(a => a.id === id)

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div className="regular-payments">
      {payments.length > 0 && (
        <div className="regular-summary">
          <span className="regular-summary-label">Suma stałych wydatków / miesiąc</span>
          <span className="regular-summary-amount">{fmt(totalMonthly)}</span>
        </div>
      )}

      <button className="btn-add-account" onClick={() => { setEditPayment(null); setShowForm(true) }}>
        + Dodaj płatność
      </button>

      {payments.length === 0 ? (
        <div className="list-empty">
          <p>Brak regularnych płatności</p>
          <p className="list-empty-hint">Dodaj np. czynsz, Spotify, abonament telefonu</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {payments.map(p => {
            const done  = p.donePeriods?.includes(THIS_PERIOD)
            const acc   = getAccount(p.accountId)
            return (
              <div key={p.id} style={{
                background: 'var(--surface)', border: `1px solid ${done ? '#27AE6040' : 'var(--border)'}`,
                borderLeft: `3px solid ${done ? '#27AE60' : p.type === 'income' ? '#27AE60' : 'var(--expense)'}`,
                borderRadius: 12, padding: '12px 14px', opacity: done ? 0.75 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{p.categoryIcon || '🔄'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                      {p.autoAdd && <span style={{ fontSize: 9, background: 'rgba(201,75,40,0.2)', color: 'var(--primary)', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>AUTO</span>}
                      {done && <span style={{ fontSize: 9, background: 'rgba(39,174,96,0.2)', color: '#27AE60', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>ZROBIONE</span>}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {p.category} · {FREQ_LABELS[p.frequency]}{p.frequency === 'monthly' ? ` (${p.dayOfMonth}.)` : ''}
                      {acc ? ` · ${acc.name}` : ''}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: p.type === 'income' ? '#27AE60' : 'var(--expense)' }}>
                      {p.type === 'income' ? '+' : '-'}{fmt(p.amount)}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {!done ? (
                        <button style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(39,174,96,0.15)', border: '1px solid #27AE6060', borderRadius: 6, color: '#27AE60', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => markDone(p)}>
                          {p.autoAdd ? '⚡ Dodaj' : '✓ Zrobione'}
                        </button>
                      ) : (
                        <button style={{ fontSize: 11, padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer' }}
                          onClick={() => markUndone(p)}>
                          ↩ Cofnij
                        </button>
                      )}
                      <button className="t-btn" onClick={() => { setEditPayment(p); setShowForm(true) }}>✏️</button>
                      <button className="t-btn delete" onClick={() => handleDelete(p.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <RegularPaymentForm
          user={user}
          onClose={() => { setShowForm(false); setEditPayment(null) }}
          editData={editPayment}
        />
      )}
    </div>
  )
}
