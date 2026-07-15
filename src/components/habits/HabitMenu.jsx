import { useState, useRef, useEffect } from 'react'
import { IconPause, IconReorder } from '../Icons'

// Menu „trzy kropki" dla Nawyków — spójne wizualnie z BudgetMenu (te same klasy CSS).
// Kryje opcje Pauza i Kolejność, żeby nagłówek był czysty (tylko + i ⋮).
export default function HabitMenu({ onAction, canReorder = true }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const items = [
    { id: 'pause',   Icon: IconPause,   label: 'Pauza (wyjazd / choroba)' },
    ...(canReorder ? [{ id: 'reorder', Icon: IconReorder, label: 'Kolejność nawyków' }] : []),
  ]

  const handle = (id) => { onAction(id); setOpen(false) }

  return (
    <div className="budget-menu-wrap" ref={ref}>
      <button className={`budget-menu-btn ${open ? 'active' : ''}`} onClick={() => setOpen(o => !o)}>⋮</button>
      {open && (
        <div className="budget-menu-dropdown">
          {items.map(item => (
            <button key={item.id} className="budget-menu-item" onClick={() => handle(item.id)}>
              <span className="bmi-icon"><item.Icon size={16} /></span>
              <span className="bmi-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
