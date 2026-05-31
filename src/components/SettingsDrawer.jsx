import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { IconClose } from './Icons'

export default function SettingsDrawer({ open, onClose, activeModule, modules, onModuleChange, user }) {
  const handleLogout = () => { signOut(auth); onClose() }
  const displayName = user.displayName || 'Laura'
  const initials = displayName[0]?.toUpperCase() || 'L'

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

        {/* Wszystkie aplikacje */}
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

        {/* Ustawienia bieżącego modułu */}
        {activeModule && !activeModule.soon && (
          <div className="drawer-section">
            <p className="drawer-section-title">Ustawienia — {activeModule.label}</p>
            <div className="drawer-settings-list">
              {activeModule.id === 'budget' && <BudgetSettings />}
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

function BudgetSettings() {
  return (
    <>
      <DrawerItem label="Waluta" value="PLN" />
      <DrawerItem label="Początek miesiąca" value="1. dzień" />
      <DrawerItem label="Importuj stare budżety" action />
      <DrawerItem label="Eksportuj dane (CSV)" action />
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
