import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc, updateDoc, arrayUnion, addDoc, Timestamp, increment } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { fmt } from '../../utils/currency'
import { CatIcon, IconEdit, IconTrash, IconCheck, IconCalendar, IconRepeat } from '../Icons'
import RegularPaymentForm from './RegularPaymentForm'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'

const FREQ_LABELS = { monthly: 'miesięcznie', weekly: 'tygodniowo', yearly: 'rocznie' }

export default function RegularPayments({ user }) {
  const [payments, setPayments] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPayment, setEditPayment] = useState(null)

  const THIS_PERIOD = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'regularPayments'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPayments(list)
      setLoading(false)
    })
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  // Auto-add payments only when the due day has arrived
  useEffect(() => {
    if (!payments.length) return
    const today = new Date()
    const todayDay = today.getDate()
    payments.forEach(async (p) => {
      if (!p.autoAdd || p.donePeriods?.includes(THIS_PERIOD)) return
      if (!isActive(p)) return
      if (p.frequency === 'monthly' && todayDay < (p.dayOfMonth || 1)) return
      await addTransactionForPayment(p)
    })
  }, [payments.map(p=>p.id).join(',')])

  const addTransactionForPayment = async (p) => {
    try {
      await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        type: p.type, amount: p.amount,
        category: p.category, categoryId: p.categoryId, categoryIcon: p.categoryIcon,
        description: p.name, accountId: p.accountId || null,
        date: Timestamp.now(), createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
        fromRegular: p.id
      })
      if (p.accountId) {
        const delta = p.type === 'expense' ? -p.amount : p.amount
        await updateDoc(doc(db, 'users', user.uid, 'accounts', p.accountId), { balance: increment(delta) })
      }
      await updateDoc(doc(db, 'users', user.uid, 'regularPayments', p.id), {
        donePeriods: arrayUnion(THIS_PERIOD)
      })
    } catch { toast.error('Błąd zapisu płatności') }
  }

  const markDone = async (p) => {
    await addTransactionForPayment(p)
  }

  const markUndone = async (p) => {
    const next = (p.donePeriods || []).filter(d => d !== THIS_PERIOD)
    await updateDoc(doc(db, 'users', user.uid, 'regularPayments', p.id), { donePeriods: next })
  }

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć płatność?', message: 'Płatność zostanie trwale usunięta.' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'regularPayments', id))
  }

  const totalMonthly = payments
    .filter(p => p.frequency === 'monthly' && p.type === 'expense')
    .reduce((s, p) => s + p.amount, 0)

  const getAccount = (id) => accounts.find(a => a.id === id)

  const isActive = (p) => {
    const today = startOfDay(new Date())
    if (p.dateFrom && isBefore(today, startOfDay(parseISO(p.dateFrom)))) return false
    if (p.dateTo   && isAfter(today,  startOfDay(parseISO(p.dateTo))))   return false
    return true
  }

  const fmtDate = (d) => format(parseISO(d), 'd MMM yyyy', { locale: pl })

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div className="regular-payments">
      {payments.length > 0 && (
        <div className="regular-summary">
          <span className="regular-summary-label">Suma stałych wydatków / miesiąc</span>
          <span className="regular-summary-amount">{fmt(totalMonthly)}</span>
        </div>
      )}

      <button className="btn-add-account" onClick={() => { setEditPayment(null); setShowForm(true) }}>
        + Dodaj płatność
      </button>

      {payments.length === 0 ? (
        <div className="list-empty">
          <p>Brak regularnych płatności</p>
          <p className="list-empty-hint">Dodaj np. czynsz, Spotify, abonament telefonu</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {payments.map(p => {
            const done    = p.donePeriods?.includes(THIS_PERIOD)
            const active  = isActive(p)
            const acc     = getAccount(p.accountId)
            const hasRange = p.dateFrom || p.dateTo
            return (
              <div key={p.id} style={{
                background: 'var(--surface)', border: `1px solid ${done ? '#27AE6040' : 'var(--border)'}`,
                borderLeft: `3px solid ${!active ? 'var(--border)' : done ? '#27AE60' : p.type === 'income' ? '#27AE60' : 'var(--expense)'}`,
                borderRadius: 12, padding: '12px 14px', opacity: !active ? 0.45 : done ? 0.75 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: p.type === 'income' ? 'rgba(98,195,156,0.15)' : 'rgba(224,101,60,0.15)',
                    border: `1px solid ${p.type === 'income' ? 'rgba(98,195,156,0.35)' : 'rgba(224,101,60,0.35)'}`,
                    color: p.type === 'income' ? 'var(--income)' : 'var(--expense)',
                  }}>
                    <CatIcon categoryId={p.categoryId} emoji={p.categoryIcon} size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                      {p.autoAdd && <span style={{ fontSize: 9, background: 'rgba(201,75,40,0.2)', color: 'var(--accent)', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>AUTO</span>}
                      {done && <span style={{ fontSize: 9, background: 'rgba(39,174,96,0.2)', color: '#27AE60', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>ZROBIONE</span>}
                      {!active && <span style={{ fontSize: 9, background: 'rgba(150,150,150,0.2)', color: 'var(--text-muted)', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>NIEAKTYWNA</span>}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {p.category} · {FREQ_LABELS[p.frequency]}{p.frequency === 'monthly' ? ` (${p.dayOfMonth}.)` : ''}
                      {acc ? ` · ${acc.name}` : ''}
                    </span>
                    {hasRange && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                        <IconCalendar size={10} /> {p.dateFrom ? fmtDate(p.dateFrom) : '—'} → {p.dateTo ? fmtDate(p.dateTo) : 'bezterminowo'}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: p.type === 'income' ? '#27AE60' : 'var(--expense)' }}>
                      {p.type === 'income' ? '+' : '-'}{fmt(p.amount)}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {active && !done && (
                        <button style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(39,174,96,0.15)', border: '1px solid #27AE6060', borderRadius: 6, color: '#27AE60', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => markDone(p)}>
                          <IconCheck size={10} /> Zrobione
                        </button>
                      )}
                      {done && (
                        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer' }}
                          onClick={() => markUndone(p)}>
                          <IconRepeat size={11} /> Cofnij
                        </button>
                      )}
                      <button className="t-btn" onClick={() => { setEditPayment(p); setShowForm(true) }}><IconEdit size={13} /></button>
                      <button className="t-btn delete" onClick={() => handleDelete(p.id)}><IconTrash size={13} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <RegularPaymentForm
          user={user}
          onClose={() => { setShowForm(false); setEditPayment(null) }}
          editData={editPayment}
        />
      )}
    </div>
  )
}
