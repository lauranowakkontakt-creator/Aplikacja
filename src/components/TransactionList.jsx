import { deleteDoc, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../firebase/config'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { fmt } from '../utils/currency'
import { CatIcon, IconEdit, IconTrash } from './Icons'

const hide = '••••'

export default function TransactionList({ transactions, loading, onEdit, user, privateMode }) {
  const handleDelete = async (t) => {
    if (!confirm('Usunąć tę transakcję?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'transactions', t.id))
    if (t.accountId) {
      const reversal = t.type === 'income' ? -t.amount : t.amount
      await updateDoc(doc(db, 'users', user.uid, 'accounts', t.accountId), { balance: increment(reversal) })
    }
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

  // Group by date
  const groups = []
  const seen = {}
  for (const t of transactions) {
    const key = format(t.date, 'yyyy-MM-dd')
    if (!seen[key]) {
      seen[key] = { key, label: format(t.date, 'EEEE · d MMM', { locale: pl }), items: [], sum: 0 }
      groups.push(seen[key])
    }
    seen[key].items.push(t)
    seen[key].sum += t.type === 'income' ? t.amount : -t.amount
  }

  const fmtSum = (s) => {
    const sign = s >= 0 ? '+' : '−'
    return `${sign}${fmt(Math.abs(s))}`
  }

  return (
    <div className="transaction-list">
      {groups.map(group => (
        <div key={group.key} className="tx-date-group">
          <div className="tx-date-header">
            <span className="tx-date-label">{group.label}</span>
            {!privateMode && (
              <span className="tx-date-sum" style={{ color: group.sum >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {fmtSum(group.sum)}
              </span>
            )}
          </div>
          <div className="tx-group-body">
            {group.items.map(t => {
              const color = t.type === 'income' ? 'var(--income)' : 'var(--expense)'
              const colorHex = t.type === 'income' ? 'rgba(98,195,156,' : 'rgba(224,101,60,'
              return (
                <div key={t.id} className={`transaction-item ${t.type}`}>
                  <div className="t-icon" style={{
                    background: `${colorHex}0.15)`,
                    border: `1px solid ${colorHex}0.35)`,
                    color,
                  }}>
                    <CatIcon categoryId={t.categoryId} emoji={t.categoryIcon} size={18} />
                  </div>
                  <div className="t-details">
                    <span className="t-category">{t.category}</span>
                    {t.description && <span className="t-desc">{t.description}</span>}
                  </div>
                  <div className="t-right">
                    <span className={`t-amount ${t.type}`}>
                      {privateMode ? hide : `${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}`}
                    </span>
                    <div className="t-actions">
                      <button className="t-btn edit" onClick={() => onEdit(t)}><IconEdit size={13} /></button>
                      <button className="t-btn delete" onClick={() => handleDelete(t)}><IconTrash size={13} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
