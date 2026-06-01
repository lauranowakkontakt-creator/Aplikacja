import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { fmt } from '../../utils/currency'
import { IconEdit, IconTrash, IconClose } from '../Icons'

const GOAL_EMOJIS = [
  '🎯','🏠','✈️','🚗','💍','📱','🎓','💻','🏖️','🐷',
  '💰','🛍️','🎁','🏆','🚀','🎸','🌍','🏋️','💎','🔑',
  '🎪','🐾','🌺','⭐','🔥','🧠','🌊','🏔️','🎨','🎬',
]

export default function SavingsGoals({ user, onClose }) {
  const [goals, setGoals]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'savingsGoals'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user.uid])

  const handleDelete = async (id) => {
    if (!confirm('Usunąć cel?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'savingsGoals', id))
  }

  const totalTarget  = goals.reduce((s, g) => s + (g.targetAmount || 0), 0)
  const totalSaved   = goals.reduce((s, g) => s + (g.currentAmount || 0), 0)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-tall">
        <div className="modal-header">
          <h3>🎯 Cele oszczędnościowe</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>

        {loading ? <div className="list-loading">Ładowanie...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {goals.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>Cel łączny</p>
                  <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{fmt(totalTarget)}</p>
                </div>
                <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>Odłożone łącznie</p>
                  <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#27AE60' }}>{fmt(totalSaved)}</p>
                </div>
              </div>
            )}

            <button className="btn-add-account" onClick={() => { setEditGoal(null); setShowForm(true) }}>
              + Dodaj cel
            </button>

            {goals.length === 0 ? (
              <div className="list-empty">
                <p>Brak celów oszczędnościowych</p>
                <p className="list-empty-hint">Dodaj np. wakacje, nowy telefon, wkład własny</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {goals.map(goal => {
                  const pct = goal.targetAmount > 0 ? Math.min(100, ((goal.currentAmount || 0) / goal.targetAmount) * 100) : 0
                  const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.currentAmount || 0))
                  return (
                    <div key={goal.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <span style={{ fontSize: 28 }}>{goal.emoji || '🎯'}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{goal.name}</p>
                          {goal.notes && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{goal.notes}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="t-btn" onClick={() => { setEditGoal(goal); setShowForm(true) }}><IconEdit size={13} /></button>
                          <button className="t-btn delete" onClick={() => handleDelete(goal.id)}><IconTrash size={13} /></button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: '#27AE60', fontWeight: 700 }}>{fmt(goal.currentAmount || 0)}</span>
                        <span style={{ color: 'var(--text-muted)' }}>cel: {fmt(goal.targetAmount || 0)}</span>
                      </div>

                      <div className="progress-bar-wrap">
                        <div className="progress-bar" style={{ width: `${pct}%`, background: pct >= 100 ? '#27AE60' : 'var(--primary)' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>{Math.round(pct)}%</span>
                        {pct < 100 && <span>brakuje {fmt(remaining)}</span>}
                        {pct >= 100 && <span style={{ color: '#27AE60' }}>Cel osiągnięty!</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {showForm && (
          <GoalForm user={user} editData={editGoal} onClose={() => { setShowForm(false); setEditGoal(null) }} />
        )}
      </div>
    </div>
  )
}

function GoalForm({ user, editData, onClose }) {
  const [name, setName]         = useState(editData?.name || '')
  const [emoji, setEmoji]       = useState(editData?.emoji || '🎯')
  const [target, setTarget]     = useState(editData?.targetAmount?.toString() || '')
  const [current, setCurrent]   = useState(editData?.currentAmount?.toString() || '')
  const [notes, setNotes]       = useState(editData?.notes || '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [emojiExpanded, setEmojiExpanded] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Wpisz nazwę celu'); return }
    if (!target || parseFloat(target) <= 0) { setError('Podaj kwotę docelową'); return }
    setSaving(true)
    const data = {
      name: name.trim(), emoji,
      targetAmount: parseFloat(target),
      currentAmount: parseFloat(current) || 0,
      notes: notes.trim(),
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'savingsGoals', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'savingsGoals'), { ...data, createdAt: Timestamp.now() })
      }
      onClose()
    } catch { setError('Błąd zapisu'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj cel' : 'Nowy cel'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Emoji</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{emoji}</span>
              <input type="text" className="form-input" value={emoji}
                onChange={e => { const v = [...e.target.value].slice(-2).join(''); if (v) setEmoji(v) }}
                placeholder="emoji" maxLength={4}
                style={{ width: 72, textAlign: 'center', fontSize: 18, margin: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>lub wybierz:</span>
            </div>
            <div className="mood-emotions">
              {(emojiExpanded ? GOAL_EMOJIS : GOAL_EMOJIS.slice(0, 15)).map(e => (
                <button key={e} type="button"
                  className={`mood-emotion-btn ${emoji === e ? 'active' : ''}`}
                  style={emoji === e ? { borderColor: 'var(--primary)', background: 'rgba(201,75,40,0.1)', color: 'var(--text)' } : {}}
                  onClick={() => setEmoji(e)}
                >{e}</button>
              ))}
            </div>
            <button type="button" onClick={() => setEmojiExpanded(v => !v)}
              style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
              {emojiExpanded ? '▲ Mniej' : `▼ Więcej (${GOAL_EMOJIS.length - 15})`}
            </button>
          </div>

          <div className="form-group">
            <label>Nazwa celu</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)}
              placeholder="np. Wakacje, Nowy laptop..." autoFocus maxLength={50} />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Cel (kwota)</label>
              <input type="number" step="0.01" min="0" className="form-input" value={target}
                onChange={e => setTarget(e.target.value)} placeholder="0,00" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Odłożone dotąd</label>
              <input type="number" step="0.01" min="0" className="form-input" value={current}
                onChange={e => setCurrent(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="form-group">
            <label>Notatka (opcjonalna)</label>
            <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="np. do kiedy, na co konkretnie..." maxLength={100} />
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj cel'}
          </button>
        </form>
      </div>
    </div>
  )
}
