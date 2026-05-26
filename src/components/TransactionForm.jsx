import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, Timestamp, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import { format } from 'date-fns'

export const EXPENSE_CATEGORIES = [
  { id: 'jedzenie',      label: 'Jedzenie',      icon: '🍕', color: '#4CAF50' },
  { id: 'miasto',        label: 'Miasto',         icon: '☕', color: '#4CAF50' },
  { id: 'dom',           label: 'Dom',            icon: '🏠', color: '#4CAF50' },
  { id: 'zakupy',        label: 'Zakupy',         icon: '🛒', color: '#4CAF50' },
  { id: 'auto',          label: 'Auto',           icon: '🚗', color: '#2196F3' },
  { id: 'prezenty',      label: 'Prezenty',       icon: '🎁', color: '#2196F3' },
  { id: 'studia',        label: 'Studia',         icon: '📚', color: '#2196F3' },
  { id: 'firma',         label: 'Firma',          icon: '💻', color: '#2196F3' },
  { id: 'zdrowie',       label: 'Zdrowie',        icon: '❤️', color: '#F44336' },
  { id: 'wyjazdy',       label: 'Wyjazdy',        icon: '✈️', color: '#F44336' },
  { id: 'przyjemnosci',  label: 'Przyjemności',   icon: '🎬', color: '#F44336' },
  { id: 'edukacja',      label: 'Edukacja',       icon: '📖', color: '#F44336' },
  { id: 'dziesiecina',   label: 'Dziesięcina',    icon: '⛪', color: '#FF9800' },
  { id: 'ofiara',        label: 'Ofiara',         icon: '🕊️', color: '#FF9800' },
  { id: 'ubrania',       label: 'Ubrania',        icon: '👕', color: '#9C27B0' },
  { id: 'subskrypcje',   label: 'Subskrypcje',    icon: '📱', color: '#9C27B0' },
  { id: 'oszczednosci',  label: 'Oszczędności',   icon: '🐷', color: '#00BCD4' },
  { id: 'inne',          label: 'Inne',           icon: '📌', color: '#607D8B' },
]

export const INCOME_CATEGORIES = [
  { id: 'wynagrodzenie', label: 'Wynagrodzenie', icon: '💼', color: '#4CAF50' },
  { id: 'freelance',     label: 'Freelance',     icon: '💻', color: '#4CAF50' },
  { id: 'premia',        label: 'Premia',        icon: '⭐', color: '#FF9800' },
  { id: 'zwrot',         label: 'Zwrot',         icon: '↩️', color: '#2196F3' },
  { id: 'prezent',       label: 'Prezent',       icon: '🎀', color: '#E91E63' },
  { id: 'inwestycje',    label: 'Inwestycje',    icon: '📈', color: '#00BCD4' },
  { id: 'inne',          label: 'Inne',          icon: '📌', color: '#607D8B' },
]

export default function TransactionForm({ user, onClose, editData }) {
  const [type, setType]             = useState(editData?.type || 'expense')
  const [amount, setAmount]         = useState(editData?.amount?.toString() || '')
  const [category, setCategory]     = useState(editData?.categoryId || '')
  const [description, setDescription] = useState(editData?.description || '')
  const [date, setDate]             = useState(editData?.date ? format(editData.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [accountId, setAccountId]   = useState(editData?.accountId || '')
  const [accounts, setAccounts]     = useState([])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    if (!categories.find(c => c.id === category)) setCategory('')
  }, [type])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) { setError('Podaj prawidłową kwotę'); return }
    if (!category) { setError('Wybierz kategorię'); return }
    setSaving(true); setError('')
    const cat = categories.find(c => c.id === category)
    const data = {
      type, amount: parseFloat(amount),
      category: cat?.label || category,
      categoryId: category,
      categoryIcon: cat?.icon || '📌',
      description: description.trim(),
      date: Timestamp.fromDate(new Date(date)),
      accountId: accountId || null,
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'transactions', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), { ...data, createdAt: Timestamp.now() })
      }
      onClose()
    } catch { setError('Błąd zapisu. Spróbuj ponownie.'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj transakcję' : 'Nowa transakcja'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          {/* Typ */}
          <div className="type-toggle">
            <button type="button" className={`type-btn ${type === 'expense' ? 'active expense' : ''}`} onClick={() => setType('expense')}>Wydatek</button>
            <button type="button" className={`type-btn ${type === 'income' ? 'active income' : ''}`} onClick={() => setType('income')}>Przychód</button>
          </div>

          {/* Kwota */}
          <div className="form-group">
            <label>Kwota (PLN)</label>
            <input type="number" step="0.01" min="0" placeholder="0,00"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="form-input amount-input" autoFocus />
          </div>

          {/* Kategorie — kolorowe ikony */}
          <div className="form-group">
            <label>Kategoria</label>
            <div className="category-icons-grid">
              {categories.map(cat => (
                <button key={cat.id} type="button"
                  className={`cat-icon-btn ${category === cat.id ? 'active' : ''}`}
                  onClick={() => setCategory(cat.id)}
                >
                  <div className="cat-circle" style={{ background: category === cat.id ? cat.color : cat.color + '33', borderColor: category === cat.id ? cat.color : 'transparent' }}>
                    <span>{cat.icon}</span>
                  </div>
                  <span className="cat-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Konto */}
          {accounts.length > 0 && (
            <div className="form-group">
              <label>Konto</label>
              <div className="account-chips">
                <button type="button"
                  className={`account-chip ${!accountId ? 'active' : ''}`}
                  onClick={() => setAccountId('')}
                >Bez konta</button>
                {accounts.map(acc => (
                  <button key={acc.id} type="button"
                    className={`account-chip ${accountId === acc.id ? 'active' : ''}`}
                    style={accountId === acc.id ? { borderColor: acc.color, background: acc.color + '22' } : {}}
                    onClick={() => setAccountId(acc.id)}
                  >{acc.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Opis */}
          <div className="form-group">
            <label>Opis (opcjonalny)</label>
            <input type="text" placeholder="np. Biedronka, Spotify..."
              value={description} onChange={e => setDescription(e.target.value)}
              className="form-input" maxLength={100} />
          </div>

          {/* Data */}
          <div className="form-group">
            <label>Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj transakcję'}
          </button>
        </form>
      </div>
    </div>
  )
}
