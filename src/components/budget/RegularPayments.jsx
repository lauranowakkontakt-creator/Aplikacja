import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import RegularPaymentForm from './RegularPaymentForm'

const fmt = (n) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n)

const FREQ_LABELS = { monthly: 'miesięcznie', weekly: 'tygodniowo', yearly: 'rocznie' }

export default function RegularPayments({ user }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPayment, setEditPayment] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'regularPayments'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user.uid])

  const totalMonthly = payments
    .filter(p => p.frequency === 'monthly' && p.type === 'expense')
    .reduce((s, p) => s + p.amount, 0)

  const handleDelete = async (id) => {
    if (!confirm('Usunąć tę regularną płatność?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'regularPayments', id))
  }

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
        <div className="transaction-list">
          {payments.map(p => (
            <div key={p.id} className={`transaction-item ${p.type}`}
              onClick={() => { setEditPayment(p); setShowForm(true) }}>
              <div className="t-icon">{p.categoryIcon || '🔄'}</div>
              <div className="t-details">
                <span className="t-category">{p.name}</span>
                <span className="t-desc">{p.category} · {FREQ_LABELS[p.frequency]}</span>
                <span className="t-date">{p.dayOfMonth ? `${p.dayOfMonth}. każdego miesiąca` : ''}</span>
              </div>
              <div className="t-right">
                <span className={`t-amount ${p.type}`}>
                  {p.type === 'income' ? '+' : '-'}{fmt(p.amount)}
                </span>
                <div className="t-actions">
                  <button className="t-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
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
