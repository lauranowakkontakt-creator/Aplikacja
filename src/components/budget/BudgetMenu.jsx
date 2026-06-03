import { useState, useRef, useEffect } from 'react'
import { CURRENCIES, getCurrencyCode, setCurrencyCode } from '../../utils/currency'
import { IconClose, IconSearch, IconTransfer, IconPrayer, IconStar, IconBell, IconTag, IconEye, IconEyeOff, IconCheck, IconBank } from '../Icons'

const IconCurrency = (p) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

export default function BudgetMenu({ onAction, privateMode, accounts = [], visibleAccounts, onToggleAccount }) {
  const [open, setOpen]         = useState(false)
  const [showCurrency, setShowCurrency] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [currentCurrency, setCurrentCurrency] = useState(getCurrencyCode())
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowCurrency(false); setShowAccounts(false) } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hiddenCount = accounts.length > 0 && visibleAccounts !== null ? accounts.length - visibleAccounts.length : 0

  const items = [
    { id: 'private',    Icon: privateMode ? IconEye : IconEyeOff, label: privateMode ? 'Pokaż salda' : 'Tryb prywatny', toggle: true },
    { id: 'search',     Icon: IconSearch,   label: 'Szukaj transakcji' },
    { id: 'transfer',   Icon: IconTransfer, label: 'Przelew między kontami' },
    { id: 'accounts',   Icon: IconBank,     label: hiddenCount > 0 ? `Konta w saldzie (${accounts.length - hiddenCount}/${accounts.length})` : 'Konta w saldzie' },
    { id: 'tithe',      Icon: IconPrayer,   label: 'Dziesięcina' },
    { id: 'goals',      Icon: IconStar,     label: 'Cele oszczędnościowe' },
    { id: 'reminders',  Icon: IconBell,     label: 'Przypomnienia' },
    { id: 'categories', Icon: IconTag,      label: 'Zarządzaj kategoriami' },
    { id: 'currency',   Icon: IconCurrency, label: `Waluta (${currentCurrency})` },
  ]

  const handle = (id) => {
    if (id === 'currency') { setShowCurrency(v => !v); setShowAccounts(false); return }
    if (id === 'accounts') { setShowAccounts(v => !v); setShowCurrency(false); return }
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
                <span className="bmi-icon"><IconCurrency size={16} /></span>
                <span className="bmi-label">Wybierz walutę</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={() => setShowCurrency(false)}><IconClose size={14} /></button>
              </div>
              {CURRENCIES.map(c => (
                <button key={c.code} className="budget-menu-item" onClick={() => selectCurrency(c.code)}>
                  <span className="bmi-icon" style={{ fontSize: 14, width: 22 }}>{c.symbol}</span>
                  <span className="bmi-label">{c.name}</span>
                  {c.code === currentCurrency && <IconCheck size={16} style={{ color: 'var(--primary)' }} />}
                </button>
              ))}
            </>
          ) : showAccounts ? (
            <>
              <div className="budget-menu-item" style={{ cursor: 'default', fontSize: 12, color: 'var(--text-muted)' }}>
                <span className="bmi-icon"><IconBank size={16} /></span>
                <span className="bmi-label">Konta w saldzie</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={() => setShowAccounts(false)}><IconClose size={14} /></button>
              </div>
              {accounts.map(a => {
                const active = visibleAccounts === null || visibleAccounts.includes(a.id)
                return (
                  <button key={a.id} className="budget-menu-item" onClick={() => onToggleAccount(a.id)}>
                    <span className="bmi-icon">
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: a.color, display: 'inline-block' }} />
                    </span>
                    <span className="bmi-label" style={{ opacity: active ? 1 : 0.45 }}>{a.name}</span>
                    {active && <IconCheck size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </>
          ) : (
            items.map(item => (
              <button key={item.id} className="budget-menu-item" onClick={() => handle(item.id)}>
                <span className="bmi-icon"><item.Icon size={16} /></span>
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
