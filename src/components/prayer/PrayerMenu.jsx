import { useState, useRef, useEffect } from 'react'
import { IconMoreVert, IconChart, IconArchive } from '../Icons'

// Menu „trzy kropki" dla Modlitwy — Statystyki / Archiwum.
export default function PrayerMenu({ onAction }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const items = [
    { id: 'stats',   Icon: IconChart,   label: 'Statystyki' },
    { id: 'archive', Icon: IconArchive, label: 'Archiwum' },
  ]

  const handle = (id) => { onAction(id); setOpen(false) }

  return (
    <div className="budget-menu-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen(o => !o)} title="Więcej"
        style={open ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>
        <IconMoreVert size={18} />
      </button>
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
