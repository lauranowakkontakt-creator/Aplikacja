import { db } from '../../firebase/config'
import { CatIcon, ICON_CATALOG, IconClose } from '../Icons'
import { Timestamp, addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { useState } from 'react'

// Formularz listy zadań.

// Paleta kolorów listy zadań. Używa jej wyłącznie ten formularz —
// wspólny plik dla jednego konsumenta byłby tylko rozproszeniem.
const LIST_COLORS = [
  '#C94B28','#E05A2B','#F97316','#F59E0B','#EAB308','#84CC16',
  '#22C55E','#10B981','#14B8A6','#06B6D4','#3B82F6','#6366F1',
  '#8B5CF6','#A855F7','#EC4899','#F43F5E','#64748B','#6B7280',
  '#059669','#0EA5E9','#DC2626','#7C3AED','#0D9488','#4F46E5',
  '#BE185D','#6B9E72','#4A90D9','#1ABC9C','#E74C3C','#92400E',
]

export default function ListForm({ user, onClose, editData }) {
  const [name, setName]         = useState(editData?.name || '')
  const [iconKey, setIconKey]   = useState(editData?.icon || 'IcBriefcase')
  const [iconSearch, setIconSearch] = useState('')
  const [color, setColor]       = useState(editData?.color || '#6366f1')
  const [saving, setSaving]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const filteredIcons = iconSearch.trim()
    ? ICON_CATALOG.filter(ic => ic.label.toLowerCase().includes(iconSearch.toLowerCase()) || ic.group.toLowerCase().includes(iconSearch.toLowerCase()))
    : ICON_CATALOG

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    if (editData) {
      await updateDoc(doc(db, 'users', user.uid, 'todoLists', editData.id), {
        name: name.trim(), icon: iconKey, color
      })
    } else {
      await addDoc(collection(db, 'users', user.uid, 'todoLists'), {
        name: name.trim(), icon: iconKey, color, createdAt: Timestamp.now()
      })
    }
    onClose()
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await deleteDoc(doc(db, 'users', user.uid, 'todoLists', editData.id))
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj listę' : 'Nowa lista'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Nazwa</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)}
              placeholder="np. Praca, Dom, Projekt..." maxLength={30} />
          </div>
          <div className="form-group">
            <label>Ikona</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color, border: `2px solid ${color}` }}>
                <CatIcon categoryId={null} emoji={iconKey} size={22} />
              </div>
              <input type="text" className="form-input" value={iconSearch} onChange={e => setIconSearch(e.target.value)}
                placeholder="Szukaj ikony..." style={{ margin: 0, flex: 1 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
              {filteredIcons.map(ic => (
                <button key={ic.key} type="button"
                  onClick={() => setIconKey(ic.key)}
                  title={ic.label}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    border: `2px solid ${iconKey === ic.key ? color : 'var(--border)'}`,
                    background: iconKey === ic.key ? color + '22' : 'transparent',
                    color: iconKey === ic.key ? color : 'var(--text-muted)', padding: 0
                  }}>
                  <CatIcon categoryId={null} emoji={ic.key} size={17} />
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Kolor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {LIST_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: `3px solid ${color === c ? 'var(--text)' : 'transparent'}`
                }} />
              ))}
            </div>
          </div>
          <button type="submit" className="btn-save" disabled={saving || !name.trim()}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Utwórz listę'}
          </button>
          {editData && (
            <button type="button" onClick={handleDelete} style={{
              width: '100%', padding: 12, borderRadius: 'var(--r)', border: `1px solid ${confirmDelete ? 'var(--expense)' : 'var(--border)'}`,
              background: confirmDelete ? 'var(--expense)22' : 'transparent', color: confirmDelete ? 'var(--expense)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 14, marginTop: 4,
            }}>
              {confirmDelete ? 'Kliknij ponownie aby potwierdzić usunięcie' : 'Usuń listę'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
