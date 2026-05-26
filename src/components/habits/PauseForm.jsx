import { useState, useEffect } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, Timestamp, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

const REASONS = [
  { id: 'vacation', label: 'Wakacje', icon: '✈️' },
  { id: 'illness',  label: 'Choroba', icon: '🤒' },
  { id: 'other',    label: 'Inne',    icon: '⏸️' },
]

export default function PauseForm({ user, onClose }) {
  const [pauses, setPauses] = useState([])
  const [from, setFrom]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [to, setTo]         = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reason, setReason] = useState('vacation')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'habitPauses'), orderBy('from', 'desc'))
    return onSnapshot(q, snap => setPauses(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const handleAdd = async () => {
    if (from > to) return
    setSaving(true)
    const r = REASONS.find(r => r.id === reason)
    await addDoc(collection(db, 'users', user.uid, 'habitPauses'), {
      from, to, reason, reasonLabel: r.label, reasonIcon: r.icon, createdAt: Timestamp.now()
    })
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'habitPauses', id))
  }

  const fmtDate = (d) => {
    try { return format(new Date(d + 'T12:00:00'), 'd MMM yyyy', { locale: pl }) } catch { return d }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>⏸️ Pauza nawyków</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form">
          <p className="pause-info">W podanym czasie żaden nawyk nie jest wymagany — seria nie jest przerywana, ale dni przerwy nie liczą się do streaka.</p>

          <div className="form-group">
            <label>Powód</label>
            <div className="type-toggle">
              {REASONS.map(r => (
                <button key={r.id} type="button"
                  className={`type-btn ${reason === r.id ? 'active expense' : ''}`}
                  onClick={() => setReason(r.id)}
                >{r.icon} {r.label}</button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Od</label>
              <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Do</label>
              <input type="date" className="form-input" value={to} min={from} onChange={e => setTo(e.target.value)} />
            </div>
          </div>

          <button className="btn-save" onClick={handleAdd} disabled={saving || from > to}>
            {saving ? 'Zapisywanie...' : 'Dodaj pauzę'}
          </button>

          {pauses.length > 0 && (
            <div className="pause-list">
              <p className="pause-list-title">Zapisane pauzy</p>
              {pauses.map(p => (
                <div key={p.id} className="pause-item">
                  <span className="pause-reason">{p.reasonIcon} {p.reasonLabel}</span>
                  <span className="pause-dates">{fmtDate(p.from)} – {fmtDate(p.to)}</span>
                  <button className="t-btn delete" onClick={() => handleDelete(p.id)}>🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
