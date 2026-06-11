import { deleteDoc, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../firebase/config'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { fmt } from '../utils/currency'
import { CatIcon, IconEdit, IconTrash } from './Icons'
import { confirmDialog } from './ConfirmModal'
import { toast } from './Toast'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../utils/categories'

const ALL_CATS = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]
const getCatColor = (id, type) => ALL_CATS.find(c => c.id === id)?.color || (type === 'income' ? '#5FBF98' : '#E0673E')

const hide = '••••'

export default function TransactionList({ transactions, loading, onEdit, user, privateMode }) {
  const handleDelete = async (t) => {
    const ok = await confirmDialog({ title: 'Usunąć transakcję?', message: 'Ta operacja jest nieodwracalna.' })
    if (!ok) return
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
              const catColor = getCatColor(t.categoryId, t.type)
              return (
                <div key={t.id} className={`transaction-item ${t.type}`} style={{ borderLeft: `3px solid ${catColor}66` }}>
                  <div className="t-icon" style={{
                    background: catColor + '20',
                    border: `1px solid ${catColor}44`,
                    color: catColor,
                  }}>
                    <CatIcon categoryId={t.categoryId} emoji={t.categoryIcon} size={18} />
                  </div>
                  <div className="t-details">
                    <span className="t-category">
                      {t.category}{t.subcategoryLabel ? <span style={{ opacity: 0.7 }}> › {t.subcategoryLabel}</span> : ''}
                    </span>
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
