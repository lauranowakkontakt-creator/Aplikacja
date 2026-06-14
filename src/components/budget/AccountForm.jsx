import { useState } from 'react'
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { CURRENCIES as CURRENCY_LIST } from '../../utils/currency'
import { IconClose, IconBank, IconCash, IconCard, IconRepeat, IconSavings, IconTrendUp, IconPlus } from '../Icons'

const ACCOUNT_TYPES = [
  { id: 'bank',       label: 'Konto bankowe', Icon: IconBank },
  { id: 'cash',       label: 'Gotówka',        Icon: IconCash },
  { id: 'card',       label: 'Karta',          Icon: IconCard },
  { id: 'revolut',    label: 'Revolut/Mobile', Icon: IconRepeat },
  { id: 'savings',    label: 'Oszczędności',   Icon: IconSavings },
  { id: 'investment', label: 'Inwestycje',      Icon: IconTrendUp },
]

const CURRENCIES = CURRENCY_LIST.map(c => c.code)

const COLORS = ['#C94B28', '#6B9E72', '#4A90D9', '#9B59B6', '#E67E22', '#1ABC9C', '#E74C3C', '#F39C12']

export default function AccountForm({ user, onClose, editData }) {
  // Konto z zapisanym typem spoza listy traktujemy jako „własny"
  const isKnownType = (t) => ACCOUNT_TYPES.some(at => at.id === t)
  const [name, setName]         = useState(editData?.name || '')
  const [type, setType]         = useState(editData ? (isKnownType(editData.type) ? editData.type : 'custom') : 'bank')
  const [customType, setCustomType] = useState(editData && !isKnownType(editData.type) ? (editData.typeName || '') : '')
  const [balance, setBalance]   = useState(editData?.balance?.toString() || '0')
  const [currency, setCurrency] = useState(editData?.currency || 'PLN')
  const [color, setColor]       = useState(editData?.color || COLORS[0])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Wpisz nazwę konta'); return }
    if (type === 'custom' && !customType.trim()) { setError('Wpisz nazwę własnego typu'); return }
    setSaving(true)
    const typeName = type === 'custom'
      ? customType.trim()
      : (ACCOUNT_TYPES.find(t => t.id === type)?.label || type)
    // Dla własnego typu zapisujemy slug jako type, żeby filtry/ikony działały
    const storedType = type === 'custom' ? `custom:${customType.trim().toLowerCase()}` : type
    const data = { name: name.trim(), type: storedType, typeName, balance: parseFloat(balance) || 0, currency, color }
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
                  <t.Icon size={18} />
                  <span>{t.label}</span>
                </button>
              ))}
              <button type="button"
                className={`account-type-btn ${type === 'custom' ? 'active' : ''}`}
                onClick={() => setType('custom')}
              >
                <IconPlus size={18} />
                <span>Własny</span>
              </button>
            </div>
            {type === 'custom' && (
              <input type="text" className="form-input" value={customType}
                onChange={e => setCustomType(e.target.value)}
                placeholder="np. Kryptowaluty, Pożyczka, PayPal..." maxLength={30}
                style={{ marginTop: 8 }} />
            )}
          </div>

          {/* Nazwa */}
          <div className="form-group">
            <label>Nazwa (np. ING, Gotówka)</label>
            <input type="text" className="form-input" value={name}
              onChange={e => setName(e.target.value)} placeholder="Nazwa konta" maxLength={30} />
          </div>

          {/* Saldo i waluta */}
          <div className="form-row">
            <div className="form-group" style={{flex:1}}>
              <label>Aktualne saldo</label>
              <input type="number" inputMode="decimal" step="0.01" className="form-input" value={balance}
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
