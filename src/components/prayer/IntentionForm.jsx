import { db } from '../../firebase/config'
import { NOTE_MODES, checklistToText, normalizeNoteMode, parseChecklist, pruneDone } from '../../utils/prayerList'
import { PRIORITY_CFG, findPrio } from '../../utils/prayerStats'
import { IconClose } from '../Icons'
import { Timestamp, addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import { useState } from 'react'

// Formularz prośby: dodawanie i edycja.

export default function IntentionForm({ user, editData, personId, onClose }) {
  const [title, setTitle]       = useState(editData?.title || '')
  const [note, setNote]         = useState(editData?.note || '')
  // Opis może być zwykłym tekstem albo listą do odhaczania.
  const [noteMode, setNoteMode] = useState(normalizeNoteMode(editData?.noteMode))
  const [listText, setListText] = useState(checklistToText(editData?.checklist || []))
  const [priority, setPriority] = useState(editData?.priority || 3)
  const [dateTo, setDateTo]     = useState(editData?.dateTo || '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Wpisz treść prośby'); return }
    setSaving(true)
    // Przy edycji dopasowujemy punkty po treści, żeby zmiana jednej pozycji
    // nie zdjęła ptaszków z pozostałych.
    const checklist = noteMode === 'list' ? parseChecklist(listText, editData?.checklist || []) : []
    const data = {
      title: title.trim(),
      noteMode,
      note: noteMode === 'text' ? note.trim() : '',
      checklist,
      checklistDone: pruneDone(checklist, editData?.checklistDone || []),
      personId: personId || editData?.personId || null,
      priority, dateTo: dateTo || null,
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'prayerIntentions'), {
          ...data, status: 'active', prayedDates: [], notes: [], createdAt: Timestamp.now()
        })
      }
      onClose()
    } catch { setError('Błąd zapisu'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj prośbę' : 'Nowa prośba modlitewna'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Prośba</label>
        <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)}
          maxLength={150} placeholder="O co się modlisz?" />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Priorytet</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {PRIORITY_CFG.slice().reverse().map(p => (
            <button key={p.v} type="button" onClick={() => setPriority(p.v)} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: priority === p.v ? 700 : 400,
              border: `2px solid ${priority === p.v ? p.color : 'var(--border)'}`,
              background: priority === p.v ? p.color + '22' : 'transparent',
              color: priority === p.v ? p.color : 'var(--text-muted)'
            }}>{p.v}</button>
          ))}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: findPrio(priority)?.color }}>{findPrio(priority)?.label}</p>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <label style={{ margin: 0 }}>Szczegóły (opcjonalnie)</label>
          <div className="note-mode">
            {NOTE_MODES.map(m => (
              <button key={m.id} type="button"
                className={`note-mode-btn${noteMode === m.id ? ' active' : ''}`}
                onClick={() => setNoteMode(m.id)}>{m.label}</button>
            ))}
          </div>
        </div>
        {noteMode === 'text' ? (
          <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)}
            maxLength={300} placeholder="Szczegóły..." />
        ) : (
          <>
            <textarea className="form-input" rows={5} value={listText}
              onChange={e => setListText(e.target.value)}
              placeholder={'zdrowie mamy\npraca taty\nspokój w domu'}
              style={{ resize: 'vertical', minHeight: 108, fontFamily: 'inherit', lineHeight: 1.6 }} />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              Jedna rzecz w linii. Każdą odhaczysz osobno przy prośbie.
            </p>
          </>
        )}
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Auto-archiwizuj po dacie (opcjonalnie)</label>
        <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {dateTo && <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Prośba zarchiwizuje się automatycznie po {dateTo}</p>}
      </div>

      {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-save" onClick={handleSubmit} disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Zapisywanie...' : editData ? 'Zapisz' : 'Dodaj prośbę'}
        </button>
        <button type="button" onClick={onClose} style={{
          flex: 1, background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-muted)', borderRadius: 'var(--radius)', padding: 12, cursor: 'pointer', fontSize: 14
        }}>Anuluj</button>
      </div>
        </div>
      </div>
    </div>
  )
}

/* ─── PersonForm ─────────────────────────────────────────────────────────── */
