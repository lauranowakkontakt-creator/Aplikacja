import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'

export default function Header({ user, modules, activeModule, onModuleChange, onSettingsOpen }) {
  const handleLogout = () => signOut(auth)

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">Mój Świat</span>
      </div>

      {/* Ikony modułów — centrum headera */}
      <nav className="header-modules">
        {modules.filter(m => !m.hidden).map(m => (
          <button
            key={m.id}
            className={`module-btn ${activeModule === m.id ? 'active' : ''} ${m.soon ? 'soon' : ''}`}
            onClick={() => !m.soon && onModuleChange(m.id)}
            title={m.soon ? `${m.label} — wkrótce` : m.label}
          >
            <span className="module-icon">{m.icon}</span>
            <span className="module-label">{m.label}</span>
            {m.soon && <span className="soon-badge">wkrótce</span>}
          </button>
        ))}
      </nav>

      <div className="header-right">
        {user.photoURL && <img src={user.photoURL} alt="" className="avatar" />}
        <button className="settings-btn" onClick={onSettingsOpen} title="Ustawienia">⚙️</button>
        <button className="btn-logout" onClick={handleLogout}>Wyloguj</button>
      </div>
    </header>
  )
}
