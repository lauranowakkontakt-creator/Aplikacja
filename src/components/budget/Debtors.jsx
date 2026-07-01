import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { fmt } from '../../utils/currency'
import { IconEdit, IconTrash, IconClose, IconUsers, IconCheck, IconArrowUp, IconArrowDown } from '../Icons'
import { confirmDialog } from '../ConfirmModal'

const INCOME_COLOR  = '#5FBF98' // var(--income)
const EXPENSE_COLOR = '#E0673E' // var(--expense)

export default function Debtors({ user, onClose }) {
  const [debts, setDebts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editDebt, setEditDebt] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'debtors'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      setDebts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user.uid])

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć wpis?' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'debtors', id))
  }

  const toggleSettled = async (debt) => {
    await updateDoc(doc(db, 'users', user.uid, 'debtors', debt.id), {
      settled: !debt.settled,
      updatedAt: Timestamp.now(),
    })
  }

  const active = debts.filter(d => !d.settled)
  // "theyOwe" = ktoś jest winien mnie, "iOwe" = ja jestem winna
  const totalTheyOwe = active.filter(d => d.direction === 'theyOwe').reduce((s, d) => s + (d.amount || 0), 0)
  const totalIOwe    = active.filter(d => d.direction === 'iOwe').reduce((s, d) => s + (d.amount || 0), 0)

  return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal modal-tall">
          <div className="modal-header">
            <h3><IconUsers size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />Dłużnicy</h3>
            <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
          </div>

          {loading ? <div className="list-loading">Ładowanie...</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {active.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>Winni mi</p>
                    <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--income)' }}>{fmt(totalTheyOwe)}</p>
                  </div>
                  <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>Jestem winna</p>
                    <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--expense)' }}>{fmt(totalIOwe)}</p>
                  </div>
                </div>
              )}

              <button className="btn-add-account" onClick={() => { setEditDebt(null); setShowForm(true) }}>
                + Dodaj wpis
              </button>

              {debts.length === 0 ? (
                <div className="list-empty">
                  <p>Brak dłużników</p>
                  <p className="list-empty-hint">Dodaj kto jest Ci winien pieniądze lub komu jesteś winna</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {debts.map(debt => {
                    const theyOwe = debt.direction === 'theyOwe'
                    const color = theyOwe ? INCOME_COLOR : EXPENSE_COLOR
                    const DirIcon = theyOwe ? IconArrowDown : IconArrowUp
                    return (
                      <div key={debt.id} style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderLeft: `4px solid ${debt.settled ? 'var(--border)' : color}`, borderRadius: 14, padding: 14,
                        opacity: debt.settled ? 0.55 : 1,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                            background: debt.settled ? 'var(--surface2)' : color + '22',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: debt.settled ? 'var(--text-muted)' : color,
                          }}>
                            <DirIcon size={19} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: debt.settled ? 'line-through' : 'none' }}>{debt.name}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                              {theyOwe ? 'winien(-a) mi' : 'jestem winna'}
                              {debt.notes ? ` · ${debt.notes}` : ''}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: debt.settled ? 'var(--text-muted)' : color }}>
                              {fmt(debt.amount || 0)}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                          <button className={`t-btn ${debt.settled ? '' : ''}`} onClick={() => toggleSettled(debt)}
                            title={debt.settled ? 'Oznacz jako nierozliczone' : 'Oznacz jako rozliczone'}>
                            <IconCheck size={13} /> {debt.settled ? 'Rozliczone' : 'Rozlicz'}
                          </button>
                          <button className="t-btn" onClick={() => { setEditDebt(debt); setShowForm(true) }}><IconEdit size={13} /></button>
                          <button className="t-btn delete" onClick={() => handleDelete(debt.id)}><IconTrash size={13} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showForm && (
        <DebtForm user={user} editData={editDebt} onClose={() => { setShowForm(false); setEditDebt(null) }} />
      )}
    </>
  )
}

function DebtForm({ user, editData, onClose }) {
  const [name, setName]           = useState(editData?.name || '')
  const [direction, setDirection] = useState(editData?.direction || 'theyOwe')
  const [amount, setAmount]       = useState(editData?.amount?.toString() || '')
  const [notes, setNotes]         = useState(editData?.notes || '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Wpisz imię / nazwę'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Podaj kwotę'); return }
    setSaving(true)
    const data = {
      name: name.trim(),
      direction,
      amount: parseFloat(amount),
      notes: notes.trim(),
      settled: editData?.settled ?? false,
      updatedAt: Timestamp.now(),
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'debtors', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'debtors'), { ...data, createdAt: Timestamp.now() })
      }
      onClose()
    } catch { setError('Błąd zapisu'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj wpis' : 'Nowy wpis'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">

          <div className="form-group">
            <label>Imię / nazwa</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)}
              placeholder="np. Ania, Sklep, Mama..." autoFocus maxLength={50} />
          </div>

          <div className="form-group">
            <label>Kto komu jest winien?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setDirection('theyOwe')} style={{
                flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                border: `2px solid ${direction === 'theyOwe' ? INCOME_COLOR : 'var(--border)'}`,
                background: direction === 'theyOwe' ? INCOME_COLOR + '22' : 'var(--surface)',
                color: direction === 'theyOwe' ? INCOME_COLOR : 'var(--text)',
              }}>Winni mi</button>
              <button type="button" onClick={() => setDirection('iOwe')} style={{
                flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                border: `2px solid ${direction === 'iOwe' ? EXPENSE_COLOR : 'var(--border)'}`,
                background: direction === 'iOwe' ? EXPENSE_COLOR + '22' : 'var(--surface)',
                color: direction === 'iOwe' ? EXPENSE_COLOR : 'var(--text)',
              }}>Jestem winna</button>
            </div>
          </div>

          <div className="form-group">
            <label>Kwota</label>
            <input type="number" inputMode="decimal" step="0.01" min="0" className="form-input" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </div>

          <div className="form-group">
            <label>Notatka (opcjonalna)</label>
            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="np. za co, do kiedy..." maxLength={100} />
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj wpis'}
          </button>
        </form>
      </div>
    </div>
  )
}
