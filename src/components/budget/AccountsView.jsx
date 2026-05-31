import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc, where, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import AccountForm from './AccountForm'
import { fmt } from '../../utils/currency'
import { CatIcon, IconBank, IconCash, IconCard, IconSavings, IconEdit, IconTrash } from '../Icons'

const fmtAcc = (n, currency = 'PLN') =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(n)

const ACCOUNT_ICON_COMPS = {
  bank: IconBank, cash: IconCash, card: IconCard,
  revolut: IconCard, savings: IconSavings, investment: IconSavings
}

export default function AccountsView({ user, privateMode }) {
  const [accounts, setAccounts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [selected, setSelected]   = useState(null) // account for history view

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user.uid])

  const totalPLN = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Usunąć to konto? Historia transakcji zostanie zachowana.')) return
    await deleteDoc(doc(db, 'users', user.uid, 'accounts', id))
    if (selected?.id === id) setSelected(null)
  }

  if (loading) return <div className="list-loading">Ładowanie...</div>

  if (selected) {
    return (
      <AccountHistory
        user={user}
        account={selected}
        privateMode={privateMode}
        onBack={() => setSelected(null)}
        onEdit={() => { setEditAccount(selected); setShowForm(true) }}
      />
    )
  }

  return (
    <div className="accounts-view">
      <div className="accounts-total">
        <span className="accounts-total-label">Suma wszystkich kont</span>
        <span className="accounts-total-amount">{privateMode ? '••••' : fmtAcc(totalPLN)}</span>
      </div>

      {accounts.length === 0 ? (
        <div className="list-empty">
          <p>Brak kont</p>
          <p className="list-empty-hint">Dodaj konto przyciskiem poniżej</p>
        </div>
      ) : (
        <div className="accounts-list">
          {accounts.map(acc => (
            <div key={acc.id} className="account-item" onClick={() => setSelected(acc)}>
              <div className="account-icon-wrap" style={{ background: acc.color + '1A', borderColor: acc.color + '40', color: acc.color }}>
                {(() => { const Ic = ACCOUNT_ICON_COMPS[acc.type] || IconBank; return <Ic size={22} /> })()}
              </div>
              <div className="account-info">
                <span className="account-name">{acc.name}</span>
                <span className="account-type">{acc.typeName || acc.type}</span>
              </div>
              <div className="account-right">
                <span className="account-balance">{privateMode ? '••••' : fmtAcc(acc.balance || 0, acc.currency || 'PLN')}</span>
                <button className="t-btn" onClick={(e) => { e.stopPropagation(); setEditAccount(acc); setShowForm(true) }}><IconEdit size={13} /></button>
                <button className="t-btn delete" onClick={(e) => handleDelete(acc.id, e)}><IconTrash size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn-add-account" onClick={() => { setEditAccount(null); setShowForm(true) }}>+ Dodaj konto</button>

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

function AccountHistory({ user, account, privateMode, onBack, onEdit }) {
  const [transactions, setTx] = useState([])
  const [loading, setLoading] = useState(true)
  const [months, setMonths]   = useState(1) // 1 | 3 | 12 | 0 (all)

  useEffect(() => {
    let q
    if (months === 0) {
      q = query(
        collection(db, 'users', user.uid, 'transactions'),
        where('accountId', '==', account.id),
        orderBy('date', 'desc')
      )
    } else {
      const start = startOfMonth(subMonths(new Date(), months - 1))
      q = query(
        collection(db, 'users', user.uid, 'transactions'),
        where('accountId', '==', account.id),
        where('date', '>=', Timestamp.fromDate(start)),
        orderBy('date', 'desc')
      )
    }
    return onSnapshot(q, snap => {
      setTx(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })))
      setLoading(false)
    })
  }, [user.uid, account.id, months])

  const totalIn  = transactions.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0)
  const totalOut = transactions.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="t-btn" onClick={onBack} style={{ fontSize: 20 }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{account.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{account.typeName}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{privateMode ? '••••' : fmtAcc(account.balance || 0, account.currency || 'PLN')}</p>
        </div>
        <button className="t-btn" onClick={onEdit}><IconEdit size={16} /></button>
      </div>

      {/* Period filter */}
      <div className="habit-view-tabs">
        {[[1,'1 mies.'],[3,'3 mies.'],[12,'Rok'],[0,'Wszystko']].map(([v,l]) => (
          <button key={v} className={`habit-view-tab ${months === v ? 'active' : ''}`} onClick={() => setMonths(v)}>{l}</button>
        ))}
      </div>

      {/* Summary */}
      {transactions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wpływy</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#27AE60' }}>{privateMode ? '••••' : fmt(totalIn)}</p>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wypływy</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--expense)' }}>{privateMode ? '••••' : fmt(totalOut)}</p>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {loading ? <div className="list-loading">Ładowanie...</div> :
       transactions.length === 0 ? (
        <div className="list-empty"><p>Brak transakcji w tym okresie</p></div>
      ) : (
        <div className="transaction-list">
          {transactions.map(t => (
            <div key={t.id} className={`transaction-item ${t.type}`}>
              <div className="t-icon"><CatIcon categoryId={t.categoryId} emoji={t.categoryIcon} size={20} /></div>
              <div className="t-details">
                <span className="t-category">{t.category}</span>
                {t.description && <span className="t-desc">{t.description}</span>}
                <span className="t-date">{format(t.date, 'd MMM yyyy', { locale: pl })}</span>
              </div>
              <span className={`t-amount ${t.type}`}>
                {t.type === 'income' ? '+' : '-'}{privateMode ? '••••' : fmt(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
