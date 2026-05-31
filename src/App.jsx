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
import { IconBudget, IconHabits, IconMood, IconTodo, IconCalendar, IconPrayer, IconSettings } from './components/Icons'

const DEV_USER = { uid: 'dev-user', displayName: 'Laura', photoURL: null }
const DEV_MODE = import.meta.env.DEV

export const MODULES = [
  { id: 'budget',   label: 'Budżet',    Icon: IconBudget },
  { id: 'habits',   label: 'Nawyki',    Icon: IconHabits },
  { id: 'mood',     label: 'Nastrój',   Icon: IconMood,     hidden: true },
  { id: 'todo',     label: 'To-do',     Icon: IconTodo },
  { id: 'calendar', label: 'Kalendarz', Icon: IconCalendar },
  { id: 'prayer',   label: 'Modlitwa',  Icon: IconPrayer },
]

export default function App() {
  const [user, setUser] = useState(DEV_MODE ? DEV_USER : null)
  const [loading, setLoading] = useState(!DEV_MODE)
  const [activeModule, setActiveModule] = useState('budget')
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (DEV_MODE) return
    const timeout = setTimeout(() => setLoading(false), 8000)
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      clearTimeout(timeout)
      setUser(u)
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
      {(() => {
        const navItems = [...MODULES.filter(m => !m.soon && !m.hidden), { id: '__settings', label: 'Więcej', Icon: IconSettings }]
        const activeId = drawerOpen ? '__settings' : activeModule
        const activeIdx = navItems.findIndex(m => m.id === activeId)
        const pct = navItems.length > 0 ? (activeIdx + 0.5) * (100 / navItems.length) : 0
        return (
          <nav className="bottom-nav">
            <div className="bottom-nav-indicator" style={{ left: `calc(${pct}% - 15px)` }} />
            {navItems.map(m => {
              const isActive = activeId === m.id
              return (
                <button
                  key={m.id}
                  className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (m.id === '__settings') setDrawerOpen(true)
                    else { setActiveModule(m.id); setDrawerOpen(false) }
                  }}
                >
                  <m.Icon size={22} />
                  <span>{m.label}</span>
                </button>
              )
            })}
          </nav>
        )
      })()}

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
