import { useState } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'

export const HABIT_CATEGORIES = [
  { id: 'health',  label: 'Zdrowie',   icon: '❤️' },
  { id: 'spirit',  label: 'Duchowość', icon: '🙏' },
  { id: 'learn',   label: 'Nauka',     icon: '📖' },
  { id: 'sport',   label: 'Sport',     icon: '💪' },
  { id: 'work',    label: 'Praca',     icon: '💼' },
  { id: 'other',   label: 'Inne',      icon: '📌' },
]

const HABIT_COLORS = ['#C94B28', '#6B9E72', '#4A90D9', '#9B59B6', '#E67E22', '#1ABC9C', '#E74C3C', '#F1C40F']

const EMOJIS = ['💪', '📖', '🧘', '🏃', '💧', '🥗', '😴', '🙏', '✍️', '🎯', '🎸', '🌿', '☕', '🧹', '💊', '🚶', '🏋️', '🧠', '❤️', '⭐']

const FREQ_DAYS = [
  { id: 1, label: 'Pn' }, { id: 2, label: 'Wt' }, { id: 3, label: 'Śr' },
  { id: 4, label: 'Cz' }, { id: 5, label: 'Pt' }, { id: 6, label: 'So' }, { id: 0, label: 'Nd' },
]

export default function HabitForm({ user, onClose, editData }) {
  const [name, setName]           = useState(editData?.name || '')
  const [emoji, setEmoji]         = useState(editData?.emoji || '💪')
  const [color, setColor]         = useState(editData?.color || HABIT_COLORS[1])
  const [category, setCategory]   = useState(editData?.category || 'health')
  const [frequency, setFrequency] = useState(editData?.frequency || 'daily')
  const [freqDays, setFreqDays]   = useState(editData?.frequencyDays || [1,2,3,4,5,6,0])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

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
    const data = { name: name.trim(), emoji, color, category, frequency, frequencyDays: getFreqDays(), updatedAt: Timestamp.now() }
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
    if (!confirm(`Usunąć nawyk "${editData.name}"? Utracisz całą historię.`)) return
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
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="form">

          {/* Emoji */}
          <div className="form-group">
            <label>Ikona</label>
            <div className="emoji-grid">
              {EMOJIS.map(e => (
                <button key={e} type="button" className={`emoji-btn ${emoji === e ? 'active' : ''}`} onClick={() => setEmoji(e)}>{e}</button>
              ))}
            </div>
          </div>

          {/* Nazwa */}
          <div className="form-group">
            <label>Nazwa</label>
            <input type="text" className="form-input" value={name}
              onChange={e => setName(e.target.value)} placeholder="np. Czytanie, Bieganie..." autoFocus maxLength={40} />
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
                  <span>{cat.icon}</span>
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

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj nawyk'}
          </button>

          {editData && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={handleArchive}>
                {editData.archived ? '📤 Przywróć' : '📦 Archiwizuj'}
              </button>
              <button type="button" className="btn-outline danger" style={{ flex: 1 }} onClick={handleDelete}>
                🗑️ Usuń
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
