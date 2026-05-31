import { useState, useEffect } from 'react'
import { collection, addDoc, onSnapshot, orderBy, query, Timestamp, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format } from 'date-fns'
import { fmt, getCurrencyCode } from '../../utils/currency'

export default function TransferForm({ user, onClose }) {
  const [accounts, setAccounts] = useState([])
  const [fromId, setFromId]     = useState('')
  const [toId, setToId]         = useState('')
  const [amount, setAmount]     = useState('')
  const [date, setDate]         = useState(format(new Date(), 'yyyy-MM-dd'))
  const [comment, setComment]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setAccounts(list)
      if (list.length >= 1) setFromId(list[0].id)
      if (list.length >= 2) setToId(list[1].id)
    })
  }, [user.uid])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fromId || !toId) { setError('Wybierz oba konta'); return }
    if (fromId === toId) { setError('Wybierz różne konta'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Podaj kwotę'); return }
    setSaving(true)
    const amt = parseFloat(amount)
    const d = Timestamp.fromDate(new Date(date))
    const fromAcc = accounts.find(a => a.id === fromId)
    const toAcc   = accounts.find(a => a.id === toId)
    const desc = comment.trim() || undefined
    try {
      await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        type: 'expense', amount: amt, category: 'Przelew', categoryId: 'transfer',
        categoryIcon: '💸',
        description: `→ ${toAcc?.name}${desc ? ` · ${desc}` : ''}`,
        transferTo: toId, transferComment: desc || '',
        date: d, accountId: fromId, createdAt: Timestamp.now(), updatedAt: Timestamp.now()
      })
      await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        type: 'income', amount: amt, category: 'Przelew', categoryId: 'transfer',
        categoryIcon: '💸',
        description: `← ${fromAcc?.name}${desc ? ` · ${desc}` : ''}`,
        transferFrom: fromId, transferComment: desc || '',
        date: d, accountId: toId, createdAt: Timestamp.now(), updatedAt: Timestamp.now()
      })
      await updateDoc(doc(db, 'users', user.uid, 'accounts', fromId), { balance: (fromAcc.balance || 0) - amt })
      await updateDoc(doc(db, 'users', user.uid, 'accounts', toId),   { balance: (toAcc.balance   || 0) + amt })
      onClose()
    } catch { setError('Błąd zapisu'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>💸 Przelew między kontami</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        {accounts.length < 2 ? (
          <p style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
            Potrzebujesz co najmniej 2 konta.<br />Dodaj je w zakładce Konta.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Z konta</label>
              <select className="form-input" value={fromId} onChange={e => setFromId(e.target.value)}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance || 0)})</option>)}
              </select>
            </div>
            <div className="transfer-arrow">↓</div>
            <div className="form-group">
              <label>Na konto</label>
              <select className="form-input" value={toId} onChange={e => setToId(e.target.value)}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance || 0)})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Kwota ({getCurrencyCode()})</label>
              <input type="number" step="0.01" min="0" className="form-input amount-input"
                value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Data</label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Komentarz (opcjonalny)</label>
              <input type="text" className="form-input" value={comment}
                onChange={e => setComment(e.target.value)} placeholder="np. rata kredytu, zasilenie..." maxLength={80} />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Przelewanie...' : 'Wykonaj przelew'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
