import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import Login from './components/Login'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import HabitsDashboard from './components/habits/HabitsDashboard'
import MoodDashboard from './components/mood/MoodDashboard'
import TodoDashboard from './components/todo/TodoDashboard'
import CalendarDashboard from './components/calendar/CalendarDashboard'
import PrayerDashboard from './components/prayer/PrayerDashboard'
import SettingsDrawer from './components/SettingsDrawer'

const DEV_USER = { uid: 'dev-user', displayName: 'Laura', photoURL: null }
const DEV_MODE = import.meta.env.DEV

export const MODULES = [
  { id: 'budget',  label: 'Budżet',   icon: '💰' },
  { id: 'habits',  label: 'Nawyki',   icon: '✅' },
  { id: 'mood',    label: 'Nastrój',  icon: '💭', hidden: true },
  { id: 'todo',    label: 'To-do',    icon: '📋' },
  { id: 'calendar',label: 'Kalendarz',icon: '📅' },
  { id: 'prayer',  label: 'Modlitwa', icon: '🙏' },
]

export default function App() {
  const [user, setUser] = useState(DEV_MODE ? DEV_USER : null)
  const [loading, setLoading] = useState(!DEV_MODE)
  const [activeModule, setActiveModule] = useState('budget')
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (DEV_MODE) return
    const timeout = setTimeout(() => setLoading(false), 5000)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout)
      setUser(user)
      setLoading(false)
    }, () => { clearTimeout(timeout); setLoading(false) })
    return () => { unsubscribe(); clearTimeout(timeout) }
  }, [])

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )

  if (!user) return <Login />

  const currentModule = MODULES.find(m => m.id === activeModule)

  return (
    <div className="app">
      <Header
        user={user}
        modules={MODULES}
        activeModule={activeModule}
        onModuleChange={(id) => { setActiveModule(id); setDrawerOpen(false) }}
        onSettingsOpen={() => setDrawerOpen(true)}
      />
      <main className="main-content">
        {activeModule === 'budget'  && <Dashboard user={user} />}
        {activeModule === 'habits'  && <HabitsDashboard user={user} onMoodClick={() => setActiveModule('mood')} />}
        {activeModule === 'mood'    && <MoodDashboard user={user} />}
        {activeModule === 'todo'    && <TodoDashboard user={user} />}
        {activeModule === 'calendar' && <CalendarDashboard user={user} />}
        {activeModule === 'prayer'   && <PrayerDashboard user={user} />}
      </main>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        {MODULES.filter(m => !m.soon && !m.hidden).map(m => (
          <button
            key={m.id}
            className={`bottom-nav-item ${activeModule === m.id ? 'active' : ''}`}
            onClick={() => setActiveModule(m.id)}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
        <button
          className={`bottom-nav-item ${drawerOpen ? 'active' : ''}`}
          onClick={() => setDrawerOpen(true)}
        >
          <span>⚙️</span>
          <span>Więcej</span>
        </button>
      </nav>

      {/* Settings drawer */}
      <SettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeModule={currentModule}
        modules={MODULES}
        onModuleChange={(id) => { setActiveModule(id); setDrawerOpen(false) }}
        user={user}
      />
    </div>
  )
}
