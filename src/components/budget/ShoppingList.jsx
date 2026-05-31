import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { fmt, getCurrencyCode } from '../../utils/currency'
import { EXPENSE_CATEGORIES } from '../TransactionForm'
import { IconTrash } from '../Icons'

const COLORS = ['#C94B28','#6366f1','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6']

const SHOP_CATEGORIES = EXPENSE_CATEGORIES

export default function ShoppingList({ user }) {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [showTx, setShowTx]     = useState(null) // item to confirm buy
  const [tab, setTab]           = useState('planned')

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'shoppingItems'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user.uid])

  const planned = items.filter(i => i.status !== 'bought')
  const bought  = items.filter(i => i.status === 'bought')

  const handleDelete = async (id) => {
    if (!confirm('Usunąć?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'shoppingItems', id))
  }

  const handleBuy = async (item, actualPrice) => {
    await updateDoc(doc(db, 'users', user.uid, 'shoppingItems', item.id), {
      status: 'bought',
      boughtPrice: parseFloat(actualPrice) || item.estimatedPrice || 0,
      boughtDate: format(new Date(), 'yyyy-MM-dd')
    })
  }

  // Category chart of planned items
  const catMap = {}
  planned.forEach(i => {
    const c = SHOP_CATEGORIES.find(c => c.id === i.category)
    const key = c?.label || 'Inne'
    catMap[key] = (catMap[key] || 0) + (i.estimatedPrice || 0)
  })
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
            {planned.length} do kupienia · szacunkowo {fmt(planned.reduce((s, i) => s + (i.estimatedPrice || 0), 0))}
          </p>
        </div>
        <button className="btn-add-habit" onClick={() => setShowAdd(true)}>+ Dodaj</button>
      </div>

      <div className="habit-view-tabs">
        <button className={`habit-view-tab ${tab === 'planned' ? 'active' : ''}`} onClick={() => setTab('planned')}>Do kupienia ({planned.length})</button>
        <button className={`habit-view-tab ${tab === 'bought'  ? 'active' : ''}`} onClick={() => setTab('bought')}>Kupione ({bought.length})</button>
      </div>

      {tab === 'planned' && (
        <>
          {planned.length === 0 ? (
            <div className="list-empty"><p>Lista pusta</p><p className="list-empty-hint">Kliknij "+ Dodaj" aby dodać produkt</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {planned.map(item => {
                const cat = SHOP_CATEGORIES.find(c => c.id === item.category)
                return (
                  <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{item.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                        {cat?.label}{item.estimatedPrice ? ` · ~${fmt(item.estimatedPrice)}` : ''}
                        {item.note ? ` · ${item.note}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setShowTx(item)}
                        style={{ fontSize: 12, padding: '5px 10px', background: 'rgba(39,174,96,0.15)', border: '1px solid #27AE6060', borderRadius: 8, color: '#27AE60', cursor: 'pointer', fontWeight: 700 }}>
                        Kup ✓
                      </button>
                      <button className="t-btn delete" onClick={() => handleDelete(item.id)}><IconTrash size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {pieData.length > 0 && (
            <div className="chart-section" style={{ marginTop: 8 }}>
              <h3 className="chart-title">Kategorie zakupów (szacunkowo)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={74} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{d.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'bought' && (
        bought.length === 0 ? (
          <div className="list-empty"><p>Brak kupionych produktów</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bought.map(item => {
              const cat = SHOP_CATEGORIES.find(c => c.id === item.category)
              return (
                <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: 0.75 }}>
                  <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, textDecoration: 'line-through', color: 'var(--text-muted)' }}>{item.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      {item.boughtDate} · zapłacono {fmt(item.boughtPrice || 0)}
                    </p>
                  </div>
                  <button className="t-btn delete" onClick={() => handleDelete(item.id)}><IconTrash size={13} /></button>
                </div>
              )
            })}
          </div>
        )
      )}

      {showAdd && <AddItemModal user={user} onClose={() => setShowAdd(false)} />}
      {showTx && <BuyModal item={showTx} user={user} onBuy={handleBuy} onClose={() => setShowTx(null)} />}
    </div>
  )
}

function AddItemModal({ user, onClose }) {
  const [name, setName]           = useState('')
  const [category, setCategory]   = useState('inne')
  const [estimatedPrice, setPrice] = useState('')
  const [note, setNote]           = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Wpisz nazwę produktu'); return }
    setSaving(true)
    await addDoc(collection(db, 'users', user.uid, 'shoppingItems'), {
      name: name.trim(), category, note: note.trim(),
      estimatedPrice: parseFloat(estimatedPrice) || 0,
      status: 'planned',
      createdAt: Timestamp.now()
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>🛒 Dodaj do listy</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleAdd} className="form">
          <div className="form-group">
            <label>Produkt</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="np. Masło, Słuchawki..." maxLength={80} />
          </div>

          <div className="form-group">
            <label>Kategoria</label>
            <div className="mood-emotions">
              {SHOP_CATEGORIES.map(c => (
                <button key={c.id} type="button"
                  className={`mood-emotion-btn ${category === c.id ? 'active' : ''}`}
                  style={category === c.id ? { borderColor: 'var(--primary)', background: 'rgba(201,75,40,0.1)', color: 'var(--text)' } : {}}
                  onClick={() => setCategory(c.id)}
                >{c.icon} {c.label}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Szacowana cena (opcjonalnie)</label>
            <input type="number" step="0.01" min="0" className="form-input" value={estimatedPrice} onChange={e => setPrice(e.target.value)} placeholder="0,00" />
          </div>

          <div className="form-group">
            <label>Notatka (opcjonalnie)</label>
            <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="np. marki, rozmiar..." maxLength={100} />
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Dodawanie...' : 'Dodaj do listy'}
          </button>
        </form>
      </div>
    </div>
  )
}

function BuyModal({ item, user, onBuy, onClose }) {
  const [price, setPrice]       = useState(item.estimatedPrice?.toString() || '')
  const [accountId, setAccountId] = useState('')
  const [accounts, setAccounts] = useState([])
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const handleConfirm = async () => {
    setSaving(true)
    const actualPrice = parseFloat(price) || 0
    if (actualPrice > 0) {
      const cat = SHOP_CATEGORIES.find(c => c.id === item.category) || { label: 'Zakupy', id: 'zakupy', icon: '🛒' }
      await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        type: 'expense', amount: actualPrice,
        category: cat.label, categoryId: cat.id, categoryIcon: cat.icon,
        description: item.name,
        date: Timestamp.now(), accountId: accountId || null,
        createdAt: Timestamp.now(), updatedAt: Timestamp.now()
      })
      if (accountId) {
        const accSnap = await getDoc(doc(db, 'users', user.uid, 'accounts', accountId))
        if (accSnap.exists()) {
          await updateDoc(doc(db, 'users', user.uid, 'accounts', accountId), {
            balance: (accSnap.data().balance || 0) - actualPrice
          })
        }
      }
    }
    await onBuy(item, price)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>✓ Kupione: {item.name}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div className="form">
          <div className="form-group">
            <label>Zapłacona cena ({getCurrencyCode()})</label>
            <input type="number" step="0.01" min="0" className="form-input amount-input" value={price}
              onChange={e => setPrice(e.target.value)} autoFocus />
          </div>

          {accounts.length > 0 && (
            <div className="form-group">
              <label>Konto (opcjonalne)</label>
              <div className="account-chips">
                <button type="button" className={`account-chip ${!accountId ? 'active' : ''}`} onClick={() => setAccountId('')}>Bez konta</button>
                {accounts.map(acc => (
                  <button key={acc.id} type="button"
                    className={`account-chip ${accountId === acc.id ? 'active' : ''}`}
                    style={accountId === acc.id ? { borderColor: acc.color, background: acc.color + '22' } : {}}
                    onClick={() => setAccountId(acc.id)}
                  >{acc.name}</button>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0' }}>
            Zakup zostanie dodany do wydatków jako transakcja.
          </p>

          <button className="btn-save" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Potwierdź zakup'}
          </button>
        </div>
      </div>
    </div>
  )
}
