import { db } from '../../firebase/config'
import { confirmDialog } from '../ConfirmModal'
import { CatIcon, ICON_CATALOG, IconClose, IconEdit, IconTrash } from '../Icons'
import { CAT_COLORS } from './wspolne'
import { Timestamp, addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { useState } from 'react'

// Zarządzanie kategoriami wydarzeń.

export default function CategoryManager({ user, categories, onClose }) {
  const [editId, setEditId] = useState(null)
  const [icon, setIcon]     = useState('IconCalendar')
  const [label, setLabel]   = useState('')
  const [color, setColor]   = useState(CAT_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [iconSearch, setIconSearch] = useState('')

  const filteredIcons = iconSearch.trim()
    ? ICON_CATALOG.filter(ic => ic.label.toLowerCase().includes(iconSearch.toLowerCase()) || ic.group.toLowerCase().includes(iconSearch.toLowerCase()))
    : ICON_CATALOG

  const resetForm = () => { setEditId(null); setLabel(''); setIcon('IconCalendar'); setColor(CAT_COLORS[0]); setIconSearch('') }
  const startEdit = (cat) => { setEditId(cat.id); setLabel(cat.label); setIcon(cat.icon || 'IconCalendar'); setColor(cat.color || CAT_COLORS[0]); setIconSearch('') }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    if (editId) {
      await updateDoc(doc(db, 'users', user.uid, 'calendarCategories', editId), { label: label.trim(), icon, color })
    } else {
      await addDoc(collection(db, 'users', user.uid, 'calendarCategories'), { label: label.trim(), icon, color, createdAt: Timestamp.now() })
    }
    resetForm(); setSaving(false)
  }

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć kategorię?' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'calendarCategories', id))
    if (editId === id) resetForm()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Kategorie</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div className="form">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'min(56vh, 460px)', overflowY: 'auto' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: editId === cat.id ? cat.color + '18' : 'var(--surface2)', borderRadius: 10, border: `1px solid ${editId === cat.id ? cat.color : 'transparent'}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color }}>
                  <CatIcon categoryId={null} emoji={cat.icon} size={17} />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat.label}</span>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <button className="t-btn" title="Edytuj" onClick={() => startEdit(cat)}><IconEdit size={13} /></button>
                <button className="t-btn delete" title="Usuń" onClick={() => handleDelete(cat.id)}><IconTrash size={13} /></button>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700 }}>{editId ? 'Edytuj kategorię' : 'Dodaj kategorię'}</p>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Nazwa</label>
              <input type="text" className="form-input" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="np. Wakacje, Projekt..." maxLength={30} />
            </div>
            <div className="form-group">
              <label>Ikona</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color, border: `2px solid ${color}`, flexShrink: 0 }}>
                  <CatIcon categoryId={null} emoji={icon} size={22} />
                </div>
                <input type="text" className="form-input" value={iconSearch} onChange={e => setIconSearch(e.target.value)}
                  placeholder="Szukaj ikony..." style={{ margin: 0, flex: 1 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
                {filteredIcons.map(ic => (
                  <button key={ic.key} type="button" title={ic.label} onClick={() => setIcon(ic.key)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                    border: `2px solid ${icon === ic.key ? color : 'var(--border)'}`,
                    background: icon === ic.key ? color + '22' : 'transparent',
                    color: icon === ic.key ? color : 'var(--text-muted)'
                  }}>
                    <CatIcon categoryId={null} emoji={ic.key} size={17} />
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Kolor</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CAT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: `3px solid ${color === c ? 'var(--text)' : 'transparent'}`
                  }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-save" disabled={saving || !label.trim()} style={{ flex: 1 }}>
                {saving ? 'Zapisywanie...' : editId ? 'Zapisz zmiany' : '+ Dodaj kategorię'}
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
