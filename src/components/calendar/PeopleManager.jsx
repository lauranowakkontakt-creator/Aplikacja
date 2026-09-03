import { db } from '../../firebase/config'
import { purgePerson, setPersonHidden } from '../../utils/people'
import { PERSON_COLORS } from '../../utils/personColors'
import { confirmDialog } from '../ConfirmModal'
import { IconArchive, IconClose, IconEdit, IconRestore, IconTrash } from '../Icons'
import PersonBubble from '../PersonBubble'
import { Timestamp, addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import { useState } from 'react'

// Zarządzanie osobami: dodawanie, edycja, kolor i ikona.

export default function PeopleManager({ user, calPeople, editData, onClose }) {
  const [editId, setEditId] = useState(editData?.id || null)
  const [name, setName]     = useState(editData?.name || '')
  const [color, setColor]   = useState(editData?.color || PERSON_COLORS[0])
  const [saving, setSaving] = useState(false)

  const resetForm = () => { setEditId(null); setName(''); setColor(PERSON_COLORS[0]) }
  const startEdit = (p) => { setEditId(p.id); setName(p.name); setColor(p.color || PERSON_COLORS[0]) }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    if (editId) {
      await updateDoc(doc(db, 'users', user.uid, 'calendarPeople', editId), { name: name.trim(), color })
    } else {
      await addDoc(collection(db, 'users', user.uid, 'calendarPeople'), {
        name: name.trim(), color, createdAt: Timestamp.now()
      })
    }
    resetForm()
    setSaving(false)
  }

  const handleArchive = async (id) => {
    await setPersonHidden(user.uid, id, 'calendar', true)
    if (editId === id) resetForm()
  }
  const handleRestore = async (id) => { await setPersonHidden(user.uid, id, 'calendar', false) }
  const handleDelete = async (id) => {
    const ok = await confirmDialog({
      title: 'Usunąć osobę trwale?',
      message: 'Usunie też WSZYSTKIE jej wydarzenia i prośby modlitewne. Tego nie da się cofnąć. (Aby tylko ukryć w kalendarzu — użyj Ukryj.)'
    })
    if (!ok) return
    await purgePerson(user.uid, id)
    if (editId === id) resetForm()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Osoby w kalendarzu</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div className="form">
          {calPeople.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {calPeople.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: editId === p.id ? p.color + '18' : 'var(--surface2)', borderRadius: 10, border: `1px solid ${editId === p.id ? p.color : p.color + '33'}`, opacity: p.hiddenInCalendar ? 0.6 : 1 }}>
                  <PersonBubble person={p} size={34} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: p.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.name}
                    {p.hiddenInCalendar && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: 'var(--surface3)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Ukr.</span>}
                  </span>
                  {p.hiddenInCalendar ? (
                    <button className="t-btn" title="Pokaż w kalendarzu" onClick={() => handleRestore(p.id)}><IconRestore size={13} /></button>
                  ) : (
                    <>
                      <button className="t-btn" title="Edytuj" onClick={() => startEdit(p)}><IconEdit size={13} /></button>
                      <button className="t-btn" title="Ukryj w kalendarzu (zostaje w bazie Osób)" onClick={() => handleArchive(p.id)}><IconArchive size={13} /></button>
                    </>
                  )}
                  <button className="t-btn delete" title="Usuń trwale (z wydarzeniami i prośbami)" onClick={() => handleDelete(p.id)}><IconTrash size={13} /></button>
                </div>
              ))}
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 14px' }} />
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700 }}>{editId ? 'Edytuj osobę' : 'Dodaj osobę'}</p>

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Imię / nazwa</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)}
                placeholder="np. Mama, Zuzia, Tomek..." maxLength={40} />
            </div>
            <div className="form-group">
              <label>Kolor</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: name ? 10 : 0 }}>
                {PERSON_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{
                    width: 34, height: 34, borderRadius: '50%', background: c, cursor: 'pointer', border: 'none',
                    boxShadow: color === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : 'none',
                    transition: 'box-shadow .15s',
                  }} />
                ))}
              </div>
              {name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <PersonBubble person={{ name, color }} size={40} />
                  <span style={{ fontSize: 13, color, fontWeight: 600 }}>{name}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-save" disabled={saving || !name.trim()} style={{ flex: 1 }}>
                {saving ? 'Zapisywanie...' : editId ? 'Zapisz zmiany' : '+ Dodaj osobę'}
              </button>
              {editId && (
                <button type="button" onClick={resetForm} style={{ padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>
                  Anuluj
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ─── CategoryManager ──────────────────────────────────────────────────── */
