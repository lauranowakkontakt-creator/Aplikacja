import { updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { CatIcon, IconClose, IconArchive, IconRestore } from '../Icons'

// Archiwum nawyków — spod ⋮, nie z dołu ekranu. Wcześniej siedziało pod listą
// dnia i trzeba było przewinąć cały dzień, żeby je w ogóle zobaczyć.
// Poza podglądem daje to, po co się tu zagląda: przywrócenie nawyku jednym
// kliknięciem. Kliknięcie wiersza otwiera pełną edycję.
export default function HabitArchive({ user, habits, onEdit, onClose }) {
  const restore = async (h) => {
    await updateDoc(doc(db, 'users', user.uid, 'habits', h.id), { archived: false })
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Archiwum nawyków</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            Zarchiwizowane nawyki nie liczą się do serii ani statystyk. Przywróć,
            żeby wrócił na listę dnia — historia odhaczeń zostaje.
          </p>

          {habits.length === 0 ? (
            <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Archiwum jest puste.
            </p>
          ) : habits.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => onEdit(h)} title="Edytuj nawyk"
                style={{
                  flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '8px 10px', borderRadius: 10, textAlign: 'left', fontFamily: 'inherit',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                }}>
                <span className="habit-emoji" style={{
                  background: (h.color || 'var(--accent)') + '1A',
                  border: `1px solid ${(h.color || 'var(--accent)') + '40'}`,
                  color: h.color || 'var(--accent)',
                }}>
                  <CatIcon categoryId={null} emoji={h.emoji} size={14} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
              </button>
              <button className="t-btn" onClick={() => restore(h)} title="Przywróć nawyk"
                style={{ width: 'auto', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                <IconRestore size={13} /> Przywróć
              </button>
            </div>
          ))}

          {habits.length > 0 && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconArchive size={12} /> {habits.length} {habits.length === 1 ? 'nawyk' : 'w archiwum'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
