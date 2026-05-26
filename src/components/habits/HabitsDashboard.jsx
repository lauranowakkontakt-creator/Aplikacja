import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, startOfWeek, addDays, subDays, subWeeks, addWeeks, startOfMonth, getDaysInMonth, getDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import HabitForm, { HABIT_CATEGORIES } from './HabitForm'
import PauseForm from './PauseForm'

function isPausedDay(dateStr, pauses) {
  return pauses.some(p => dateStr >= p.from && dateStr <= p.to)
}

function isHabitDue(habit, dateStr, pauses = []) {
  if (habit.startDate && dateStr < habit.startDate) return 'before-start'
  if (habit.endDate && dateStr > habit.endDate) return 'after-end'
  if (isPausedDay(dateStr, pauses)) return 'paused'
  const days = habit.frequencyDays || [0,1,2,3,4,5,6]
  return days.includes(new Date(dateStr + 'T12:00:00').getDay()) ? 'due' : 'off'
}

function getPauseIcon(pauses, dateStr) {
  const p = pauses.find(p => dateStr >= p.from && dateStr <= p.to)
  return p?.reasonIcon || '⏸️'
}

function getStreak(completedDates, frequencyDays = [0,1,2,3,4,5,6], pauses = [], startDate = null) {
  if (!completedDates?.length) return 0
  const today = format(new Date(), 'yyyy-MM-dd')
  let streak = 0
  let check = new Date()
  for (let i = 0; i < 730; i++) {
    const dateStr = format(check, 'yyyy-MM-dd')
    if (startDate && dateStr < startDate) break
    if (isPausedDay(dateStr, pauses)) { check = subDays(check, 1); continue }
    const dow = check.getDay()
    if (!frequencyDays.includes(dow)) { check = subDays(check, 1); continue }
    if (completedDates.includes(dateStr)) { streak++; check = subDays(check, 1) }
    else if (dateStr === today) { check = subDays(check, 1) }
    else break
  }
  return streak
}

function getBestStreak(completedDates, frequencyDays = [0,1,2,3,4,5,6], pauses = []) {
  if (!completedDates?.length) return 0
  const sorted = [...completedDates].sort()
    .filter(d => !isPausedDay(d, pauses) && frequencyDays.includes(new Date(d + 'T12:00:00').getDay()))
  if (!sorted.length) return 0
  let best = 1, current = 1
  for (let i = 1; i < sorted.length; i++) {
    let next = new Date(sorted[i-1] + 'T12:00:00')
    next = addDays(next, 1)
    while (!frequencyDays.includes(next.getDay()) || isPausedDay(format(next, 'yyyy-MM-dd'), pauses))
      next = addDays(next, 1)
    if (format(next, 'yyyy-MM-dd') === sorted[i]) { current++; if (current > best) best = current }
    else current = 1
  }
  return best
}

function getWeeklyStats(habits, pauses, weeksBack = 4) {
  return Array.from({ length: weeksBack }, (_, i) => {
    const ws = startOfWeek(subWeeks(new Date(), weeksBack - 1 - i), { weekStartsOn: 1 })
    const days = Array.from({ length: 7 }, (_, j) => format(addDays(ws, j), 'yyyy-MM-dd'))
    let exp = 0, done = 0
    habits.forEach(h => days.forEach(d => {
      const status = isHabitDue(h, d, pauses)
      if (status === 'due') { exp++; if (h.completedDates?.includes(d)) done++ }
    }))
    return { week: format(ws, 'd.MM', { locale: pl }), pct: exp > 0 ? Math.round((done / exp) * 100) : 0 }
  })
}

export default function HabitsDashboard({ user }) {
  const [habits, setHabits]         = useState([])
  const [pauses, setPauses]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [showPause, setShowPause]   = useState(false)
  const [editHabit, setEditHabit]   = useState(null)
  const [view, setView]             = useState('today')
  const [compact, setCompact]       = useState(false)
  const [filterCat, setFilterCat]   = useState('all')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showArchived, setShowArchived] = useState(false)

  const TODAY = format(new Date(), 'yyyy-MM-dd')

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE', { locale: pl }), dayNum: format(d, 'd') }
  })

  const monthDays = (() => {
    const start = startOfMonth(currentDate)
    return Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
      const d = addDays(start, i)
      return { date: format(d, 'yyyy-MM-dd'), dayNum: format(d, 'd') }
    })
  })()

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'habits'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => { setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) })
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'habitPauses'), orderBy('from', 'desc'))
    return onSnapshot(q, snap => setPauses(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const toggleDay = async (habit, date) => {
    const ref = doc(db, 'users', user.uid, 'habits', habit.id)
    const done = habit.completedDates?.includes(date)
    await updateDoc(ref, { completedDates: done ? arrayRemove(date) : arrayUnion(date) })
  }

  const activeHabits   = habits.filter(h => !h.archived)
  const archivedHabits = habits.filter(h => h.archived)
  const filtered = activeHabits.filter(h => filterCat === 'all' || h.category === filterCat)

  const todayDue  = filtered.filter(h => isHabitDue(h, TODAY, pauses) === 'due')
  const doneToday = todayDue.filter(h => h.completedDates?.includes(TODAY)).length

  const weekPct = (() => {
    let exp = 0, done = 0
    filtered.forEach(h => weekDays.forEach(d => {
      if (isHabitDue(h, d.date, pauses) === 'due') { exp++; if (h.completedDates?.includes(d.date)) done++ }
    }))
    return exp > 0 ? Math.round((done / exp) * 100) : 0
  })()

  const weeklyStats = getWeeklyStats(filtered, pauses)
  const todayIsPaused = isPausedDay(TODAY, pauses)

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div className="habits-dashboard">
      {/* Header */}
      <div className="habits-header">
        <div>
          <h2 className="habits-title">Nawyki</h2>
          <p className="habits-subtitle">
            {todayIsPaused
              ? `⏸️ Dzisiaj pauza`
              : activeHabits.length === 0
                ? 'Dodaj swój pierwszy nawyk'
                : `Dziś: ${doneToday}/${todayDue.length} · Tydzień: ${weekPct}%`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className={`habit-compact-btn ${todayIsPaused ? 'paused' : ''}`} onClick={() => setShowPause(true)} title="Pauza (wakacje/choroba)">⏸️</button>
          <button className={`habit-compact-btn ${compact ? 'active' : ''}`} onClick={() => setCompact(v => !v)} title="Tryb kompaktowy">⊟</button>
          <button className="btn-add-habit" onClick={() => { setEditHabit(null); setShowForm(true) }}>+ Nowy</button>
        </div>
      </div>

      {/* View tabs */}
      <div className="habit-view-tabs">
        {[['today','Dziś'],['week','Tydzień'],['month','Miesiąc'],['stats','Statystyki']].map(([id, label]) => (
          <button key={id} className={`habit-view-tab ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>{label}</button>
        ))}
      </div>

      {/* Progress bar */}
      {(view === 'week' || view === 'today') && todayDue.length > 0 && !todayIsPaused && (
        <div className="progress-bar-wrap">
          <div className="progress-bar" style={{ width: `${(doneToday / todayDue.length) * 100}%` }} />
        </div>
      )}

      {/* Category filter */}
      {activeHabits.length > 0 && (
        <div className="habit-cat-filter">
          <button className={`habit-cat-chip ${filterCat === 'all' ? 'active' : ''}`} onClick={() => setFilterCat('all')}>Wszystkie</button>
          {HABIT_CATEGORIES.filter(c => activeHabits.some(h => h.category === c.id)).map(c => (
            <button key={c.id} className={`habit-cat-chip ${filterCat === c.id ? 'active' : ''}`} onClick={() => setFilterCat(c.id)}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      )}

      {/* ===== DZIŚ (karty) ===== */}
      {view === 'today' && (() => {
        const dayStrip = Array.from({ length: 7 }, (_, i) => {
          const d = subDays(new Date(), 6 - i)
          return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE', { locale: pl }), dayNum: format(d, 'd') }
        })
        const selDue = filtered.filter(h => {
          const s = isHabitDue(h, selectedDay, pauses)
          return s !== 'before-start' && s !== 'after-end'
        })
        return (
          <>
            {/* Pasek dni */}
            <div className="day-strip">
              {dayStrip.map(d => (
                <button key={d.date}
                  className={`day-strip-item ${d.date === selectedDay ? 'active' : ''}`}
                  onClick={() => setSelectedDay(d.date)}
                >
                  <span className="day-strip-lbl">{d.label}</span>
                  <span className="day-strip-num">{d.dayNum}</span>
                </button>
              ))}
            </div>

            {/* Category filter */}
            {activeHabits.length > 0 && (
              <div className="habit-cat-filter">
                <button className={`habit-cat-chip ${filterCat === 'all' ? 'active' : ''}`} onClick={() => setFilterCat('all')}>Wszystkie</button>
                {HABIT_CATEGORIES.filter(c => activeHabits.some(h => h.category === c.id)).map(c => (
                  <button key={c.id} className={`habit-cat-chip ${filterCat === c.id ? 'active' : ''}`} onClick={() => setFilterCat(c.id)}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            )}

            {selDue.length === 0 ? (
              <div className="list-empty"><p>Brak nawyków</p><p className="list-empty-hint">Kliknij "+ Nowy" aby dodać</p></div>
            ) : (
              <div className="habit-cards">
                {selDue.map(habit => {
                  const status = isHabitDue(habit, selectedDay, pauses)
                  const done   = habit.completedDates?.includes(selectedDay)
                  const streak = getStreak(habit.completedDates, habit.frequencyDays, pauses, habit.startDate)
                  const isFut  = selectedDay > TODAY
                  return (
                    <div key={habit.id}
                      className={`habit-card ${done ? 'done' : ''} ${status === 'paused' ? 'paused' : ''}`}
                      style={done ? { background: (habit.color || 'var(--primary)') + '18', borderColor: (habit.color || 'var(--primary)') + '50' } : {}}
                    >
                      <div className="habit-card-icon" style={{ background: (habit.color || '#C94B28') + '30' }}
                        onClick={() => { setEditHabit(habit); setShowForm(true) }}>
                        <span>{habit.emoji}</span>
                      </div>
                      <div className="habit-card-body" onClick={() => { setEditHabit(habit); setShowForm(true) }}>
                        <span className="habit-card-name">{habit.name}</span>
                        {streak > 0 && <span className="habit-card-streak">🔥 {streak} dni</span>}
                      </div>
                      <button
                        className={`habit-card-btn ${done ? 'done' : ''} ${status === 'paused' ? 'paused' : ''}`}
                        style={done ? { background: habit.color || 'var(--primary)', borderColor: habit.color || 'var(--primary)' } : {}}
                        onClick={() => !isFut && status === 'due' && toggleDay(habit, selectedDay)}
                        disabled={isFut || status !== 'due'}
                      >
                        {done ? '✓' : status === 'paused' ? getPauseIcon(pauses, selectedDay) : ''}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      })()}

      {/* ===== TYDZIEŃ ===== */}
      {view === 'week' && (
        <>
          <div className="habit-week-nav">
            <button className="month-btn" onClick={() => setCurrentDate(d => subWeeks(d, 1))}>‹</button>
            <span className="habit-period-label">
              {format(weekStart, 'd MMM', { locale: pl })} – {format(addDays(weekStart, 6), 'd MMM', { locale: pl })}
            </span>
            <button className="month-btn" onClick={() => setCurrentDate(d => addWeeks(d, 1))}>›</button>
          </div>

          {filtered.length === 0 ? (
            <div className="list-empty"><p>Brak nawyków</p><p className="list-empty-hint">Kliknij "+ Nowy" aby dodać</p></div>
          ) : (
            <div className={`habits-list ${compact ? 'compact' : ''}`}>
              <div className="week-header">
                <div className="habit-name-col" />
                {weekDays.map(d => (
                  <div key={d.date} className={`week-day-col ${d.date === TODAY ? 'today' : ''}`}>
                    <span className="week-day-name">{d.label}</span>
                    <span className="week-day-num">{d.dayNum}</span>
                  </div>
                ))}
              </div>
              {filtered.map(habit => {
                const streak = getStreak(habit.completedDates, habit.frequencyDays, pauses, habit.startDate)
                const best   = getBestStreak(habit.completedDates, habit.frequencyDays, pauses)
                return (
                  <div key={habit.id} className="habit-row">
                    <div className="habit-name-col" onClick={() => { setEditHabit(habit); setShowForm(true) }}>
                      <span className="habit-emoji">{habit.emoji}</span>
                      <div className="habit-info">
                        <span className="habit-name">{habit.name}</span>
                        {!compact && streak > 0 && <span className="habit-streak">🔥 {streak}</span>}
                        {!compact && best > streak && best > 1 && <span className="habit-streak best">⭐ {best}</span>}
                      </div>
                    </div>
                    {weekDays.map(d => {
                      const status = isHabitDue(habit, d.date, pauses)
                      const done   = habit.completedDates?.includes(d.date)
                      const isFut  = d.date > TODAY
                      const pauseIcon = status === 'paused' ? getPauseIcon(pauses, d.date) : null
                      return (
                        <button key={d.date}
                          className={`habit-check ${done ? 'done' : ''} ${isFut ? 'future' : ''} ${d.date === TODAY ? 'today' : ''} ${status !== 'due' && !done ? 'not-due' : ''} ${status === 'paused' ? 'paused' : ''}`}
                          style={done && habit.color ? { background: habit.color, borderColor: habit.color } : {}}
                          onClick={() => !isFut && status === 'due' && toggleDay(habit, d.date)}
                          disabled={isFut || status !== 'due'}
                        >
                          {done ? '✓' : pauseIcon || (status === 'off' ? '–' : status === 'after-end' ? '✕' : '')}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ===== MIESIĄC ===== */}
      {view === 'month' && (
        <>
          <div className="habit-week-nav">
            <button className="month-btn" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
            <span className="habit-period-label">{format(currentDate, 'LLLL yyyy', { locale: pl })}</span>
            <button className="month-btn" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
          </div>
          {filtered.length === 0 ? (
            <div className="list-empty"><p>Brak nawyków</p></div>
          ) : (
            <div className="habits-month-view">
              {filtered.map(habit => (
                <div key={habit.id} className="habit-month-row">
                  <div className="habit-month-name" onClick={() => { setEditHabit(habit); setShowForm(true) }}>
                    <span>{habit.emoji}</span><span>{habit.name}</span>
                  </div>
                  <div className="habit-month-dots">
                    {monthDays.map(d => {
                      const status = isHabitDue(habit, d.date, pauses)
                      const done   = habit.completedDates?.includes(d.date)
                      const isFut  = d.date > TODAY
                      const pauseIcon = status === 'paused' ? getPauseIcon(pauses, d.date) : null
                      return (
                        <button key={d.date}
                          className={`habit-dot ${done ? 'done' : ''} ${status === 'paused' ? 'paused' : ''} ${status !== 'due' && !done ? 'not-due' : ''} ${d.date === TODAY ? 'today' : ''}`}
                          style={done && habit.color ? { background: habit.color } : {}}
                          onClick={() => !isFut && status === 'due' && toggleDay(habit, d.date)}
                          disabled={isFut || status !== 'due'}
                          title={d.date}
                        >
                          {pauseIcon
                            ? <span style={{ fontSize: 8 }}>{pauseIcon}</span>
                            : <span className="habit-dot-num">{d.dayNum}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== STATYSTYKI ===== */}
      {view === 'stats' && (
        <div className="habit-stats-view">
          {filtered.length === 0 ? (
            <div className="list-empty"><p>Brak nawyków</p></div>
          ) : (
            <>
              {/* Wykres */}
              <div className="habit-chart-wrap">
                <p className="habit-chart-title">Wykonanie % — ostatnie 4 tygodnie</p>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={weeklyStats} barSize={40}>
                    <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0,100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={34} />
                    <Tooltip formatter={v => [`${v}%`, 'Wykonanie']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="pct" radius={[6,6,0,0]}>
                      {weeklyStats.map((entry, i) => (
                        <Cell key={i} fill={i === weeklyStats.length - 1 ? 'var(--primary)' : 'var(--surface2)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Karty nawyków */}
              <div className="habit-stats-list">
                {filtered.map(habit => {
                  const streak = getStreak(habit.completedDates, habit.frequencyDays, pauses, habit.startDate)
                  const best   = getBestStreak(habit.completedDates, habit.frequencyDays, pauses)
                  const total  = habit.completedDates?.length || 0
                  const cat    = HABIT_CATEGORIES.find(c => c.id === habit.category)
                  const last30 = (() => {
                    let exp = 0, done = 0
                    for (let i = 0; i < 30; i++) {
                      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
                      const status = isHabitDue(habit, d, pauses)
                      if (status === 'due') { exp++; if (habit.completedDates?.includes(d)) done++ }
                    }
                    return exp > 0 ? Math.round((done / exp) * 100) : 0
                  })()
                  return (
                    <div key={habit.id} className="habit-stat-card" onClick={() => { setEditHabit(habit); setShowForm(true) }}>
                      <div className="habit-stat-card-top">
                        <div className="habit-stat-card-info">
                          <span style={{ fontSize: 28 }}>{habit.emoji}</span>
                          <div>
                            <p className="habit-name" style={{ fontSize: 15 }}>{habit.name}</p>
                            {cat && <p className="habit-cat-badge">{cat.icon} {cat.label}</p>}
                          </div>
                        </div>
                        <div className="habit-stat-big">
                          <span className="habit-stat-big-num" style={{ color: habit.color || 'var(--primary)' }}>{last30}%</span>
                          <span className="habit-stat-big-label">ostatnie 30 dni</span>
                        </div>
                      </div>
                      <div className="habit-stat-row-nums">
                        <div className="habit-stat-pill"><span>🔥</span><strong>{streak}</strong><span>seria</span></div>
                        <div className="habit-stat-pill"><span>⭐</span><strong>{best}</strong><span>rekord</span></div>
                        <div className="habit-stat-pill"><span>✓</span><strong>{total}</strong><span>łącznie</span></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Archiwum */}
      {archivedHabits.length > 0 && (
        <button className="btn-show-archived" onClick={() => setShowArchived(v => !v)}>
          📦 Archiwum ({archivedHabits.length}) {showArchived ? '▲' : '▼'}
        </button>
      )}
      {showArchived && (
        <div className="habits-list">
          {archivedHabits.map(h => (
            <div key={h.id} className="habit-row archived-row" onClick={() => { setEditHabit(h); setShowForm(true) }}>
              <div className="habit-name-col">
                <span className="habit-emoji" style={{ opacity: .4 }}>{h.emoji}</span>
                <span className="habit-name" style={{ opacity: .4 }}>{h.name}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', gridColumn: '2 / -1', textAlign: 'right' }}>zarchiwizowany</span>
            </div>
          ))}
        </div>
      )}

      {showPause && <PauseForm user={user} onClose={() => setShowPause(false)} />}
      {showForm && (
        <HabitForm user={user} onClose={() => { setShowForm(false); setEditHabit(null) }} editData={editHabit} />
      )}
    </div>
  )
}
