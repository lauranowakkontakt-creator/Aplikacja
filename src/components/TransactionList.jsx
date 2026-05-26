import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

// Fallback dla starych transakcji bez categoryIcon
const LEGACY_ICONS = {
  Jedzenie: '🍕', Rachunki: '📄', Transport: '🚗', Rozrywka: '🎬', Zdrowie: '❤️',
  Ubrania: '👕', Subskrypcje: '📱', Prezenty: '🎁', Edukacja: '📖', Dom: '🏠',
  Wynagrodzenie: '💼', Freelance: '💻', Premia: '⭐', Zwrot: '↩️', Prezent: '🎀',
  Miasto: '☕', Zakupy: '🛒', Auto: '🚗', Firma: '💻', Wyjazdy: '✈️',
  Przyjemności: '🎬', Dziesięcina: '⛪', Ofiara: '🕊️', Oszczędności: '🐷',
  Przelew: '💸', Inne: '📌'
}

const fmt = (n) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n)
const hide = '••••'

export default function TransactionList({ transactions, loading, onEdit, user, privateMode }) {
  const handleDelete = async (id) => {
    if (!confirm('Usunąć tę transakcję?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'transactions', id))
  }

  if (loading) return <div className="list-loading">Ładowanie...</div>

  if (transactions.length === 0) {
    return (
      <div className="list-empty">
        <p>Brak transakcji w tym miesiącu</p>
        <p className="list-empty-hint">Kliknij + aby dodać pierwszą</p>
      </div>
    )
  }

  return (
    <div className="transaction-list">
      {transactions.map(t => (
        <div key={t.id} className={`transaction-item ${t.type}`}>
          <div className="t-icon">{t.categoryIcon || LEGACY_ICONS[t.category] || '📌'}</div>
          <div className="t-details">
            <span className="t-category">{t.category}</span>
            {t.description && <span className="t-desc">{t.description}</span>}
            <span className="t-date">{format(t.date, 'd MMM', { locale: pl })}</span>
          </div>
          <div className="t-right">
            <span className={`t-amount ${t.type}`}>
              {privateMode ? hide : `${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}`}
            </span>
            <div className="t-actions">
              <button className="t-btn edit" onClick={() => onEdit(t)}>✏️</button>
              <button className="t-btn delete" onClick={() => handleDelete(t.id)}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
