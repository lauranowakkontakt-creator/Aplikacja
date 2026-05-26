import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { format } from 'date-fns'

const EXPENSE_CATEGORIES = ['Jedzenie', 'Rachunki', 'Transport', 'Rozrywka', 'Zdrowie', 'Ubrania', 'Subskrypcje', 'Prezenty', 'Edukacja', 'Dom', 'Inne']
const INCOME_CATEGORIES = ['Wynagrodzenie', 'Freelance', 'Premia', 'Zwrot', 'Prezent', 'Inne']

export default function TransactionForm({ user, onClose, editData }) {
  const [type, setType] = useState(editData?.type || 'expense')
  const [amount, setAmount] = useState(editData?.amount?.toString() || '')
  const [category, setCategory] = useState(editData?.category || '')
  const [description, setDescription] = useState(editData?.description || '')
  const [date, setDate] = useState(editData?.date ? format(editData.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  useEffect(() => {
    if (!categories.includes(category)) setCategory('')
  }, [type])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Podaj prawidłową kwotę')
      return
    }
    if (!category) {
      setError('Wybierz kategorię')
      return
    }

    setSaving(true)
    setError('')

    const data = {
      type,
      amount: parseFloat(amount),
      category,
      description: description.trim(),
      date: Timestamp.fromDate(new Date(date)),
      updatedAt: Timestamp.now()
    }

    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'transactions', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), {
          ...data,
          createdAt: Timestamp.now()
        })
      }
      onClose()
    } catch (err) {
      setError('Błąd zapisu. Spróbuj ponownie.')
      setSaving(false)
    }
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
            <button
              type="button"
              className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => setType('expense')}
            >
              Wydatek
            </button>
            <button
              type="button"
              className={`type-btn ${type === 'income' ? 'active income' : ''}`}
              onClick={() => setType('income')}
            >
              Przychód
            </button>
          </div>

          {/* Kwota */}
          <div className="form-group">
            <label>Kwota (PLN)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="form-input"
              autoFocus
            />
          </div>

          {/* Kategoria */}
          <div className="form-group">
            <label>Kategoria</label>
            <div className="category-grid">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`category-chip ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Opis */}
          <div className="form-group">
            <label>Opis (opcjonalny)</label>
            <input
              type="text"
              placeholder="np. Biedronka, Spotify..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              maxLength={100}
            />
          </div>

          {/* Data */}
          <div className="form-group">
            <label>Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input"
            />
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
