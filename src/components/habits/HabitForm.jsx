import { useState } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'

const EMOJIS = ['💧', '🏃', '📚', '🙏', '🥗', '😴', '🧘', '💊', '✍️', '🎵', '🚴', '🌿', '☀️', '🧹', '💪', '🫁', '📵', '🍎', '🧠', '❤️']

export default function HabitForm({ user, onClose, editData }) {
  const [name, setName] = useState(editData?.name || '')
  const [emoji, setEmoji] = useState(editData?.emoji || '💧')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Wpisz nazwę nawyku'); return }
    setSaving(true)
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'habits', editData.id), { name: name.trim(), emoji })
      } else {
        await addDoc(collection(db, 'users', user.uid, 'habits'), {
          name: name.trim(),
          emoji,
          completedDates: [],
          createdAt: Timestamp.now()
        })
      }
      onClose()
    } catch {
      setError('Błąd zapisu. Spróbuj ponownie.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Usunąć nawyk "${editData.name}"? Utracisz całą historię.`)) return
    await deleteDoc(doc(db, 'users', user.uid, 'habits', editData.id))
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
                <button
                  key={e}
                  type="button"
                  className={`emoji-btn ${emoji === e ? 'active' : ''}`}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Nazwa */}
          <div className="form-group">
            <label>Nazwa</label>
            <input
              type="text"
              placeholder="np. Pić 2L wody, Biegać, Czytać..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              maxLength={50}
              autoFocus
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj nawyk'}
          </button>

          {editData && (
            <button type="button" className="btn-delete-habit" onClick={handleDelete}>
              Usuń nawyk
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
