import { db } from '../../firebase/config'
import { PERSON_COLORS } from '../../utils/prayerStats'
import { CatIcon, ICON_CATALOG, IconClose } from '../Icons'
import { Timestamp, addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import { useState } from 'react'

// Formularz osoby: dodawanie i edycja.

const PERSON_ICON_GROUPS = [
  { label: 'Ludzie', keys: ['IcUsers','IcUser','IcHeart','IcStar','IcChild','IcFamily'] },
  { label: 'Wiara', keys: ['IcPrayer','IcCross','IcChurch','IcBible','IcDove','IcCandle'] },
  { label: 'Emocje', keys: ['IcSmile','IcSad','IcStrong','IcHug','IcPeace'] },
  { label: 'Zdrowie', keys: ['IcHealth','IcPill','IcHospital','IcRun','IcMedal'] },
  { label: 'Praca', keys: ['IcWork','IcSchool','IcBook','IcGrad','IcBriefcase'] },
]

const ALL_PERSON_ICON_KEYS = ICON_CATALOG.map(ic => ic.key)
const PERSON_ICON_CATALOG  = ICON_CATALOG

export default function PersonForm({ user, editData, onClose }) {
  const [name, setName]         = useState(editData?.name || '')
  const [note, setNote]         = useState(editData?.note || '')
  const [iconKey, setIconKey]   = useState(editData?.icon || 'IcUsers')
  const [color, setColor]       = useState(editData?.color || PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)])
  const [iconSearch, setIconSearch] = useState('')
  const [saving, setSaving]     = useState(false)

  const filtered = iconSearch.trim()
    ? ICON_CATALOG.filter(ic => ic.label.toLowerCase().includes(iconSearch.toLowerCase()) || ic.group.toLowerCase().includes(iconSearch.toLowerCase()))
    : PERSON_ICON_CATALOG

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    // Osoba jest współdzielona z Kalendarzem → zapis do `calendarPeople`. Kolor używa Kalendarz, ikona/notatka — Modlitwa.
    const data = { name: name.trim(), note: note.trim(), icon: iconKey, color, updatedAt: Timestamp.now() }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'calendarPeople', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'calendarPeople'), { ...data, createdAt: Timestamp.now() })
      }
      onClose()
    } catch { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj osobę' : 'Nowa osoba'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Imię / nazwa</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)}
              maxLength={60} placeholder="np. Mama, Zuzia, Przyjaciel Paweł..." />
          </div>

          <div className="form-group">
            <label>Ikona</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', border: '2px solid #8b5cf6' }}>
                <CatIcon categoryId={null} emoji={iconKey} size={24} />
              </div>
              <input type="text" className="form-input" value={iconSearch} onChange={e => setIconSearch(e.target.value)}
                placeholder="Szukaj ikony..." style={{ margin: 0, flex: 1 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
              {filtered.map(ic => (
                <button key={ic.key} type="button"
                  onClick={() => setIconKey(ic.key)}
                  title={ic.label}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    border: `2px solid ${iconKey === ic.key ? '#8b5cf6' : 'var(--border)'}`,
                    background: iconKey === ic.key ? 'rgba(139,92,246,0.15)' : 'transparent',
                    color: iconKey === ic.key ? '#8b5cf6' : 'var(--text-muted)',
                    padding: 0
                  }}>
                  <CatIcon categoryId={null} emoji={ic.key} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Notatka (opcjonalnie)</label>
            <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)}
              maxLength={200} placeholder="np. Chora na raka, szuka Boga..." />
          </div>

          <div className="form-group">
            <label>Kolor (w Kalendarzu)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PERSON_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer', border: 'none',
                  boxShadow: color === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : 'none',
                  transition: 'box-shadow .15s',
                }} />
              ))}
            </div>
          </div>
          <button type="submit" className="btn-save" disabled={saving || !name.trim()}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz' : 'Dodaj osobę'}
          </button>
        </form>
      </div>
    </div>
  )
}
