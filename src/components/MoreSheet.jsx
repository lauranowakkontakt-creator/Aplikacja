import { IconSettings } from './Icons'

/* Bottom-sheet launcher — wszystkie moduły + ustawienia.
   modules: pełna lista { id, label, Icon } z App.
   activeModule: id aktywnego modułu (do podświetlenia). */
export default function MoreSheet({ open, onClose, modules, activeModule, accents, onSelect, onSettings }) {
  return (
    <>
      <div className={`more-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`more-sheet${open ? ' open' : ''}`} role="dialog" aria-label="Wszystkie aplikacje">
        <div className="more-handle" />
        <div className="more-title">Wszystkie aplikacje</div>
        <div className="more-grid">
          {modules.filter(m => !m.hidden).map(m => {
            const accent = accents[m.id] || 'var(--primary)'
            const isActive = activeModule === m.id
            return (
              <button
                key={m.id}
                className={`more-item${isActive ? ' active' : ''}`}
                style={{ '--card-accent': accent }}
                onClick={() => onSelect(m.id)}
              >
                <span className="more-item-icon"><m.Icon size={24} /></span>
                <span className="more-item-label">{m.label}</span>
              </button>
            )
          })}
          <button className="more-item" onClick={onSettings}>
            <span className="more-item-icon" style={{ color: 'var(--text-sub)' }}><IconSettings size={22} /></span>
            <span className="more-item-label">Ustawienia</span>
          </button>
        </div>
      </div>
    </>
  )
}
