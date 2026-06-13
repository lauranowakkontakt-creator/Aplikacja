import { useState } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format } from 'date-fns'
import { ICON_CATALOG, CatIcon, IconClose, IconTrash, IconArchive, IconRestore } from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'

export const HABIT_CATEGORIES = [
  { id: 'health',  label: 'Zdrowie',   icon: 'IcDrop' },
  { id: 'spirit',  label: 'Duchowość', icon: 'IcPray' },
  { id: 'learn',   label: 'Nauka',     icon: 'IcBookOpen' },
  { id: 'sport',   label: 'Sport',     icon: 'IcYoga' },
  { id: 'work',    label: 'Praca',     icon: 'IcBriefcase' },
  { id: 'other',   label: 'Inne',      icon: 'IcTarget' },
]
export const DEFAULT_HABIT_CATEGORIES = HABIT_CATEGORIES

const HABIT_COLORS = [
  '#C94B28','#E05A2B','#F97316','#F59E0B','#EAB308','#84CC16',
  '#22C55E','#10B981','#14B8A6','#06B6D4','#3B82F6','#6366F1',
  '#8B5CF6','#A855F7','#EC4899','#F43F5E','#64748B','#6B7280',
  '#92400E','#059669','#0EA5E9','#DC2626','#7C3AED','#0D9488',
  '#4F46E5','#BE185D','#6B9E72','#4A90D9','#1ABC9C','#E74C3C',
]

const FREQ_DAYS = [
  { id: 1, label: 'Pn' }, { id: 2, label: 'Wt' }, { id: 3, label: 'Śr' },
  { id: 4, label: 'Cz' }, { id: 5, label: 'Pt' }, { id: 6, label: 'So' }, { id: 0, label: 'Nd' },
]

export default function HabitForm({ user, onClose, editData }) {
  const [name, setName]           = useState(editData?.name || '')
  const [iconKey, setIconKey]     = useState(editData?.emoji || 'IcTarget')
  const [iconSearch, setIconSearch] = useState('')
  const [color, setColor]         = useState(editData?.color || HABIT_COLORS[1])
  const [category, setCategory]   = useState(editData?.category || 'health')
  const [frequency, setFrequency] = useState(editData?.frequency || 'daily')
  const [freqDays, setFreqDays]   = useState(editData?.frequencyDays || [1,2,3,4,5,6,0])
  const [startDate, setStartDate] = useState(editData?.startDate || format(new Date(), 'yyyy-MM-dd'))
  const [hasEnd, setHasEnd]       = useState(!!editData?.endDate)
  const [endDate, setEndDate]     = useState(editData?.endDate || '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const filteredIcons = iconSearch.trim()
    ? ICON_CATALOG.filter(ic => ic.label.toLowerCase().includes(iconSearch.toLowerCase()) || ic.group.toLowerCase().includes(iconSearch.toLowerCase()))
    : ICON_CATALOG

  const toggleDay = (id) =>
    setFreqDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  const getFreqDays = () => {
    if (frequency === 'daily')    return [0,1,2,3,4,5,6]
    if (frequency === 'weekdays') return [1,2,3,4,5]
    if (frequency === 'weekend')  return [0,6]
    return freqDays
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Wpisz nazwę'); return }
    if (frequency === 'custom' && freqDays.length === 0) { setError('Wybierz co najmniej 1 dzień'); return }
    setSaving(true)
    const data = {
      name: name.trim(), emoji: iconKey, color, category, frequency, frequencyDays: getFreqDays(),
      startDate, endDate: hasEnd && endDate ? endDate : null,
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'habits', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'habits'), { ...data, completedDates: [], archived: false, createdAt: Timestamp.now() })
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

          {/* Ikona */}
          <div className="form-group">
            <label>Ikona</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color, border: `2px solid ${color}`, flexShrink: 0 }}>
                <CatIcon categoryId={null} emoji={iconKey} size={24} />
              </div>
              <input type="text" className="form-input" value={iconSearch} onChange={e => setIconSearch(e.target.value)}
                placeholder="Szukaj ikony..." style={{ margin: 0, flex: 1 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, maxHeight: 168, overflowY: 'auto' }}>
              {filteredIcons.map(ic => (
                <button key={ic.key} type="button"
                  onClick={() => setIconKey(ic.key)}
                  title={ic.label}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    border: `2px solid ${iconKey === ic.key ? color : 'var(--border)'}`,
                    background: iconKey === ic.key ? color + '22' : 'transparent',
                    color: iconKey === ic.key ? color : 'var(--text-muted)',
                    padding: 0
                  }}>
                  <CatIcon categoryId={null} emoji={ic.key} size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Nazwa */}
          <div className="form-group">
            <label>Nazwa</label>
            <input type="text" className="form-input" value={name}
              onChange={e => setName(e.target.value)} placeholder="np. Czytanie, Bieganie..." maxLength={40} />
          </div>

          {/* Kategoria */}
          <div className="form-group">
            <label>Kategoria</label>
            <div className="habit-cat-grid">
              {HABIT_CATEGORIES.map(cat => (
                <button key={cat.id} type="button"
                  className={`habit-cat-btn ${category === cat.id ? 'active' : ''}`}
                  onClick={() => setCategory(cat.id)}
                >
                  <CatIcon categoryId={cat.id} emoji={cat.icon} size={16} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Kolor */}
          <div className="form-group">
            <label>Kolor</label>
            <div className="color-picker">
              {HABIT_COLORS.map(c => (
                <button key={c} type="button"
                  className={`color-dot ${color === c ? 'active' : ''}`}
                  style={{ background: c }}
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
                {editData.archived
                  ? <><IconRestore size={14} /> Przywróć</>
                  : <><IconArchive size={14} /> Archiwizuj</>}
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
