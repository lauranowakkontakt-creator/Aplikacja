import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, Timestamp, onSnapshot, orderBy, query, getDoc, getDocs, limit, increment } from 'firebase/firestore'
import { db } from '../firebase/config'
import { format } from 'date-fns'
import { getCurrencyCode } from '../utils/currency'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, getSubcategoryColor } from '../utils/categories'
import { CatIcon, IconClose } from './Icons'

export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES
export const INCOME_CATEGORIES  = DEFAULT_INCOME_CATEGORIES

export default function TransactionForm({ user, onClose, editData, defaultType, defaultAccountId }) {
  const [type, setType]             = useState(editData?.type || defaultType || 'expense')
  const [amount, setAmount]         = useState(editData?.amount?.toString() || '')
  const [category, setCategory]     = useState(editData?.categoryId || '')
  const [subcategoryId, setSubcategoryId] = useState(editData?.subcategoryId || '')
  const [description, setDescription] = useState(editData?.description || '')
  const [date, setDate]             = useState(editData?.date ? format(editData.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [accountId, setAccountId]   = useState(editData?.accountId || defaultAccountId || '')
  const [accounts, setAccounts]     = useState([])
  const [accountUsage, setAccountUsage] = useState({})
  const [showAllAccounts, setShowAllAccounts] = useState(false)
  const [expCats, setExpCats]       = useState(DEFAULT_EXPENSE_CATEGORIES)
  const [incCats, setIncCats]       = useState(DEFAULT_INCOME_CATEGORIES)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const categories = type === 'expense' ? expCats : incCats

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  // Częstotliwość użycia kont (z ostatnich transakcji) → najczęściej używane na początku
  useEffect(() => {
    getDocs(query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'), limit(200)))
      .then(snap => {
        const u = {}
        snap.docs.forEach(d => { const a = d.data().accountId; if (a) u[a] = (u[a] || 0) + 1 })
        setAccountUsage(u)
      }).catch(() => {})
  }, [user.uid])

  const sortedAccounts = [...accounts].sort((a, b) => (accountUsage[b.id] || 0) - (accountUsage[a.id] || 0))

  // Domyślnie wybierz najczęściej używane konto (brak opcji „bez konta")
  useEffect(() => {
    if (!accountId && !editData && accounts.length) {
      const sorted = [...accounts].sort((a, b) => (accountUsage[b.id] || 0) - (accountUsage[a.id] || 0))
      setAccountId(sorted[0].id)
    }
  }, [accounts, accountUsage]) // eslint-disable-line

  // Load custom categories — na żywo (onSnapshot), żeby nowo dodane/zmienione
  // kategorie pojawiały się od razu, bez „zacinania" na starych domyślnych.
  useEffect(() => {
    return onSnapshot(doc(db, 'users', user.uid, 'settings', 'categories'), d => {
      if (d.exists()) {
        if (d.data().expense?.length) setExpCats(d.data().expense)
        if (d.data().income?.length)  setIncCats(d.data().income)
      }
    })
  }, [user.uid])

  useEffect(() => {
    if (!categories.find(c => c.id === category)) setCategory('')
  }, [type])

  useEffect(() => { setSubcategoryId('') }, [category])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) { setError('Podaj prawidłową kwotę'); return }
    if (!category) { setError('Wybierz kategorię'); return }
    setSaving(true); setError('')
    const cat = categories.find(c => c.id === category)
    const subcat = cat?.subcategories?.find(s => s.id === subcategoryId)
    const data = {
      type, amount: parseFloat(amount),
      category: cat?.label || category,
      categoryId: category,
      categoryIcon: cat?.icon || 'IconMore',
      subcategoryId: subcat?.id || null,
      subcategoryLabel: subcat?.label || null,
      description: description.trim(),
      date: Timestamp.fromDate(new Date(date)),
      accountId: accountId || null,
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'transactions', editData.id), data)
        if (editData.accountId) {
          const reversal = editData.type === 'income' ? -editData.amount : editData.amount
          await updateDoc(doc(db, 'users', user.uid, 'accounts', editData.accountId), { balance: increment(reversal) })
        }
        if (accountId) {
          const delta = type === 'income' ? parseFloat(amount) : -parseFloat(amount)
          await updateDoc(doc(db, 'users', user.uid, 'accounts', accountId), { balance: increment(delta) })
        }
      } else {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), { ...data, createdAt: Timestamp.now() })
        if (accountId) {
          const delta = type === 'income' ? parseFloat(amount) : -parseFloat(amount)
          await updateDoc(doc(db, 'users', user.uid, 'accounts', accountId), { balance: increment(delta) })
        }
      }
      onClose()
    } catch { setError('Błąd zapisu. Spróbuj ponownie.'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj transakcję' : 'Nowa transakcja'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="type-toggle">
            <button type="button" className={`type-btn ${type === 'expense' ? 'active expense' : ''}`} onClick={() => setType('expense')}>Wydatek</button>
            <button type="button" className={`type-btn ${type === 'income' ? 'active income' : ''}`} onClick={() => setType('income')}>Przychód</button>
          </div>

          <div className="form-group">
            <label>Kwota ({getCurrencyCode()})</label>
            <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0,00"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="form-input amount-input" />
          </div>

          <div className="form-group">
            <label>Kategoria</label>
            <div className="category-icons-grid">
              {categories.map(cat => (
                <button key={cat.id} type="button"
                  className={`cat-icon-btn ${category === cat.id ? 'active' : ''}`}
                  onClick={() => setCategory(cat.id)}
                >
                  <div className="cat-circle" style={{ background: category === cat.id ? cat.color : cat.color + '33', borderColor: category === cat.id ? cat.color : 'transparent', color: category === cat.id ? '#fff' : cat.color }}>
                    <CatIcon categoryId={cat.id} emoji={cat.icon} size={18} />
                  </div>
                  <span className="cat-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const selectedCat = categories.find(c => c.id === category)
            const subcats = selectedCat?.subcategories || []
            if (!subcats.length) return null
            return (
              <div className="form-group">
                <label>Podkategoria <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcjonalna)</span></label>
                <div className="category-icons-grid">
                  {subcats.map((sub, si) => {
                    const subColor = getSubcategoryColor(selectedCat.color, si)
                    const active = subcategoryId === sub.id
                    return (
                      <button key={sub.id} type="button"
                        className={`cat-icon-btn ${active ? 'active' : ''}`}
                        onClick={() => setSubcategoryId(active ? '' : sub.id)}
                      >
                        <div className="cat-circle" style={{
                          background: active ? subColor : subColor + '33',
                          borderColor: active ? subColor : 'transparent',
                          color: active ? '#fff' : subColor
                        }}>
                          <CatIcon categoryId="" emoji={sub.icon} size={18} />
                        </div>
                        <span className="cat-label">{sub.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {accounts.length > 0 && (() => {
            const top = sortedAccounts.slice(0, 4)
            const visible = showAllAccounts
              ? sortedAccounts
              : (accountId && !top.some(a => a.id === accountId)
                  ? [...top, sortedAccounts.find(a => a.id === accountId)].filter(Boolean)
                  : top)
            return (
              <div className="form-group">
                <label>Konto</label>
                <div className="account-chips">
                  {visible.map(acc => (
                    <button key={acc.id} type="button"
                      className={`account-chip ${accountId === acc.id ? 'active' : ''}`}
                      style={accountId === acc.id ? { borderColor: acc.color, background: acc.color + '22' } : {}}
                      onClick={() => setAccountId(acc.id)}
                    >{acc.name}</button>
                  ))}
                  {sortedAccounts.length > 4 && (
                    <button type="button" className="account-chip" onClick={() => setShowAllAccounts(v => !v)}>
                      {showAllAccounts ? '− mniej' : `+${sortedAccounts.length - 4} więcej`}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          <div className="form-group">
            <label>Opis (opcjonalny)</label>
            <input type="text" placeholder="np. Biedronka, Spotify..."
              value={description} onChange={e => setDescription(e.target.value)}
              className="form-input" maxLength={100} />
          </div>

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
