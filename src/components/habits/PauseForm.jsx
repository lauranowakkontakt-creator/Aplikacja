import { useState, useEffect } from 'react'
import { collection, addDoc, deleteDoc, doc, Timestamp, orderBy, query } from 'firebase/firestore'
import { onSnapshot } from '../../utils/subskrypcje'
import { db } from '../../firebase/config'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CatIcon, IconClose, IconTrash, IconPause } from '../Icons'
import { PAUSE_REASONS as REASONS, pauseReasonMeta } from '../../utils/habitLogic'
import { bladSubskrypcji } from '../../utils/polaczenie'

export default function PauseForm({ user, onClose }) {
  const [pauses, setPauses] = useState([])
  const [from, setFrom]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [to, setTo]         = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reason, setReason] = useState('vacation')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'habitPauses'), orderBy('from', 'desc'))
    return onSnapshot(q, snap => setPauses(snap.docs.map(d => ({ id: d.id, ...d.data() }))), bladSubskrypcji('habitPauses'))
  }, [user.uid])

  const handleAdd = async () => {
    if (from > to) return
    setSaving(true)
    const r = pauseReasonMeta(reason)
    await addDoc(collection(db, 'users', user.uid, 'habitPauses'), {
      from, to, reason, reasonLabel: r.label, reasonIcon: r.icon, reasonColor: r.color, createdAt: Timestamp.now()
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
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconPause size={16} /> Pauza nawyków</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div className="form">
          <p className="pause-info">W podanym czasie żaden nawyk nie jest wymagany — seria nie jest przerywana, ale dni przerwy nie liczą się do streaka. W siatce tygodnia dni przerwy dostają swój kolor.</p>

          <div className="form-group">
            <label>Powód</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {REASONS.map(r => {
                const active = reason === r.id
                return (
                  <button key={r.id} type="button" onClick={() => setReason(r.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', minWidth: 0,
                      borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textAlign: 'left', lineHeight: 1.2,
                      background: active ? r.color + '22' : 'var(--surface2)',
                      border: `1.5px solid ${active ? r.color : 'var(--border)'}`,
                      color: active ? r.color : 'var(--text-sub)',
                    }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: r.color, flexShrink: 0 }} />
                    <CatIcon categoryId={null} emoji={r.icon} size={15} />
                    <span style={{ minWidth: 0, wordBreak: 'break-word' }}>{r.label}</span>
                  </button>
                )
              })}
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
                  <span className="pause-reason" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: pauseReasonMeta(p.reason).color, flexShrink: 0 }} /><CatIcon categoryId={null} emoji={p.reasonIcon} size={14} /> {p.reasonLabel}</span>
                  <span className="pause-dates">{fmtDate(p.from)} – {fmtDate(p.to)}</span>
                  <button className="t-btn delete" onClick={() => handleDelete(p.id)}><IconTrash size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
