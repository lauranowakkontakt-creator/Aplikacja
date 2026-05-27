import { useState, useRef, useEffect } from 'react'
import { CURRENCIES, getCurrencyCode, setCurrencyCode } from '../../utils/currency'

export default function BudgetMenu({ onAction, privateMode }) {
  const [open, setOpen]         = useState(false)
  const [showCurrency, setShowCurrency] = useState(false)
  const [currentCurrency, setCurrentCurrency] = useState(getCurrencyCode())
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowCurrency(false) } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const items = [
    { id: 'private',    icon: privateMode ? '🔓' : '🔒', label: privateMode ? 'Pokaż salda' : 'Tryb prywatny', toggle: true },
    { id: 'search',     icon: '🔍', label: 'Szukaj transakcji' },
    { id: 'transfer',   icon: '💸', label: 'Przelew między kontami' },
    { id: 'tithe',      icon: '⛪', label: 'Dziesięcina' },
    { id: 'goals',      icon: '🎯', label: 'Cele oszczędnościowe' },
    { id: 'reminders',  icon: '🔔', label: 'Przypomnienia' },
    { id: 'categories', icon: '🏷️', label: 'Zarządzaj kategoriami' },
    { id: 'currency',   icon: '💱', label: `Waluta (${currentCurrency})` },
  ]

  const handle = (id) => {
    if (id === 'currency') { setShowCurrency(v => !v); return }
    onAction(id)
    setOpen(false)
  }

  const selectCurrency = (code) => {
    setCurrencyCode(code)
    setCurrentCurrency(code)
    setShowCurrency(false)
    setOpen(false)
    window.location.reload()
  }

  return (
    <div className="budget-menu-wrap" ref={ref}>
      <button className={`budget-menu-btn ${open ? 'active' : ''}`} onClick={() => setOpen(o => !o)}>
        ⋮
      </button>
      {open && (
        <div className="budget-menu-dropdown">
          {showCurrency ? (
            <>
              <div className="budget-menu-item" style={{ cursor: 'default', fontSize: 12, color: 'var(--text-muted)' }}>
                <span className="bmi-icon">💱</span>
                <span className="bmi-label">Wybierz walutę</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}
                  onClick={() => setShowCurrency(false)}>✕</button>
              </div>
              {CURRENCIES.map(c => (
                <button key={c.code} className="budget-menu-item" onClick={() => selectCurrency(c.code)}>
                  <span className="bmi-icon" style={{ fontSize: 14, width: 22 }}>{c.symbol}</span>
                  <span className="bmi-label">{c.name}</span>
                  {c.code === currentCurrency && <span style={{ fontSize: 16, color: 'var(--primary)' }}>✓</span>}
                </button>
              ))}
            </>
          ) : (
            items.map(item => (
              <button key={item.id} className="budget-menu-item" onClick={() => handle(item.id)}>
                <span className="bmi-icon">{item.icon}</span>
                <span className="bmi-label">{item.label}</span>
                {item.toggle && <span className={`bmi-toggle ${item.id === 'private' && privateMode ? 'on' : ''}`} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
