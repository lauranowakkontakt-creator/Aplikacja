import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

const fmt = (n) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n)

export default function SearchPanel({ user, onClose }) {
  const [all, setAll]           = useState([])
  const [search, setSearch]     = useState('')
  const [filterType, setType]   = useState('all')
  const [filterCat, setCat]     = useState('')

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => {
      setAll(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() })))
    })
  }, [user.uid])

  const results = all.filter(t => {
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || t.type === filterType
    return matchSearch && matchType
  }).slice(0, 50)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-tall">
        <div className="modal-header">
          <h3>🔍 Szukaj transakcji</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="search-filters">
          <input type="text" className="form-input" placeholder="Szukaj po opisie lub kategorii..."
            value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          <div className="type-toggle" style={{ marginTop: 8 }}>
            {['all','expense','income'].map(t => (
              <button key={t} type="button"
                className={`type-btn ${filterType === t ? 'active expense' : ''}`}
                style={filterType === t && t === 'income' ? { background: 'var(--income)' } : {}}
                onClick={() => setType(t)}
              >{{ all: 'Wszystkie', expense: 'Wydatki', income: 'Przychody' }[t]}</button>
            ))}
          </div>
        </div>
        <div className="search-results">
          {results.length === 0 && <p className="list-empty">Brak wyników</p>}
          {results.map(t => (
            <div key={t.id} className={`transaction-item ${t.type}`}>
              <div className="t-icon">{t.categoryIcon || '📌'}</div>
              <div className="t-details">
                <span className="t-category">{t.category}</span>
                {t.description && <span className="t-desc">{t.description}</span>}
                <span className="t-date">{t.date ? format(t.date, 'd MMM yyyy', { locale: pl }) : ''}</span>
              </div>
              <span className={`t-amount ${t.type}`}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
