import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../firebase/config'
import useFallbackTimeout from '../../utils/useFallbackTimeout'
import { format, startOfWeek, addDays, subDays, subWeeks, addWeeks, startOfMonth, getDaysInMonth, getDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import HabitForm, { HABIT_CATEGORIES, DEFAULT_HABIT_CATEGORIES } from './HabitForm'
import PauseForm from './PauseForm'
import { CatIcon, IconFlame, IconStar, IconCheck, IconPause, IconChevronDown, IconChevronRight } from '../Icons'
import { Ring, Heatmap, Spark } from '../ChartPrimitives'
import StatSummary from '../StatSummary'
import SegTabs from '../SegTabs'
import { isPausedDay, isHabitDue, getStreak, getBestStreak } from '../../utils/habitLogic'

function getPauseIcon(pauses, dateStr) {
  const p = pauses.find(p => dateStr >= p.from && dateStr <= p.to)
  return p?.reasonIcon || null
}

function buildHeatmapData(habits, weeks, pauses = []) {
  const total = weeks * 7
  const data = []
  for (let i = total - 1; i >= 0; i--) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    let count = 0, dueCount = 0
    habits.forEach(h => {
      if (isHabitDue(h, d, pauses) === 'due') {
        dueCount++
        if (h.completedDates?.includes(d)) count++
      }
    })
    const intensity = dueCount === 0 ? 0 : Math.min(4, Math.round((count / dueCount) * 4))
    data.push(intensity)
  }
  return data
}

function habitStatsSummary(habits, pauses) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const active = habits.filter(h => !h.archived)
  const build = (pref) => {
    let completions = 0
    const days = new Set()
    active.forEach(h => (h.completedDates || []).forEach(d => {
      if (d.startsWith(pref)) { completions++; if (d <= todayStr) days.add(d) }
    }))
    let perfect = 0
    days.forEach(d => {
      const due = active.filter(h => isHabitDue(h, d, pauses) === 'due')
      if (due.length && due.every(h => h.completedDates?.includes(d))) perfect++
    })
    const bestStreak = active.reduce((m, h) => Math.max(m, getStreak(h.completedDates, h.frequencyDays, pauses, h.startDate)), 0)
    return [
      { label: 'Wykonań', value: completions, color: 'var(--accent)' },
      { label: 'Dni 100%', value: perfect },
      { label: 'Aktywne', value: active.length },
      { label: 'Najlepsza seria', value: bestStreak, sub: 'dni' },
    ]
  }
  return { month: build(format(new Date(), 'yyyy-MM')), year: build(format(new Date(), 'yyyy')) }
}

export default function HabitsDashboard({ user, onMoodClick }) {
  const [habits, setHabits]         = useState([])
  const [pauses, setPauses]         = useState([])
  const [customCats, setCustomCats] = useState([])
  const [loading, setLoading]       = useState(true)
  useFallbackTimeout(() => setLoading(false))
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
    return onSnapshot(q, snap => { setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      err => { console.error('habits subscription error:', err); setLoading(false) })
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'habitPauses'), orderBy('from', 'desc'))
    return onSnapshot(q, snap => setPauses(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'habitCategories'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setCustomCats(snap.docs.map(d => ({ id: d.id, label: d.data().name, icon: d.data().icon || 'IcTag', color: d.data().color }))))
  }, [user.uid])

  const toggleDay = async (habit, date) => {
    const ref = doc(db, 'users', user.uid, 'habits', habit.id)
    const done = habit.completedDates?.includes(date)
    await updateDoc(ref, { completedDates: done ? arrayRemove(date) : arrayUnion(date) })
  }

  const allCategories  = [...DEFAULT_HABIT_CATEGORIES, ...customCats]
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

  const todayIsPaused = isPausedDay(TODAY, pauses)

  // Overall streak — max streak across all habits
  const maxStreak = filtered.length > 0
    ? Math.max(...filtered.map(h => getStreak(h.completedDates, h.frequencyDays, pauses, h.startDate)))
    : 0

  const heatmapData = buildHeatmapData(filtered, 18, pauses)

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const todayLabel = format(new Date(), 'EEEE, d LLL', { locale: pl })

  const kicker = (t) => (
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 2, background: 'var(--accent)', opacity: 0.6 }} />
      {t}
    </div>
  )

  return (
    <div className="habits-dashboard">
      {/* Mobile module header */}
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Nawyki</div>
          <div className="mod-header-title" style={{ textTransform: 'capitalize' }}>{todayLabel}</div>
        </div>
        <div className="mod-header-right">
          <button className="icon-btn" title="Pauza" onClick={() => setShowPause(true)}><IconPause size={16}/></button>
          <button className="icon-btn" onClick={() => { setEditHabit(null); setShowForm(true) }} title="Nowy nawyk"
            style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            +
          </button>
        </div>
      </div>

      {/* Hero row */}
      <div className="g2-br" style={{ gap: 10, marginBottom: 14 }}>
        {/* Left: Ring progress */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Ring
            value={todayDue.length > 0 ? Math.round((doneToday / todayDue.length) * 100) : 0}
            size={90} thickness={8} color="var(--warn)" label="dziś"
          />
          <div style={{ minWidth: 0 }}>
            {kicker('Postęp dnia')}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '2px 0 8px', whiteSpace: 'nowrap' }}>
              <span className="serif" style={{ fontSize: 40 }}>{doneToday}</span>
              <span className="mono" style={{ fontSize: 17, color: 'var(--text-muted)' }}>/ {todayDue.length}</span>
            </div>
            {maxStreak > 0 && (
              <div style={{ color: 'var(--warn)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <IconFlame size={14}/> <span className="mono" style={{ fontSize: 12.5 }}>{maxStreak} dni serii</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Heatmap */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18 }}>
          {kicker('Mapa konsekwencji')}
          <Heatmap weeks={18} accentHex="#E0B15A" data={heatmapData} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>mniej</span>
            {[0,1,2,3,4].map(v => (
              <div key={v} style={{ width: 9, height: 9, borderRadius: 2, background: v === 0 ? 'var(--surface2)' : v >= 4 ? 'var(--warn)' : `color-mix(in oklab, var(--warn) ${v * 25}%, var(--surface2))` }} />
            ))}
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>więcej</span>
          </div>
        </div>
      </div>

      {/* View tabs */}
      <SegTabs
        items={[{ id: 'today', label: 'Dziś' }, { id: 'week', label: 'Tydzień' }, { id: 'stats', label: 'Statystyki' }]}
        active={view} onChange={setView}
        style={{ maxWidth: 420, marginBottom: 14 }}
      />

      {/* ===== DZIŚ ===== */}
      {view === 'today' && (() => {
        const items = filtered
          .map(h => ({ h, status: isHabitDue(h, selectedDay, pauses) }))
          .filter(x => x.status !== 'before-start' && x.status !== 'after-end')
        const mandatory = items.filter(x => x.status === 'due')
        const extra     = items.filter(x => x.status === 'off' || x.status === 'paused')
        const selDateObj  = new Date(selectedDay + 'T12:00:00')
        const isToday     = selectedDay === TODAY
        const isFut       = selectedDay > TODAY
        const dayPaused   = isPausedDay(selectedDay, pauses)
        const dayLabel    = format(selDateObj, 'EEEE, d MMMM', { locale: pl })
        const goBack  = () => setSelectedDay(format(subDays(selDateObj, 1), 'yyyy-MM-dd'))
        const goFwd   = () => setSelectedDay(format(addDays(selDateObj, 1), 'yyyy-MM-dd'))

        const renderCard = ({ h: habit, status }) => {
          const done    = habit.completedDates?.includes(selectedDay)
          const streak  = getStreak(habit.completedDates, habit.frequencyDays, pauses, habit.startDate)
          const isExtra = status !== 'due'
          const cat     = allCategories.find(c => c.id === habit.category)
          const color   = habit.color || 'var(--accent)'
          return (
            <div key={habit.id} className="card hover" style={{
              background: done ? `color-mix(in oklab, ${color} 10%, var(--surface))` : 'var(--surface)',
              border: `1px solid ${done ? color + '50' : 'var(--border)'}`,
              padding: 16, display: 'flex', alignItems: 'center', gap: 14,
              opacity: isExtra && !done ? 0.66 : 1,
            }}>
              {/* Icon tile */}
              <div onClick={() => { setEditHabit(habit); setShowForm(true) }} style={{
                width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                display: 'grid', placeItems: 'center', cursor: 'pointer',
                background: color + '1c', border: `1px solid ${color + '40'}`, color,
              }}>
                <CatIcon categoryId={null} emoji={habit.emoji} size={20} />
              </div>

              {/* Body */}
              <div onClick={() => { setEditHabit(habit); setShowForm(true) }} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <div style={{
                  fontSize: 14.5, fontWeight: 600,
                  textDecoration: done ? 'line-through' : 'none',
                  textDecorationColor: 'var(--text-muted)',
                  color: done ? 'var(--text-muted)' : 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{habit.name}</div>
                <div className="row" style={{ gap: 7, marginTop: 5 }}>
                  {streak > 0 && <>
                    <IconFlame size={12} style={{ color: 'var(--warn)' }} />
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--warn)' }}>{streak} dni</span>
                  </>}
                  <span className="mono" style={{ fontSize: 9.5, color: isExtra && done ? color : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {streak > 0 && '· '}{isExtra ? (done ? '+1 do serii' : 'dodatkowy') : (cat?.label || '')}
                  </span>
                </div>
              </div>

              {/* Check — odhaczysz też dodatkowe (dni poza harmonogramem / w pauzie) */}
              <button
                onClick={() => !isFut && toggleDay(habit, selectedDay)}
                disabled={isFut}
                style={{
                  width: 38, height: 38, borderRadius: 99, flexShrink: 0,
                  border: `2px solid ${done ? color : 'var(--border-strong)'}`,
                  background: done ? color : 'transparent',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--bg)', cursor: isFut ? 'default' : 'pointer',
                  transition: 'all .2s var(--spring)',
                }}
              >
                {done ? <IconCheck size={17} /> : status === 'paused' && getPauseIcon(pauses, selectedDay) ? <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{getPauseIcon(pauses, selectedDay)}</span> : ''}
              </button>
            </div>
          )
        }

        const grid = (rows) => (
          <div data-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
            {rows.map(renderCard)}
          </div>
        )

        return (
          <>
            {/* Single day navigator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 14 }}>
              <button className="month-btn" onClick={goBack} style={{ width: 32, height: 32 }}>‹</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>{dayLabel}</div>
                {isToday && <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 2 }}>Dziś</div>}
              </div>
              <button className="month-btn" onClick={goFwd} style={{ width: 32, height: 32, opacity: isToday ? 0.3 : 1 }} disabled={isToday}>›</button>
            </div>

            {/* Category filter */}
            {activeHabits.length > 0 && (
              <div className="habit-cat-filter" style={{ marginBottom: 12 }}>
                <button className={`habit-cat-chip ${filterCat === 'all' ? 'active' : ''}`} onClick={() => setFilterCat('all')}>Wszystkie</button>
                {allCategories.filter(c => activeHabits.some(h => h.category === c.id)).map(c => (
                  <button key={c.id} className={`habit-cat-chip ${filterCat === c.id ? 'active' : ''}`}
                    style={filterCat === c.id ? { borderColor: c.color, color: c.color, background: c.color + '22' } : {}}
                    onClick={() => setFilterCat(c.id)}>
                    <CatIcon categoryId={c.id} emoji={c.icon} size={13} /> {c.label}
                  </button>
                ))}
              </div>
            )}

            {items.length === 0 ? (
              <div className="list-empty"><p>Brak nawyków</p><p className="list-empty-hint">Kliknij "+ Nowy" aby dodać</p></div>
            ) : (
              <>
                {/* Obowiązkowe na dziś */}
                {mandatory.length > 0 && (
                  <div style={{ marginBottom: extra.length > 0 ? 18 : 0 }}>
                    {kicker('Na dziś')}
                    {grid(mandatory)}
                  </div>
                )}

                {/* Nic obowiązkowego — komunikat */}
                {mandatory.length === 0 && extra.length > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 14, fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {dayPaused ? <IconPause size={14} /> : <IconStar size={14} />}
                    <span>{dayPaused ? 'Przerwa — dziś nic nie jest obowiązkowe. Możesz zrobić coś ekstra, seria się nie przerwie.' : 'Dziś nic obowiązkowego. Możesz zrobić coś dodatkowego poniżej.'}</span>
                  </div>
                )}

                {/* Dodatkowe / nieobowiązkowe */}
                {extra.length > 0 && (
                  <div>
                    {kicker(dayPaused ? 'Dodatkowe (przerwa) — liczą się do serii' : 'Dodatkowe — nieobowiązkowe')}
                    {grid(extra)}
                  </div>
                )}
              </>
            )}
          </>
        )
      })()}

      {/* ===== TYDZIEŃ ===== */}
      {view === 'week' && (
        <>
          <div className="habit-week-nav" style={{ marginBottom: 12 }}>
            <button className="month-btn" onClick={() => setCurrentDate(d => subWeeks(d, 1))}>‹</button>
            <span className="habit-period-label">
              {format(weekStart, 'd MMM', { locale: pl })} – {format(addDays(weekStart, 6), 'd MMM', { locale: pl })}
            </span>
            <button className="month-btn" onClick={() => setCurrentDate(d => addWeeks(d, 1))}>›</button>
          </div>

          {filtered.length === 0 ? (
            <div className="list-empty"><p>Brak nawyków</p><p className="list-empty-hint">Kliknij "+ Nowy" aby dodać</p></div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(58px,1.2fr) repeat(7,minmax(0,1fr))', gap: 4, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>NAWYK</div>
                {weekDays.map(d => (
                  <div key={d.date} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: d.date === TODAY ? 'var(--warn)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d.label}</div>
                    <div style={{ fontSize: 11, fontWeight: d.date === TODAY ? 700 : 400, color: d.date === TODAY ? 'var(--warn)' : 'var(--text)' }}>{d.dayNum}</div>
                  </div>
                ))}
              </div>

              {filtered.map((habit, idx) => {
                const streak = getStreak(habit.completedDates, habit.frequencyDays, pauses, habit.startDate)
                const color  = habit.color || 'var(--accent)'
                return (
                  <div key={habit.id} style={{
                    display: 'grid', gridTemplateColumns: 'minmax(58px,1.2fr) repeat(7,minmax(0,1fr))', gap: 4,
                    padding: '10px 14px', alignItems: 'center',
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                      onClick={() => { setEditHabit(habit); setShowForm(true) }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: color + '1A', color,
                      }}>
                        <CatIcon categoryId={null} emoji={habit.emoji} size={14} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{habit.name}</div>
                        {streak > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}><IconFlame size={10} style={{color:'var(--warn)'}}/>{streak}</div>}
                      </div>
                    </div>
                    {weekDays.map(d => {
                      const status = isHabitDue(habit, d.date, pauses)
                      const done   = habit.completedDates?.includes(d.date)
                      const isFut  = d.date > TODAY
                      const locked = status === 'before-start' || status === 'after-end'
                      return (
                        <button key={d.date}
                          onClick={() => !isFut && !locked && toggleDay(habit, d.date)}
                          disabled={isFut || locked}
                          style={{
                            width: 28, height: 28, borderRadius: 6, margin: '0 auto',
                            background: done ? color : status === 'off' || status === 'paused' ? 'transparent' : 'var(--surface2)',
                            border: `1px solid ${done ? color : status !== 'due' && !done ? 'transparent' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: isFut || locked ? 'default' : 'pointer',
                            opacity: done ? 1 : status === 'off' ? 0.4 : status === 'after-end' ? 0.2 : 1,
                            color: '#fff', fontSize: 11,
                          }}
                        >
                          {done ? <IconCheck size={12} /> : status === 'paused' ? (getPauseIcon(pauses, d.date) ? <span style={{ fontSize: 9 }}>{getPauseIcon(pauses, d.date)}</span> : <IconPause size={10} />) : ''}
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

      {/* ===== STATYSTYKI ===== */}
      {view === 'stats' && (() => { const hs = habitStatsSummary(habits, pauses); return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <StatSummary title="Nawyki w liczbach" month={hs.month} year={hs.year} />
        <div data-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
          {filtered.length === 0 ? (
            <div className="list-empty"><p>Brak nawyków</p></div>
          ) : filtered.map(habit => {
            const streak = getStreak(habit.completedDates, habit.frequencyDays, pauses, habit.startDate)
            const best   = getBestStreak(habit.completedDates, habit.frequencyDays, pauses, habit.startDate)
            const cat    = allCategories.find(c => c.id === habit.category)
            const color  = habit.color || 'var(--accent)'
            const last30 = (() => {
              let exp = 0, done = 0
              for (let i = 0; i < 30; i++) {
                const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
                const status = isHabitDue(habit, d, pauses)
                if (status === 'due') { exp++; if (habit.completedDates?.includes(d)) done++ }
              }
              return exp > 0 ? Math.round((done / exp) * 100) : 0
            })()
            // Spark data — last 14 days done/not (1 or 0)
            const sparkData = Array.from({ length: 14 }, (_, i) => {
              const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
              return habit.completedDates?.includes(d) ? 1 : 0
            })
            return (
              <div key={habit.id} className="card hover" style={{ padding: 16, cursor: 'pointer' }}
                onClick={() => { setEditHabit(habit); setShowForm(true) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    background: color + '1c', border: `1px solid ${color + '40'}`, color,
                  }}>
                    <CatIcon categoryId={null} emoji={habit.emoji} size={17} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{habit.name}</div>
                    {cat && <div className="kicker" style={{ marginTop: 2 }}>{cat.label}</div>}
                  </div>
                </div>

                <Spark data={sparkData} color={color} height={28} w={5} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 }}>
                  <div>
                    <div className="serif" style={{ fontSize: 26, color }}>{streak}</div>
                    <div className="kicker" style={{ marginTop: 3 }}>seria</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="serif" style={{ fontSize: 26 }}>{last30}%</div>
                    <div className="kicker" style={{ marginTop: 3 }}>30 dni</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        </div>
      ) })()}

      {/* Archiwum */}
      {archivedHabits.length > 0 && (
        <button className="btn-show-archived" onClick={() => setShowArchived(v => !v)} style={{ marginTop: 16 }}>
          Archiwum ({archivedHabits.length}) {showArchived ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </button>
      )}
      {showArchived && (
        <div className="habits-list" style={{ marginTop: 8 }}>
          {archivedHabits.map(h => (
            <div key={h.id} className="habit-row archived-row" onClick={() => { setEditHabit(h); setShowForm(true) }}>
              <div className="habit-name-col">
                <span className="habit-emoji" style={{
                  background: (h.color || 'var(--accent)') + '1A',
                  border: `1px solid ${(h.color || 'var(--accent)') + '40'}`,
                  color: h.color || 'var(--accent)',
                  opacity: 0.4,
                }}>
                  <CatIcon categoryId={null} emoji={h.emoji} size={14} />
                </span>
                <span className="habit-name" style={{ opacity: .4 }}>{h.name}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', gridColumn: '2 / -1', textAlign: 'right' }}>zarchiwizowany</span>
            </div>
          ))}
        </div>
      )}

      {/* Desktop add button */}
      <div className="desktop-only" style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="habit-compact-btn" onClick={() => setShowPause(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 10, width: 'auto' }}><IconPause size={13}/>Pauza</button>
        <button className="btn-add-habit" onClick={() => { setEditHabit(null); setShowForm(true) }}>+ Nowy nawyk</button>
      </div>

      {showPause && <PauseForm user={user} onClose={() => setShowPause(false)} />}
      {showForm && (
        <HabitForm user={user} onClose={() => { setShowForm(false); setEditHabit(null) }} editData={editHabit} />
      )}
    </div>
  )
}
