import { useState } from 'react'
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { IconClose } from '../Icons'

const ACCOUNT_TYPES = [
  { id: 'bank',       label: 'Konto bankowe', icon: '🏦' },
  { id: 'cash',       label: 'Gotówka',        icon: '💵' },
  { id: 'card',       label: 'Karta',          icon: '💳' },
  { id: 'revolut',    label: 'Revolut/Mobile', icon: '📱' },
  { id: 'savings',    label: 'Oszczędności',   icon: '🐷' },
  { id: 'investment', label: 'Inwestycje',      icon: '📈' },
]

const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP']

const COLORS = ['#C94B28', '#6B9E72', '#4A90D9', '#9B59B6', '#E67E22', '#1ABC9C', '#E74C3C', '#F39C12']

export default function AccountForm({ user, onClose, editData }) {
  const [name, setName]         = useState(editData?.name || '')
  const [type, setType]         = useState(editData?.type || 'bank')
  const [balance, setBalance]   = useState(editData?.balance?.toString() || '0')
  const [currency, setCurrency] = useState(editData?.currency || 'PLN')
  const [color, setColor]       = useState(editData?.color || COLORS[0])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Wpisz nazwę konta'); return }
    setSaving(true)
    const typeName = ACCOUNT_TYPES.find(t => t.id === type)?.label || type
    const data = { name: name.trim(), type, typeName, balance: parseFloat(balance) || 0, currency, color }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'accounts', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'accounts'), { ...data, createdAt: Timestamp.now() })
      }
      onClose()
    } catch {
      setError('Błąd zapisu'); setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj konto' : 'Nowe konto'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          {/* Typ konta */}
          <div className="form-group">
            <label>Typ konta</label>
            <div className="account-type-grid">
              {ACCOUNT_TYPES.map(t => (
                <button key={t.id} type="button"
                  className={`account-type-btn ${type === t.id ? 'active' : ''}`}
                  onClick={() => setType(t.id)}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nazwa */}
          <div className="form-group">
            <label>Nazwa (np. ING, Gotówka)</label>
            <input type="text" className="form-input" value={name}
              onChange={e => setName(e.target.value)} placeholder="Nazwa konta" autoFocus maxLength={30} />
          </div>

          {/* Saldo i waluta */}
          <div className="form-row">
            <div className="form-group" style={{flex:1}}>
              <label>Aktualne saldo</label>
              <input type="number" step="0.01" className="form-input" value={balance}
                onChange={e => setBalance(e.target.value)} />
            </div>
            <div className="form-group" style={{width:100}}>
              <label>Waluta</label>
              <select className="form-input" value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Kolor */}
          <div className="form-group">
            <label>Kolor</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} type="button"
                  className={`color-dot ${color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj konto'}
          </button>
        </form>
      </div>
    </div>
  )
}
