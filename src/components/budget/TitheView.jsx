import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { startOfMonth, endOfMonth } from 'date-fns'

const fmt = (n) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n)

export default function TitheView({ user, onClose }) {
  const [income, setIncome] = useState(0)
  const [tithe, setTithe]   = useState(0)
  const [paid, setPaid]     = useState(0)

  useEffect(() => {
    const start = startOfMonth(new Date())
    const end   = endOfMonth(new Date())
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('type', '==', 'income'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    )
    const unsub1 = onSnapshot(q, snap => {
      const total = snap.docs.reduce((s, d) => s + d.data().amount, 0)
      setIncome(total)
      setTithe(total * 0.1)
    })
    const q2 = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('categoryId', 'in', ['dziesiecina', 'ofiara']),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    )
    const unsub2 = onSnapshot(q2, snap => {
      setPaid(snap.docs.reduce((s, d) => s + d.data().amount, 0))
    })
    return () => { unsub1(); unsub2() }
  }, [user.uid])

  const remaining = Math.max(0, tithe - paid)
  const pct = tithe > 0 ? Math.min(100, (paid / tithe) * 100) : 0

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>⛪ Dziesięcina</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="tithe-content">
          <p className="tithe-month">Ten miesiąc</p>
          <div className="tithe-stat">
            <span>Przychody</span>
            <strong>{fmt(income)}</strong>
          </div>
          <div className="tithe-stat highlight">
            <span>Dziesięcina (10%)</span>
            <strong>{fmt(tithe)}</strong>
          </div>
          <div className="tithe-stat paid">
            <span>Już oddane</span>
            <strong>{fmt(paid)}</strong>
          </div>
          <div className="progress-bar-wrap" style={{ margin: '12px 0' }}>
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <div className="tithe-stat remaining">
            <span>Pozostało</span>
            <strong>{fmt(remaining)}</strong>
          </div>
          <p className="tithe-note">Dziesięcina i ofiary są automatycznie zliczane z kategorii Dziesięcina i Ofiara w transakcjach.</p>
        </div>
      </div>
    </div>
  )
}
