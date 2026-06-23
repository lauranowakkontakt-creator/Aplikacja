import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import Login from './components/Login'
import Pulpit from './components/Pulpit'
import Dashboard from './components/Dashboard'
import HabitsDashboard from './components/habits/HabitsDashboard'
import MoodDashboard from './components/mood/MoodDashboard'
import TodoDashboard from './components/todo/TodoDashboard'
import CalendarDashboard from './components/calendar/CalendarDashboard'
import PrayerDashboard from './components/prayer/PrayerDashboard'
import BibleDashboard from './components/bible/BibleDashboard'
import PeopleHub from './components/people/PeopleHub'
import DreamDashboard from './components/dream/DreamDashboard'
import SettingsDrawer from './components/SettingsDrawer'
import MoreSheet from './components/MoreSheet'
import ErrorBoundary from './components/ErrorBoundary'
import { IconBudget, IconHabits, IconMood, IconTodo, IconCalendar, IconPrayer, IconBook, IconSettings, IconHome, IconMore, IconUsers, IconMoon } from './components/Icons'
import { getModuleIcons, resolveIcon } from './utils/iconPrefs'
import { getCurrencyCode, setCurrencyCode } from './utils/currency'

const DEV_USER = { uid: 'dev-user', displayName: 'Laura', photoURL: null, email: 'laura@mojswiat.app' }
const DEV_MODE = import.meta.env.DEV

const MODULE_ACCENTS = {
  home:     '#7C8AF0',
  budget:   '#E0673E',
  habits:   '#E0B15A',
  mood:     '#9B7CF0',
  todo:     '#5BB6D9',
  calendar: '#5FBF98',
  prayer:   '#C9A24A',
  bible:    '#4F74D9',
  people:   '#D98B5F',
  dream:    '#6366F1',
}

// Moduły widoczne na dolnym pasku (mobile). Reszta trafia do „Więcej".
const PRIMARY_NAV = ['home', 'budget', 'habits', 'calendar']

function buildModules() {
  const prefs = getModuleIcons()
  return [
    { id: 'home',     label: 'Pulpit',    Icon: IconHome },
    { id: 'budget',   label: 'Budżet',    Icon: resolveIcon(prefs.budget,   IconBudget) },
    { id: 'habits',   label: 'Nawyki',    Icon: resolveIcon(prefs.habits,   IconHabits) },
    { id: 'mood',     label: 'Nastrój',   Icon: resolveIcon(prefs.mood,     IconMood) },
    { id: 'todo',     label: 'To-do',     Icon: resolveIcon(prefs.todo,     IconTodo) },
    { id: 'calendar', label: 'Kalendarz', Icon: resolveIcon(prefs.calendar, IconCalendar) },
    { id: 'prayer',   label: 'Modlitwa',  Icon: resolveIcon(prefs.prayer,   IconPrayer) },
    { id: 'bible',    label: 'Biblia',    Icon: resolveIcon(prefs.bible,    IconBook) },
    { id: 'people',   label: 'Osoby',     Icon: resolveIcon(prefs.people,   IconUsers) },
    { id: 'dream',    label: 'Sen',       Icon: resolveIcon(prefs.dream,    IconMoon) },
  ]
}

export default function App() {
  const [user, setUser] = useState(DEV_MODE ? DEV_USER : null)
  const [loading, setLoading] = useState(!DEV_MODE)
  const [activeModule, setActiveModule] = useState('home')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [modules, setModules] = useState(() => buildModules())
  const [dreamFocus, setDreamFocus] = useState(null) // sen otwierany z innego modułu

  const openDream = (dreamId) => { setDreamFocus(dreamId); setActiveModule('dream'); setMoreOpen(false) }

  const handleModuleIconChange = () => setModules(buildModules())

  const [currencyCode, setCurrencyCodeState] = useState(getCurrencyCode)
  const handleCurrencyChange = useCallback((code) => {
    setCurrencyCode(code)
    setCurrencyCodeState(code)
  }, [])

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

  const accent = MODULE_ACCENTS[activeModule] || 'var(--primary)'
  const accentVars = {
    '--accent': accent,
    '--accent-soft': `color-mix(in oklab, ${accent} 15%, transparent)`,
  }

  const goTo = (id) => { setActiveModule(id); setMoreOpen(false); setDrawerOpen(false) }

  // Dolny pasek: moduły z PRIMARY_NAV + przycisk „Więcej"
  const navItems = PRIMARY_NAV.map(id => modules.find(m => m.id === id)).filter(Boolean)
  const slotCount = navItems.length + 1 // + „Więcej"
  const w = 100 / slotCount
  const inOverflow = !PRIMARY_NAV.includes(activeModule)
  const activeIdx = inOverflow ? navItems.length : navItems.findIndex(m => m.id === activeModule)

  return (
    <div className="app" style={accentVars}>

      {/* SIDEBAR — desktop only */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2l3 7h7l-5 5 2 7-7-4-7 4 2-7L2 9h7z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.01em', lineHeight: 1.1 }}>Mój Świat</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>
              {user?.displayName || 'laura'}
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {modules.filter(m => !m.hidden).map(m => {
            const modAccent = MODULE_ACCENTS[m.id] || 'var(--primary)'
            const isActive = activeModule === m.id
            return (
              <button
                key={m.id}
                className={`sidebar-nav-item${isActive ? ' active' : ''}`}
                style={isActive ? { '--accent': modAccent, '--accent-soft': `color-mix(in oklab, ${modAccent} 15%, transparent)` } : {}}
                onClick={() => { setActiveModule(m.id); setDrawerOpen(false) }}
              >
                <m.Icon size={18}/>
                <span style={{ flex: 1 }}>{m.label}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 99, background: 'var(--surface2)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', flexShrink: 0 }}>
            {user?.displayName?.[0]?.toUpperCase() || 'L'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.displayName || 'Laura'}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
          </div>
          <button className="icon-btn" style={{ width: 30, height: 30, flexShrink: 0 }} onClick={() => setDrawerOpen(true)}>
            <IconSettings size={14}/>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        {/* Topbar — desktop */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>
              {modules.find(m => m.id === activeModule)?.label || ''}
            </h1>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              · {user?.displayName || 'laura'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="icon-btn" onClick={() => setDrawerOpen(true)}><IconSettings size={15}/></button>
          </div>
        </div>

        {/* Mobile header */}
        <div className="mobile-header">
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
              {modules.find(m => m.id === activeModule)?.label || ''}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.02em', marginTop: 2 }}>Mój Świat</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="icon-btn"
              style={{ width: 34, height: 34, background: 'var(--accent-soft)', color: 'var(--accent)', border: 'none' }}
              onClick={() => setDrawerOpen(true)}
            >
              <IconSettings size={15}/>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="content" key={activeModule}>
          <div className="content-inner">
            <ErrorBoundary moduleId={activeModule}>
            {activeModule === 'home'     && <Pulpit user={user} onNavigate={goTo} />}
            {activeModule === 'budget'   && <Dashboard user={user} onCurrencyChange={handleCurrencyChange} />}
            {activeModule === 'habits'   && <HabitsDashboard user={user} onMoodClick={() => setActiveModule('mood')} />}
            {activeModule === 'mood'     && <MoodDashboard user={user} />}
            {activeModule === 'todo'     && <TodoDashboard user={user} />}
            {activeModule === 'calendar' && <CalendarDashboard user={user} />}
            {activeModule === 'prayer'   && <PrayerDashboard user={user} />}
            {activeModule === 'bible'    && <BibleDashboard user={user} />}
            {activeModule === 'people'   && <PeopleHub user={user} onOpenDream={openDream} />}
            {activeModule === 'dream'    && <DreamDashboard user={user} focusId={dreamFocus} onFocusConsumed={() => setDreamFocus(null)} />}
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="bottom-nav">
        <div className="bn-indicator" style={{ left: `calc(${(activeIdx + 0.5) * w}% - 12px)`, background: accent }}/>
        {navItems.map(m => {
          const isActive = activeModule === m.id
          const modAccent = MODULE_ACCENTS[m.id] || 'var(--primary)'
          return (
            <button
              key={m.id}
              className={`bottom-nav-item${isActive ? ' active' : ''}`}
              style={{ '--accent': modAccent }}
              onClick={() => goTo(m.id)}
            >
              <m.Icon size={21}/>
              <span>{m.label}</span>
            </button>
          )
        })}
        <button
          className={`bottom-nav-item${inOverflow || moreOpen ? ' active' : ''}`}
          style={{ '--accent': inOverflow ? accent : 'var(--primary)' }}
          onClick={() => setMoreOpen(o => !o)}
        >
          <IconMore size={21}/>
          <span>Więcej</span>
        </button>
      </nav>

      {/* Więcej — launcher wszystkich aplikacji */}
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        modules={modules}
        activeModule={activeModule}
        accents={MODULE_ACCENTS}
        onSelect={goTo}
        onSettings={() => { setMoreOpen(false); setDrawerOpen(true) }}
      />

      {/* Settings drawer */}
      <SettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeModule={modules.find(m => m.id === activeModule)}
        modules={modules}
        onModuleChange={(id) => { setActiveModule(id); setDrawerOpen(false) }}
        user={user}
        onIconChange={handleModuleIconChange}
        onCurrencyChange={handleCurrencyChange}
      />
    </div>
  )
}
