import { useState, useRef, useEffect } from 'react'

export default function BudgetMenu({ onAction, privateMode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const items = [
    { id: 'private',    icon: privateMode ? '🔓' : '🔒', label: privateMode ? 'Pokaż salda' : 'Tryb prywatny',  toggle: true },
    { id: 'search',     icon: '🔍', label: 'Szukaj transakcji' },
    { id: 'transfer',   icon: '💸', label: 'Przelew między kontami' },
    { id: 'tithe',      icon: '⛪', label: 'Dziesięcina' },
    { id: 'goals',      icon: '🎯', label: 'Cele oszczędnościowe' },
    { id: 'stats',      icon: '📊', label: 'Statystyki roczne' },
    { id: 'reminders',  icon: '🔔', label: 'Przypomnienia' },
  ]

  const handle = (id) => {
    onAction(id)
    setOpen(false)
  }

  return (
    <div className="budget-menu-wrap" ref={ref}>
      <button className={`budget-menu-btn ${open ? 'active' : ''}`} onClick={() => setOpen(o => !o)}>
        ⋮
      </button>
      {open && (
        <div className="budget-menu-dropdown">
          {items.map(item => (
            <button key={item.id} className="budget-menu-item" onClick={() => handle(item.id)}>
              <span className="bmi-icon">{item.icon}</span>
              <span className="bmi-label">{item.label}</span>
              {item.toggle && <span className={`bmi-toggle ${item.id === 'private' && privateMode ? 'on' : ''}`} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
