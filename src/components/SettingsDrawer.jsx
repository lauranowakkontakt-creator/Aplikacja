import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { IconClose, ICON_CATALOG } from './Icons'
import { saveModuleIcon } from '../utils/iconPrefs'
import { CURRENCIES, getCurrencyCode, setCurrencyCode } from '../utils/currency'

export default function SettingsDrawer({ open, onClose, activeModule, modules, onModuleChange, onIconChange, onCurrencyChange, user }) {
  const handleLogout = () => { signOut(auth); onClose() }
  const displayName = user.displayName || 'Laura'
  const initials = displayName[0]?.toUpperCase() || 'L'
  const [pickerModule, setPickerModule] = useState(null)

  return (
    <>
      {open && <div className="drawer-overlay" onClick={onClose} />}
      <aside className={`drawer ${open ? 'open' : ''}`}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-user">
            {user.photoURL
              ? <img src={user.photoURL} alt="" className="drawer-avatar" />
              : <div className="drawer-avatar-placeholder">{initials}</div>
            }
            <div>
              <div className="drawer-name">{displayName}</div>
              <div className="drawer-email">{user.email || ''}</div>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}>
            <IconClose size={16} />
          </button>
        </div>

        {/* Moduły */}
        <div className="drawer-section">
          <p className="drawer-section-title">Moduły</p>
          <div className="drawer-apps-grid">
            {modules.filter(m => !m.hidden).map(m => (
              <button
                key={m.id}
                className={`drawer-app-btn ${activeModule?.id === m.id ? 'active' : ''} ${m.soon ? 'soon' : ''}`}
                onClick={() => !m.soon && onModuleChange(m.id)}
              >
                <span className="drawer-app-icon"><m.Icon size={22} /></span>
                <span className="drawer-app-label">{m.label}</span>
                {m.soon && <span className="drawer-soon">wkrótce</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Ikony aplikacji */}
        <div className="drawer-section">
          <p className="drawer-section-title">Ikony aplikacji</p>
          {pickerModule ? (
            <IconPickerPanel
              module={pickerModule}
              onPick={(key) => {
                saveModuleIcon(pickerModule.id, key)
                onIconChange?.()
                setPickerModule(null)
              }}
              onCancel={() => setPickerModule(null)}
            />
          ) : (
            <div className="drawer-icon-list">
              {modules.filter(m => !m.hidden && !m.soon).map(m => (
                <button key={m.id} className="drawer-icon-row" onClick={() => setPickerModule(m)}>
                  <span className="drawer-icon-preview"><m.Icon size={20} /></span>
                  <span className="drawer-icon-label">{m.label}</span>
                  <span className="drawer-icon-change">Zmień →</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ustawienia bieżącego modułu */}
        {activeModule && !activeModule.soon && (
          <div className="drawer-section">
            <p className="drawer-section-title">Ustawienia — {activeModule.label}</p>
            <div className="drawer-settings-list">
              {activeModule.id === 'budget' && <BudgetSettings onCurrencyChange={onCurrencyChange} />}
              {activeModule.id === 'habits' && <HabitsSettings />}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="drawer-footer">
          <button className="drawer-logout" onClick={handleLogout}>Wyloguj się</button>
          <p className="drawer-version">Mój Świat · v1.0</p>
        </div>
      </aside>
    </>
  )
}

function IconPickerPanel({ module, onPick, onCancel }) {
  const groups = [...new Set(ICON_CATALOG.map(ic => ic.group))]
  const [activeGroup, setActiveGroup] = useState(groups[0])
  const icons = ICON_CATALOG.filter(ic => ic.group === activeGroup)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>← Wróć</button>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Ikona: {module.label}</span>
      </div>
      {/* Group tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {groups.map(g => (
          <button key={g} onClick={() => setActiveGroup(g)}
            style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 99, border: 'none', cursor: 'pointer',
              background: activeGroup === g ? 'var(--accent)' : 'var(--surface2)',
              color: activeGroup === g ? '#fff' : 'var(--text-muted)'
            }}>
            {g.split(' ')[0]}
          </button>
        ))}
      </div>
      {/* Icon grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
        {icons.map(ic => (
          <button key={ic.key} title={ic.label} onClick={() => onPick(ic.key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px',
              borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)',
              cursor: 'pointer', color: 'var(--text)'
            }}>
            <ic.Component size={18} />
            <span style={{ fontSize: 8, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{ic.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function BudgetSettings({ onCurrencyChange }) {
  const [current, setCurrent] = useState(getCurrencyCode)

  const handleSelect = (code) => {
    setCurrent(code)
    setCurrencyCode(code)
    onCurrencyChange?.(code)
  }

  return (
    <>
      <div className="drawer-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <span className="drawer-item-label">Waluta wyświetlania</span>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {CURRENCIES.map(c => (
            <button key={c.code} onClick={() => handleSelect(c.code)} style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              background: current === c.code ? 'var(--accent)' : 'var(--surface2)',
              color: current === c.code ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${current === c.code ? 'var(--accent)' : 'var(--border)'}`,
              fontWeight: current === c.code ? 700 : 400,
              transition: 'all .15s',
            }}>
              {c.code} <span style={{ opacity: 0.7 }}>{c.symbol}</span>
            </button>
          ))}
        </div>
      </div>
      <DrawerItem label="Początek miesiąca" value="1. dzień" />
    </>
  )
}

function HabitsSettings() {
  return (
    <>
      <DrawerItem label="Przypomnienia" value="wyłączone" />
      <DrawerItem label="Tydzień zaczyna się" value="w poniedziałek" />
    </>
  )
}

function DrawerItem({ label, value, action }) {
  return (
    <div className={`drawer-item ${action ? 'clickable' : ''}`}>
      <span className="drawer-item-label">{label}</span>
      {value && <span className="drawer-item-value">{value}</span>}
      {action && <span className="drawer-item-arrow">›</span>}
    </div>
  )
}
