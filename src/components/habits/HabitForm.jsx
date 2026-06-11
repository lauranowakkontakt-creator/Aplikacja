import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format } from 'date-fns'
import { CatIcon, IconClose, IconTrash, IconPlus } from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'

// Built-in categories (can be extended with custom ones from DB)
export const DEFAULT_HABIT_CATEGORIES = [
  { id: 'health',  label: 'Zdrowie',   icon: null, color: '#ef4444' },
  { id: 'spirit',  label: 'Duchowość', icon: null, color: '#9B7CF0' },
  { id: 'learn',   label: 'Nauka',     icon: null, color: '#3B82F6' },
  { id: 'sport',   label: 'Sport',     icon: null, color: '#10B981' },
  { id: 'work',    label: 'Praca',     icon: null, color: '#F59E0B' },
  { id: 'other',   label: 'Inne',      icon: null, color: '#64748B' },
]

// HABIT_CATEGORIES exported for backward compat (used in HabitsDashboard)
export const HABIT_CATEGORIES = DEFAULT_HABIT_CATEGORIES

// Colors arranged as a spectrum
const HABIT_COLORS = [
  '#EF4444','#F97316','#F59E0B','#EAB308','#84CC16','#22C55E',
  '#10B981','#14B8A6','#06B6D4','#3B82F6','#6366F1','#8B5CF6',
  '#A855F7','#EC4899','#F43F5E','#64748B','#0D9488','#0EA5E9',
  '#7C3AED','#BE185D','#059669','#DC2626','#4F46E5','#1ABC9C',
]

const FREQ_DAYS = [
  { id: 1, label: 'Pn' }, { id: 2, label: 'Wt' }, { id: 3, label: 'Śr' },
  { id: 4, label: 'Cz' }, { id: 5, label: 'Pt' }, { id: 6, label: 'So' }, { id: 0, label: 'Nd' },
]

export default function HabitForm({ user, onClose, editData }) {
  const [name, setName]           = useState(editData?.name || '')
  const [color, setColor]         = useState(editData?.color || HABIT_COLORS[0])
  const [category, setCategory]   = useState(editData?.category || 'health')
  const [frequency, setFrequency] = useState(editData?.frequency || 'daily')
  const [freqDays, setFreqDays]   = useState(editData?.frequencyDays || [1,2,3,4,5,6,0])
  const [startDate, setStartDate] = useState(editData?.startDate || format(new Date(), 'yyyy-MM-dd'))
  const [hasEnd, setHasEnd]       = useState(!!editData?.endDate)
  const [endDate, setEndDate]     = useState(editData?.endDate || '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Custom categories
  const [customCats, setCustomCats]           = useState([])
  const [showAddCat, setShowAddCat]           = useState(false)
  const [newCatName, setNewCatName]           = useState('')
  const [newCatColor, setNewCatColor]         = useState('#6366F1')
  const [savingCat, setSavingCat]             = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'habitCategories'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setCustomCats(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const allCategories = [
    ...DEFAULT_HABIT_CATEGORIES,
    ...customCats.map(c => ({ id: c.id, label: c.name, icon: 'IcTag', color: c.color, custom: true }))
  ]

  const selectedCat = allCategories.find(c => c.id === category) || allCategories[0]

  const toggleDay = (id) =>
    setFreqDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  const getFreqDays = () => {
    if (frequency === 'daily')    return [0,1,2,3,4,5,6]
    if (frequency === 'weekdays') return [1,2,3,4,5]
    if (frequency === 'weekend')  return [0,6]
    return freqDays
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    const ref = await addDoc(collection(db, 'users', user.uid, 'habitCategories'), {
      name: newCatName.trim(), color: newCatColor, createdAt: Timestamp.now()
    })
    setCategory(ref.id)
    setNewCatName(''); setShowAddCat(false); setSavingCat(false)
  }

  const handleDeleteCategory = async (catId) => {
    if (!confirm('Usunąć kategorię?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'habitCategories', catId))
    if (category === catId) setCategory('health')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Wpisz nazwę'); return }
    if (frequency === 'custom' && freqDays.length === 0) { setError('Wybierz co najmniej 1 dzień'); return }
    setSaving(true)
    const data = {
      name: name.trim(),
      color,
      category,
      frequency,
      frequencyDays: getFreqDays(),
      startDate,
      endDate: hasEnd && endDate ? endDate : null,
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'habits', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'habits'), {
          ...data, completedDates: [], archived: false, createdAt: Timestamp.now()
        })
      }
      onClose()
    } catch { setError('Błąd zapisu'); setSaving(false) }
  }

  const handleDelete = async () => {
    const ok = await confirmDialog({ title: `Usunąć nawyk "${editData.name}"?`, message: "Utracisz całą historię aktywności." })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'habits', editData.id))
    onClose()
  }

  const handleArchive = async () => {
    await updateDoc(doc(db, 'users', user.uid, 'habits', editData.id), { archived: !editData.archived })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj nawyk' : 'Nowy nawyk'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">

          {/* Nazwa */}
          <div className="form-group">
            <label>Nazwa</label>
            <input type="text" className="form-input" value={name}
              onChange={e => setName(e.target.value)} placeholder="np. Czytanie, Bieganie..." maxLength={40} />
          </div>

          {/* Kategoria */}
          <div className="form-group">
            <label>Kategoria</label>
            <div className="habit-cat-grid" style={{ marginBottom: 8 }}>
              {allCategories.map(cat => (
                <button key={cat.id} type="button"
                  className={`habit-cat-btn ${category === cat.id ? 'active' : ''}`}
                  style={category === cat.id ? { borderColor: cat.color, background: cat.color + '22', color: cat.color } : {}}
                  onClick={() => setCategory(cat.id)}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: (category === cat.id ? cat.color : 'var(--surface3)') + (category === cat.id ? '33' : ''),
                    color: category === cat.id ? cat.color : 'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    <CatIcon categoryId={cat.id} emoji={cat.icon} size={15} />
                  </div>
                  <span style={{ fontSize: 12 }}>{cat.label}</span>
                  {cat.custom && (
                    <span onClick={ev => { ev.stopPropagation(); handleDeleteCategory(cat.id) }}
                      style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', padding: '0 2px' }}>✕</span>
                  )}
                </button>
              ))}
            </div>

            {/* Add custom category */}
            {showAddCat ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="text" className="form-input" value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nazwa kategorii..." maxLength={20} autoFocus
                  style={{ margin: 0, flex: 1 }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {HABIT_COLORS.slice(0, 8).map(c => (
                    <button key={c} type="button" onClick={() => setNewCatColor(c)} style={{
                      width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: `2px solid ${newCatColor === c ? 'var(--text)' : 'transparent'}`
                    }} />
                  ))}
                </div>
                <button type="button" className="btn-save" style={{ margin: 0, padding: '6px 12px', fontSize: 12 }}
                  onClick={handleAddCategory} disabled={savingCat || !newCatName.trim()}>+</button>
                <button type="button" onClick={() => setShowAddCat(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>✕</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAddCat(true)}
                style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <IconPlus size={12} /> Własna kategoria
              </button>
            )}
          </div>

          {/* Kolor */}
          <div className="form-group">
            <label>Kolor</label>
            <div className="color-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {HABIT_COLORS.map(c => (
                <button key={c} type="button"
                  className={`color-dot ${color === c ? 'active' : ''}`}
                  style={{ background: c, width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', border: `3px solid ${color === c ? 'var(--text)' : 'transparent'}`, transition: 'transform .15s', transform: color === c ? 'scale(1.2)' : 'scale(1)' }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Częstotliwość */}
          <div className="form-group">
            <label>Częstotliwość</label>
            <div className="type-toggle" style={{ flexWrap: 'wrap', gap: 6 }}>
              {[
                { id: 'daily',    label: 'Codziennie' },
                { id: 'weekdays', label: 'Pon–Pt' },
                { id: 'weekend',  label: 'Sob–Nd' },
                { id: 'custom',   label: 'Własne' },
              ].map(f => (
                <button key={f.id} type="button"
                  className={`type-btn ${frequency === f.id ? 'active expense' : ''}`}
                  onClick={() => setFrequency(f.id)}
                >{f.label}</button>
              ))}
            </div>
            {frequency === 'custom' && (
              <div className="freq-days-picker">
                {FREQ_DAYS.map(d => (
                  <button key={d.id} type="button"
                    className={`freq-day-btn ${freqDays.includes(d.id) ? 'active' : ''}`}
                    onClick={() => toggleDay(d.id)}
                  >{d.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Daty */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Data rozpoczęcia</label>
              <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Data zakończenia</label>
              <select className="form-input" value={hasEnd ? 'yes' : 'no'} onChange={e => setHasEnd(e.target.value === 'yes')}>
                <option value="no">Bez końca</option>
                <option value="yes">Ustaw datę</option>
              </select>
              {hasEnd && <input type="date" className="form-input" style={{ marginTop: 6 }} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />}
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj nawyk'}
          </button>

          {editData && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={handleArchive}>
                {editData.archived ? 'Przywróć' : 'Archiwizuj'}
              </button>
              <button type="button" className="btn-outline danger" style={{ flex: 1 }} onClick={handleDelete}>
                <IconTrash size={14} /> Usuń
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
