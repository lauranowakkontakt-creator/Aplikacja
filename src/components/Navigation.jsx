const MODULES = [
  { id: 'budget', label: 'Budżet', icon: '💰' },
  { id: 'habits', label: 'Nawyki', icon: '✅' },
]

export default function Navigation({ active, onChange }) {
  return (
    <>
      {/* Sidebar na desktop */}
      <nav className="sidebar">
        <div className="sidebar-logo">Mój Świat</div>
        {MODULES.map(m => (
          <button
            key={m.id}
            className={`sidebar-item ${active === m.id ? 'active' : ''}`}
            onClick={() => onChange(m.id)}
          >
            <span className="nav-icon">{m.icon}</span>
            <span className="nav-label">{m.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom nav na mobile */}
      <nav className="bottom-nav">
        {MODULES.map(m => (
          <button
            key={m.id}
            className={`bottom-nav-item ${active === m.id ? 'active' : ''}`}
            onClick={() => onChange(m.id)}
          >
            <span className="nav-icon">{m.icon}</span>
            <span className="nav-label">{m.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
