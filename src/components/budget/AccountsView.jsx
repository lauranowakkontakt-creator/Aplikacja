import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import AccountForm from './AccountForm'

const fmt = (n, currency = 'PLN') =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(n)

const ACCOUNT_ICONS = {
  bank: '🏦', cash: '💵', card: '💳', revolut: '📱', savings: '🐷', investment: '📈'
}

export default function AccountsView({ user }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editAccount, setEditAccount] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, (snap) => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user.uid])

  const totalPLN = accounts
    .filter(a => a.currency === 'PLN')
    .reduce((s, a) => s + (a.balance || 0), 0)

  const handleDelete = async (id) => {
    if (!confirm('Usunąć to konto?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'accounts', id))
  }

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div className="accounts-view">
      {/* Suma */}
      <div className="accounts-total">
        <span className="accounts-total-label">Suma wszystkich kont</span>
        <span className="accounts-total-amount">{fmt(totalPLN)}</span>
      </div>

      {/* Lista kont */}
      {accounts.length === 0 ? (
        <div className="list-empty">
          <p>Brak kont</p>
          <p className="list-empty-hint">Dodaj konto przyciskiem poniżej</p>
        </div>
      ) : (
        <div className="accounts-list">
          {accounts.map(acc => (
            <div key={acc.id} className="account-item" onClick={() => { setEditAccount(acc); setShowForm(true) }}>
              <div className="account-icon-wrap" style={{ background: acc.color + '22', borderColor: acc.color + '44' }}>
                <span className="account-icon">{ACCOUNT_ICONS[acc.type] || '🏦'}</span>
              </div>
              <div className="account-info">
                <span className="account-name">{acc.name}</span>
                <span className="account-type">{acc.typeName || acc.type}</span>
              </div>
              <div className="account-right">
                <span className="account-balance">{fmt(acc.balance || 0, acc.currency || 'PLN')}</span>
                <button className="t-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(acc.id) }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn-add-account" onClick={() => setShowForm(true)}>+ Dodaj konto</button>

      {showForm && (
        <AccountForm
          user={user}
          onClose={() => { setShowForm(false); setEditAccount(null) }}
          editData={editAccount}
        />
      )}
    </div>
  )
}
