import { useState, useEffect, useMemo } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { ICON_CATALOG, CatIcon, IconClose, IconTrash, IconEdit, IconTag, IconSearch, IconChevronDown } from '../Icons'
import { confirmDialog } from '../ConfirmModal'

const CAT_COLORS = [
  '#C94B28', '#E05A2B', '#F59E0B', '#84CC16', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#EC4899', '#F43F5E', '#64748B', '#0EA5E9', '#059669', '#7C3AED',
]

export default function HabitCategoryManager({ user, onClose }) {
  const [cats, setCats] = useState([])
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'habitCategories'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setCats(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const remove = async (c) => {
    const ok = await confirmDialog({
      title: `Usunąć kategorię „${c.name}"?`,
      message: 'Nawyki w tej kategorii zostaną, ale stracą przypisanie.',
    })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'habitCategories', c.id))
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3><IconTag size={17} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Kategorie nawyków</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            Twoje własne kategorie (oprócz wbudowanych: Zdrowie, Duchowość, Nauka, Sport, Praca, Inne).
          </p>

          {cats.map(c => editId === c.id ? (
            <CatForm key={c.id} user={user} initial={c} onDone={() => setEditId(null)} />
          ) : (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderLeft: `3px solid ${c.color || '#64748B'}`, borderRadius: 10, padding: '9px 12px',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: (c.color || '#64748B') + '22', color: c.color || '#64748B', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <CatIcon categoryId={null} emoji={c.icon || 'IcTag'} size={17} />
              </div>
              <span style={{ flex: 1, fontSize: 14 }}>{c.name}</span>
              <button className="t-btn" onClick={() => setEditId(c.id)}><IconEdit size={13} /></button>
              <button className="t-btn delete" onClick={() => remove(c)}><IconTrash size={13} /></button>
            </div>
          ))}

          {cats.length === 0 && !adding && (
            <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Brak własnych kategorii.</p>
          )}

          {adding ? (
            <CatForm user={user} onDone={() => setAdding(false)} isNew />
          ) : (
            <button className="btn-add-account" onClick={() => setAdding(true)}>+ Nowa kategoria</button>
          )}
        </div>
      </div>
    </div>
  )
}

function CatForm({ user, initial, onDone, isNew }) {
  const [name, setName]   = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || CAT_COLORS[0])
  const [icon, setIcon]   = useState(initial?.icon || 'IcTag')
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [err, setErr] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? ICON_CATALOG.filter(ic => ic.label.toLowerCase().includes(q) || ic.group.toLowerCase().includes(q)) : ICON_CATALOG
  }, [search])

  const currentEntry = ICON_CATALOG.find(ic => ic.key === icon)

  const save = async () => {
    if (!name.trim()) { setErr('Wpisz nazwę'); return }
    const data = { name: name.trim(), color, icon }
    if (isNew) await addDoc(collection(db, 'users', user.uid, 'habitCategories'), { ...data, createdAt: Timestamp.now() })
    else await updateDoc(doc(db, 'users', user.uid, 'habitCategories', initial.id), data)
    onDone()
  }

  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{isNew ? 'Nowa kategoria' : 'Edytuj kategorię'}</p>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Nazwa</label>
        <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)}
          placeholder="np. Finanse, Relacje..." maxLength={30} autoFocus />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Ikona</label>
        <button type="button" onClick={() => setPickerOpen(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '22', display: 'grid', placeItems: 'center' }}>
            <CatIcon categoryId={null} emoji={icon} size={18} />
          </div>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', textAlign: 'left' }}>{currentEntry ? currentEntry.label : icon}</span>
          <IconChevronDown size={13} style={{ color: 'var(--text-muted)', transform: pickerOpen ? 'rotate(180deg)' : 'none' }} />
        </button>
        {pickerOpen && (
          <div style={{ marginTop: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconSearch size={14} style={{ color: 'var(--text-muted)' }} />
              <input type="text" className="form-input" placeholder="Szukaj ikony..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ margin: 0, fontSize: 13, border: 'none', background: 'transparent', padding: '2px 0' }} />
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
              {filtered.map(ic => (
                <button key={ic.key} type="button" title={ic.label}
                  onClick={() => { setIcon(ic.key); setPickerOpen(false); setSearch('') }}
                  style={{
                    aspectRatio: '1', borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0,
                    border: `2px solid ${icon === ic.key ? color : 'var(--border)'}`,
                    background: icon === ic.key ? color + '22' : 'transparent',
                    color: icon === ic.key ? color : 'var(--text-muted)',
                  }}>
                  <CatIcon categoryId={null} emoji={ic.key} size={17} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Kolor</label>
        <div className="color-picker">
          {CAT_COLORS.map(c => (
            <button key={c} type="button" className={`color-dot ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
      {err && <p className="form-error" style={{ margin: 0 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-save" style={{ flex: 1, margin: 0 }} onClick={save}>{isNew ? 'Dodaj' : 'Zapisz'}</button>
        <button type="button" onClick={onDone} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r-sm)', padding: 12, cursor: 'pointer', fontSize: 14 }}>Anuluj</button>
      </div>
    </div>
  )
}
