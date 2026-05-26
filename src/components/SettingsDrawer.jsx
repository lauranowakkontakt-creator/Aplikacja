import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'

export default function SettingsDrawer({ open, onClose, activeModule, modules, onModuleChange, user }) {
  const handleLogout = () => { signOut(auth); onClose() }

  return (
    <>
      {open && <div className="drawer-overlay" onClick={onClose} />}
      <aside className={`drawer ${open ? 'open' : ''}`}>
        {/* Nagłówek drawera */}
        <div className="drawer-header">
          <div className="drawer-user">
            {user.photoURL && <img src={user.photoURL} alt="" className="drawer-avatar" />}
            <div>
              <div className="drawer-name">{user.displayName || 'Laura'}</div>
              <div className="drawer-email">{user.email || ''}</div>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        {/* Wszystkie aplikacje */}
        <div className="drawer-section">
          <p className="drawer-section-title">Aplikacje</p>
          <div className="drawer-apps-grid">
            {modules.map(m => (
              <button
                key={m.id}
                className={`drawer-app-btn ${activeModule?.id === m.id ? 'active' : ''} ${m.soon ? 'soon' : ''}`}
                onClick={() => !m.soon && onModuleChange(m.id)}
              >
                <span className="drawer-app-icon">{m.icon}</span>
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

        {/* Dół drawera */}
        <div className="drawer-footer">
          <button className="drawer-logout" onClick={handleLogout}>Wyloguj się</button>
          <p className="drawer-version">Mój Świat v1.0</p>
        </div>
      </aside>
    </>
  )
}

function BudgetSettings() {
  return (
    <>
      <DrawerItem icon="📊" label="Waluta" value="PLN" />
      <DrawerItem icon="📅" label="Początek miesiąca" value="1. dzień" />
      <DrawerItem icon="📥" label="Importuj stare budżety" action />
      <DrawerItem icon="📤" label="Eksportuj dane (CSV)" action />
    </>
  )
}

function HabitsSettings() {
  return (
    <>
      <DrawerItem icon="🔔" label="Przypomnienia" value="wyłączone" />
      <DrawerItem icon="📆" label="Tydzień zaczyna się" value="w poniedziałek" />
    </>
  )
}

function DrawerItem({ icon, label, value, action }) {
  return (
    <div className={`drawer-item ${action ? 'clickable' : ''}`}>
      <span className="drawer-item-icon">{icon}</span>
      <span className="drawer-item-label">{label}</span>
      {value && <span className="drawer-item-value">{value}</span>}
      {action && <span className="drawer-item-arrow">›</span>}
    </div>
  )
}
