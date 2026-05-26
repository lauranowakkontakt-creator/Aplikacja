import { useState } from 'react'
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../TransactionForm'

const FREQUENCIES = [
  { id: 'monthly', label: 'Co miesiąc' },
  { id: 'weekly',  label: 'Co tydzień' },
  { id: 'yearly',  label: 'Co rok' },
]

export default function RegularPaymentForm({ user, onClose, editData }) {
  const [type, setType]           = useState(editData?.type || 'expense')
  const [name, setName]           = useState(editData?.name || '')
  const [amount, setAmount]       = useState(editData?.amount?.toString() || '')
  const [category, setCategory]   = useState(editData?.categoryId || '')
  const [frequency, setFrequency] = useState(editData?.frequency || 'monthly')
  const [dayOfMonth, setDay]      = useState(editData?.dayOfMonth?.toString() || '1')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Wpisz nazwę'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Podaj kwotę'); return }
    if (!category) { setError('Wybierz kategorię'); return }
    setSaving(true)
    const cat = categories.find(c => c.id === category)
    const data = {
      type, name: name.trim(), amount: parseFloat(amount),
      category: cat?.label || category, categoryId: category,
      categoryIcon: cat?.icon || '🔄',
      frequency, dayOfMonth: parseInt(dayOfMonth) || 1,
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'regularPayments', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'regularPayments'), { ...data, createdAt: Timestamp.now() })
      }
      onClose()
    } catch { setError('Błąd zapisu'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj płatność' : 'Regularna płatność'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="type-toggle">
            <button type="button" className={`type-btn ${type === 'expense' ? 'active expense' : ''}`} onClick={() => setType('expense')}>Wydatek</button>
            <button type="button" className={`type-btn ${type === 'income' ? 'active income' : ''}`} onClick={() => setType('income')}>Przychód</button>
          </div>

          <div className="form-group">
            <label>Nazwa (np. Spotify, Czynsz)</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={50} />
          </div>

          <div className="form-group">
            <label>Kwota (PLN)</label>
            <input type="number" step="0.01" min="0" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

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

          <div className="form-row">
            <div className="form-group" style={{flex:1}}>
              <label>Częstotliwość</label>
              <select className="form-input" value={frequency} onChange={e => setFrequency(e.target.value)}>
                {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            {frequency === 'monthly' && (
              <div className="form-group" style={{width:100}}>
                <label>Dzień miesiąca</label>
                <input type="number" min="1" max="31" className="form-input" value={dayOfMonth} onChange={e => setDay(e.target.value)} />
              </div>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj płatność'}
          </button>
        </form>
      </div>
    </div>
  )
}
