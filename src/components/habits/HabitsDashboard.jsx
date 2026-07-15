import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../firebase/config'
import useFallbackTimeout from '../../utils/useFallbackTimeout'
import { format, startOfWeek, addDays, subDays, subWeeks, addWeeks, startOfMonth, endOfMonth, getDaysInMonth, addMonths, subMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import HabitForm, { HABIT_CATEGORIES, DEFAULT_HABIT_CATEGORIES } from './HabitForm'
import PauseForm from './PauseForm'
import HabitReorderModal from './HabitReorderModal'
import HabitDayGrid from './HabitDayGrid'
import HabitMenu from './HabitMenu'
import { CatIcon, IconFlame, IconStar, IconCheck, IconPause, IconChevronDown, IconChevronLeft, IconChevronRight, IconPlus } from '../Icons'
import { Ring, BarChartSVG } from '../ChartPrimitives'
import DayPath from '../DayPath'
import SegTabs from '../SegTabs'
import { isPausedDay, isHabitDue, getStreak, getBestStreak, toggleStepDone, isChecklistComplete,
  pauseForDay, pauseReasonMeta, byHabitOrder, rangeStats } from '../../utils/habitLogic'

function getPauseIcon(pauses, dateStr) {
  const p = pauseForDay(dateStr, pauses)
  return p?.reasonIcon || null
}

function getPauseColor(pauses, dateStr) {
  const p = pauseForDay(dateStr, pauses)
  return p ? pauseReasonMeta(p.reason).color : null
}

const ymd = (d) => format(d, 'yyyy-MM-dd')

// Zakres dat dla wybranego okresu statystyk.
//  ctx = { weekAnchor, monthAnchor: Date, year: number }
//  - week  → wybrany tydzień (pon–nd)
//  - month → wybrany miesiąc
//  - year  → cały wybrany rok
function statRange(period, ctx) {
  if (period === 'week') {
    const s = startOfWeek(ctx.weekAnchor, { weekStartsOn: 1 })
    return { start: ymd(s), end: ymd(addDays(s, 6)) }
  }
  if (period === 'month') {
    return { start: ymd(startOfMonth(ctx.monthAnchor)), end: ymd(endOfMonth(ctx.monthAnchor)) }
  }
  return { start: `${ctx.year}-01-01`, end: `${ctx.year}-12-31` }
}

// Kubełki trendu realizacji (%) do wykresu słupkowego:
//  - week  → 7 dni tygodnia
//  - month → tygodnie wybranego miesiąca (T1..T5)
//  - year  → po jednym słupku na każdy rok z danymi (dataYears)
function statBuckets(habits, pauses, period, ctx, dataYears, now = new Date()) {
  const todayStr = ymd(now)
  const clampEnd = (e) => (e > todayStr ? todayStr : e)
  const pct = (start, end) => (start > todayStr ? 0 : rangeStats(habits, pauses, start, clampEnd(end)).pct)
  if (period === 'week') {
    const s = startOfWeek(ctx.weekAnchor, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => {
      const d = ymd(addDays(s, i))
      return { label: format(addDays(s, i), 'EEEEEE', { locale: pl }), value: pct(d, d), active: d === todayStr }
    })
  }
  if (period === 'month') {
    const ms = startOfMonth(ctx.monthAnchor)
    const total = getDaysInMonth(ctx.monthAnchor)
    const buckets = []
    for (let i = 0, wk = 1; i < total; i += 7, wk++) {
      const start = ymd(addDays(ms, i))
      const end = ymd(addDays(ms, Math.min(i + 6, total - 1)))
      buckets.push({ label: `T${wk}`, value: pct(start, end), active: todayStr >= start && todayStr <= end })
    }
    return buckets
  }
  // year — po słupku na rok
  return dataYears.map(y => ({ label: String(y), value: pct(`${y}-01-01`, `${y}-12-31`), active: y === ctx.year }))
}

// Zbiorczy stan dnia dla wszystkich nawyków (do mini-kalendarza na dashboardzie):
//  due  — ile było obowiązkowych (+ wykonane w pauzie)
//  done — ile z nich zrobione
//  paused — czy to dzień wyjazdu/choroby
function dayAggregate(habits, pauses, dateStr) {
  let due = 0, done = 0
  habits.forEach(h => {
    const st = isHabitDue(h, dateStr, pauses)
    const isDone = h.completedDates?.includes(dateStr)
    if (st === 'due') { due++; if (isDone) done++ }
    else if (st === 'paused' && isDone) { due++; done++ }
  })
  return { due, done, pct: due ? done / due : 0, paused: isPausedDay(dateStr, pauses) }
}

const WD = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N']

// Kalendarz miesiąca wyrównany do poniedziałku (puste pola przed 1. dniem).
// renderCell(dateStr) → { bg, border, color, ring, title }. Rozmiar sterowany
// przez cellH/font/gap; maxWidth ogranicza szerokość (np. na dashboardzie).
function MonthCalendar({ month, renderCell, cellH = 20, gap = 3, font = 8.5, maxWidth, showNums = true }) {
  const mStart = startOfMonth(month)
  const lead = (mStart.getDay() + 6) % 7
  const count = getDaysInMonth(month)
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => ymd(addDays(mStart, i)))]
  const wrap = maxWidth ? { maxWidth } : {}
  return (
    <div>
      <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap, marginBottom: gap }}>
        {WD.map((l, i) => <div key={i} style={{ textAlign: 'center', fontSize: Math.max(7, font - 0.5), color: 'var(--text-muted)', fontWeight: 700 }}>{l}</div>)}
      </div>
      <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap }}>
        {cells.map((d, idx) => {
          if (!d) return <div key={`b${idx}`} />
          const c = renderCell(d)
          return (
            <div key={d} title={c.title} style={{
              height: cellH, borderRadius: cellH >= 26 ? 6 : 4, background: c.bg, border: c.border,
              boxShadow: c.ring ? '0 0 0 1.5px var(--warn)' : 'none',
              display: 'grid', placeItems: 'center', fontSize: font, color: c.color || 'var(--text-muted)', fontWeight: 600,
            }}>{showNums ? format(new Date(d + 'T12:00:00'), 'd') : ''}</div>
          )
        })}
      </div>
    </div>
  )
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
  const [showReorder, setShowReorder] = useState(false)
  const [statPeriod, setStatPeriod]   = useState('month')
  const [dashMonth, setDashMonth]     = useState(new Date())     // nawigacja miesiąca na dashboardzie
  const [weekAnchor, setWeekAnchor]   = useState(new Date())     // nawigacja tygodnia w statystykach
  const [monthAnchor, setMonthAnchor] = useState(new Date())     // nawigacja miesiąca w statystykach
  const [statYear, setStatYear]       = useState(new Date().getFullYear()) // nawigacja roku w statystykach

  const TODAY = format(new Date(), 'yyyy-MM-dd')

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE', { locale: pl }), dayNum: format(d, 'd') }
  })

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
    const update = { completedDates: done ? arrayRemove(date) : arrayUnion(date) }
    // Główny check ustawia też wszystkie kroki (odznaczenie — czyści je)
    if (habit.checklist?.length) update[`checklistDone.${date}`] = done ? [] : habit.checklist.map(s => s.id)
    await updateDoc(ref, update)
  }

  // Odhaczenie pojedynczego kroku; komplet kroków zalicza nawyk, brak — cofa zaliczenie
  const toggleStep = async (habit, date, stepId) => {
    const ref = doc(db, 'users', user.uid, 'habits', habit.id)
    const next = toggleStepDone(habit.checklistDone?.[date], stepId)
    await updateDoc(ref, {
      [`checklistDone.${date}`]: next,
      completedDates: isChecklistComplete(habit.checklist, next) ? arrayUnion(date) : arrayRemove(date),
    })
  }

  const allCategories  = [...DEFAULT_HABIT_CATEGORIES, ...customCats]
  const activeHabits   = habits.filter(h => !h.archived).sort(byHabitOrder)
  const archivedHabits = habits.filter(h => h.archived)
  const filtered = activeHabits.filter(h => filterCat === 'all' || h.category === filterCat)

  // Lata z jakimikolwiek danymi (do nawigacji w statystykach) — zawsze z bieżącym
  const dataYears = (() => {
    const s = new Set([new Date().getFullYear()])
    habits.forEach(h => (h.completedDates || []).forEach(d => s.add(+d.slice(0, 4))))
    return [...s].sort((a, b) => a - b)
  })()

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

  // Rekord — najlepsza seria historycznie (do „Dzisiejszego rytmu")
  const recordStreak = filtered.length > 0
    ? Math.max(...filtered.map(h => getBestStreak(h.completedDates, h.frequencyDays, pauses, h.startDate)))
    : 0

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const todayLabel = format(new Date(), 'EEEE, d LLL', { locale: pl })

  const kicker = (t) => (
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 2, background: 'var(--accent)', opacity: 0.6 }} />
      {t}
    </div>
  )

  // Akcje z menu „⋮" (pauza / kolejność) i szybki dodaj
  const handleMenu = (id) => {
    if (id === 'pause') setShowPause(true)
    else if (id === 'reorder') setShowReorder(true)
  }
  const addBtn = (
    <button className="icon-btn" onClick={() => { setEditHabit(null); setShowForm(true) }} title="Nowy nawyk"
      style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none' }}>
      <IconPlus size={16} />
    </button>
  )

  // Komórka kalendarza — zbiorczo (intensywność realizacji dnia dla listy nawyków)
  const aggCellFor = (list) => (d) => {
    const { done, due, pct, paused } = dayAggregate(list, pauses, d)
    const future = d > TODAY, isToday = d === TODAY
    let bg = 'var(--surface2)', border = '1px solid transparent', color = 'var(--text-muted)'
    if (future) { bg = 'transparent'; border = '1px dashed var(--border)' }
    else if (due > 0) { bg = `color-mix(in oklab, var(--warn) ${Math.round(22 + pct * 78)}%, var(--surface2))`; if (pct >= 1) border = '1px solid var(--warn)'; if (pct >= 0.5) color = 'var(--bg)' }
    else if (paused) { const p = getPauseColor(pauses, d) || 'var(--text-muted)'; bg = p + '33'; border = `1px solid ${p}66` }
    const title = `${format(new Date(d + 'T12:00:00'), 'd MMM', { locale: pl })}${due ? ` • ${done}/${due}` : paused ? ` • ${pauseReasonMeta(pauseForDay(d, pauses)?.reason).label.toLowerCase()}` : ' • wolne'}`
    return { bg, border, color, ring: isToday, title }
  }

  // Komórka kalendarza — pojedynczy nawyk (zrobione / dodatkowo / pauza / pominięte)
  const habitCellFor = (habit, color) => (d) => {
    const isDone = habit.completedDates?.includes(d)
    const status = isHabitDue(habit, d, pauses)
    const future = d > TODAY, isToday = d === TODAY
    const deep = `color-mix(in oklab, ${color} 58%, #000)`
    let bg = 'transparent', border = '1px solid transparent', textColor = 'var(--text-muted)'
    if (future) { border = '1px dashed var(--border)' }
    else if (isDone) { const bonus = status !== 'due'; bg = bonus ? deep : color; border = `1px solid ${bonus ? deep : color}`; textColor = '#fff' }
    else if (status === 'paused') { const m = pauseReasonMeta(pauseForDay(d, pauses)?.reason); bg = m.color + '33'; border = `1px solid ${m.color}66` }
    else if (status === 'due') { border = '1px solid var(--border-strong)' }
    else { border = '1px solid var(--border)' }
    return { bg, border, color: textColor, ring: isToday, title: d }
  }

  const intensityLegend = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
      <span style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>mniej</span>
      {[0, 0.35, 0.6, 0.85, 1].map((v, i) => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: v === 0 ? 'var(--surface2)' : `color-mix(in oklab, var(--warn) ${Math.round(22 + v * 78)}%, var(--surface2))` }} />
      ))}
      <span style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>więcej</span>
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
          {addBtn}
          <HabitMenu onAction={handleMenu} canReorder={activeHabits.length > 1} />
        </div>
      </div>

      {/* Hero — Postęp dnia i Kalendarz jako osobne karty */}
      <div className="g2-br" data-stagger style={{ gap: 12, marginBottom: 14, alignItems: 'start' }}>
        {/* Postęp dnia */}
        <div className="card card-hover-glow" style={{
          padding: 18, display: 'flex', alignItems: 'center', gap: 16,
          borderTop: '2px solid color-mix(in oklab, var(--accent) 80%, transparent)',
          background: 'linear-gradient(140deg, var(--surface) 45%, color-mix(in oklab, var(--accent) 7%, var(--surface)) 100%)',
        }}>
          <Ring
            value={todayDue.length > 0 ? Math.round((doneToday / todayDue.length) * 100) : 0}
            size={88} thickness={8} color="var(--warn)" label="dziś"
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

        {/* Kalendarz miesiąca — z przewijaniem (jak w budżecie) */}
        <div className="card card-hover-glow" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            {kicker('Kalendarz')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setDashMonth(subMonths(dashMonth, 1))} title="Poprzedni miesiąc"><IconChevronLeft size={14} /></button>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-sub)', textTransform: 'capitalize', minWidth: 78, textAlign: 'center' }}>{format(dashMonth, 'LLLL yyyy', { locale: pl })}</span>
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setDashMonth(addMonths(dashMonth, 1))} title="Następny miesiąc"><IconChevronRight size={14} /></button>
            </div>
          </div>
          <MonthCalendar month={dashMonth} renderCell={aggCellFor(filtered)} cellH={20} font={8.5} maxWidth={266} />
          {intensityLegend}
        </div>
      </div>

      {/* View tabs + akcje (desktop: + i ⋮ obok zakładek) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <SegTabs
          items={[{ id: 'today', label: 'Dziś' }, { id: 'week', label: 'Tydzień' }, { id: 'stats', label: 'Statystyki' }]}
          active={view} onChange={setView}
          style={{ maxWidth: 420, flex: 1, minWidth: 0 }}
        />
        <div className="desktop-only" style={{ flexShrink: 0, marginLeft: 'auto' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {addBtn}
            <HabitMenu onAction={handleMenu} canReorder={activeHabits.length > 1} />
          </div>
        </div>
      </div>

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
          const steps    = habit.checklist || []
          const stepDone = habit.checklistDone?.[selectedDay] || []
          return (
            <div key={habit.id} className="card hover" style={{
              background: done ? `color-mix(in oklab, ${color} 10%, var(--surface))` : 'var(--surface)',
              border: `1px solid ${done ? color + '50' : 'var(--border)'}`,
              padding: 16,
              opacity: isExtra && !done ? 0.66 : 1,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                  {steps.length > 0 && (
                    <span className="mono" style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: color + '1c', color, fontWeight: 600 }}>
                      {stepDone.length}/{steps.length}
                    </span>
                  )}
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
                {done ? <IconCheck size={17} /> : status === 'paused' && getPauseIcon(pauses, selectedDay) ? <span style={{ color: getPauseColor(pauses, selectedDay) || 'var(--text-muted)', display: 'grid', placeItems: 'center' }}><CatIcon categoryId={null} emoji={getPauseIcon(pauses, selectedDay)} size={15} /></span> : ''}
              </button>
            </div>

            {/* Kroki nawyku — odhaczane per dzień */}
            {steps.length > 0 && (
              <div style={{ marginTop: 10, paddingLeft: 60, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {steps.map(s => {
                  const sDone = stepDone.includes(s.id)
                  return (
                    <button key={s.id} type="button" disabled={isFut}
                      onClick={() => toggleStep(habit, selectedDay, s.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: isFut ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 5, flexShrink: 0, display: 'grid', placeItems: 'center',
                        border: `1.5px solid ${sDone ? color : 'var(--border-strong)'}`,
                        background: sDone ? color : 'transparent', color: 'var(--bg)',
                        transition: 'all .15s var(--spring)',
                      }}>{sDone && <IconCheck size={10} />}</span>
                      <span style={{ fontSize: 12, textDecoration: sDone ? 'line-through' : 'none', color: sDone ? 'var(--text-muted)' : 'var(--text-sub)' }}>{s.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
            </div>
          )
        }

        const grid = (rows) => (
          <div data-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
            {rows.map(renderCard)}
          </div>
        )

        const rytmSteps = mandatory.map(({ h }) => ({
          key: h.id, emoji: h.emoji, color: h.color || 'var(--accent)',
          done: h.completedDates?.includes(selectedDay), title: h.name,
        }))
        const rytmDone = rytmSteps.filter(s => s.done).length

        return (
          <>
            {/* Dzisiejszy rytm — ścieżka dnia (wspólny język z To-do) */}
            {rytmSteps.length > 0 && (
              <div className="card card-hover-glow" style={{ padding: 18, marginBottom: 14 }}>
                {kicker(isToday ? 'Dzisiejszy rytm' : 'Rytm dnia')}
                <DayPath steps={rytmSteps} accent="var(--warn)" />
                {/* Sam pasek postępu — licznik i seria są już w „Postęp dnia", więc tu ich nie powielamy */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--warn), var(--primary))', width: `${Math.round((rytmDone / rytmSteps.length) * 100)}%`, transition: 'width .8s var(--ease)' }} />
                  </div>
                  {recordStreak > 0 && (
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>rekord: {recordStreak} dni</span>
                  )}
                </div>
              </div>
            )}

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
            <>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) repeat(7,30px)', gap: 4, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
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
                    display: 'grid', gridTemplateColumns: 'minmax(0,1fr) repeat(7,30px)', gap: 4,
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
                        <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2, wordBreak: 'break-word' }}>{habit.name}</div>
                        {streak > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}><IconFlame size={10} style={{color:'var(--warn)'}}/>{streak}</div>}
                      </div>
                    </div>
                    {weekDays.map(d => {
                      const status = isHabitDue(habit, d.date, pauses)
                      const done   = habit.completedDates?.includes(d.date)
                      const isFut  = d.date > TODAY
                      const locked = status === 'before-start' || status === 'after-end'
                      const pauseCol = status === 'paused' ? (getPauseColor(pauses, d.date) || 'var(--text-muted)') : null
                      const deep = `color-mix(in oklab, ${color} 58%, #000)` // ciemniejszy — zrobione dodatkowo / w pauzie

                      let bg = 'transparent', border = '1px solid transparent', opacity = 1, content = null
                      if (locked) {
                        border = '1px dashed var(--border)'; opacity = 0.22
                      } else if (done) {
                        const bonus = status !== 'due'               // poza harmonogramem lub w pauzie → ciemniejszy
                        bg = bonus ? deep : color; border = `1px solid ${bonus ? deep : color}`
                        content = <IconCheck size={12} style={{ color: '#fff' }} />
                      } else if (status === 'paused') {
                        bg = pauseCol + '2b'; border = `1px solid ${pauseCol}66`
                        content = getPauseIcon(pauses, d.date)
                          ? <span style={{ color: pauseCol, display: 'grid', placeItems: 'center' }}><CatIcon categoryId={null} emoji={getPauseIcon(pauses, d.date)} size={12} /></span>
                          : <IconPause size={10} style={{ color: pauseCol }} />
                      } else if (status === 'off') {
                        content = <span style={{ width: 4, height: 4, borderRadius: 99, background: 'var(--border-strong)' }} />
                      } else if (isFut) {          // do zrobienia w przyszłości
                        bg = 'var(--surface2)'; border = '1px solid var(--border)'; opacity = 0.4
                      } else if (d.date === TODAY) { // do zrobienia dziś
                        border = `1.5px dashed ${color}`
                      } else {                       // obowiązkowe, pominięte
                        border = '1px solid var(--border-strong)'
                      }
                      return (
                        <button key={d.date}
                          onClick={() => !isFut && !locked && toggleDay(habit, d.date)}
                          disabled={isFut || locked}
                          title={status === 'paused' ? (pauseForDay(d.date, pauses)?.reasonLabel || 'Przerwa') : undefined}
                          style={{
                            width: 28, height: 28, borderRadius: 7, margin: '0 auto',
                            background: bg, border, opacity,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: isFut || locked ? 'default' : 'pointer',
                          }}
                        >
                          {content}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Legenda oznaczeń */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginTop: 10, padding: '0 4px' }}>
              {(() => {
                const sw = (style) => <span style={{ width: 15, height: 15, borderRadius: 5, flexShrink: 0, display: 'grid', placeItems: 'center', ...style }} />
                const item = (node, label) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-muted)' }}>{node}<span>{label}</span></span>
                )
                const usedPauses = [...new Set(pauses.map(p => p.reason))]
                return <>
                  {item(sw({ background: 'var(--accent)', color: '#fff' }), 'zrobione')}
                  {item(sw({ background: 'color-mix(in oklab, var(--accent) 58%, #000)', color: '#fff' }), 'dodatkowo / w przerwie')}
                  {item(sw({ border: '1.5px dashed var(--accent)' }), 'na dziś')}
                  {item(sw({ border: '1px solid var(--border-strong)' }), 'pominięte')}
                  {item(<span style={{ width: 15, height: 15, display: 'grid', placeItems: 'center' }}><span style={{ width: 4, height: 4, borderRadius: 99, background: 'var(--border-strong)' }} /></span>, 'poza planem')}
                  {usedPauses.map(rid => { const m = pauseReasonMeta(rid); return item(sw({ background: m.color + '2b', border: `1px solid ${m.color}66` }), m.label.toLowerCase()) })}
                </>
              })()}
            </div>
            </>
          )}
        </>
      )}

      {/* ===== STATYSTYKI ===== */}
      {view === 'stats' && (() => {
        const today = TODAY
        const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
        const ctx = { weekAnchor, monthAnchor, year: statYear }
        const { start, end } = statRange(statPeriod, ctx)
        const endClamped = today < end ? today : end
        const agg = rangeStats(activeHabits, pauses, start, endClamped)
        const bestStreakAll = activeHabits.reduce((m, h) => Math.max(m, getBestStreak(h.completedDates, h.frequencyDays, pauses, h.startDate)), 0)
        const buckets = statBuckets(activeHabits, pauses, statPeriod, ctx, dataYears)
        const trendTitle  = statPeriod === 'week' ? 'Realizacja dzień po dniu (%)' : statPeriod === 'month' ? 'Kalendarz miesiąca' : 'Realizacja rok po roku (%)'

        // Nawigator okresu (‹ etykieta ›)
        const wkStart   = startOfWeek(weekAnchor, { weekStartsOn: 1 })
        const yearIdx   = Math.max(0, dataYears.indexOf(statYear))
        const nowMonth  = ymd(startOfMonth(new Date()))
        const navLabel  = statPeriod === 'week'
          ? `${format(wkStart, 'd MMM', { locale: pl })} – ${format(addDays(wkStart, 6), 'd MMM yyyy', { locale: pl })}`
          : statPeriod === 'month' ? cap(format(monthAnchor, 'LLLL yyyy', { locale: pl }))
          : String(statYear)
        const ringSub   = statPeriod === 'week' ? 'tydzień' : statPeriod === 'month' ? cap(format(monthAnchor, 'LLLL', { locale: pl })) : String(statYear)
        const prevDisabled = statPeriod === 'year' ? yearIdx <= 0 : false
        const nextDisabled = statPeriod === 'week'
          ? ymd(wkStart) >= ymd(startOfWeek(new Date(), { weekStartsOn: 1 }))
          : statPeriod === 'month'
            ? ymd(startOfMonth(monthAnchor)) >= nowMonth
            : yearIdx >= dataYears.length - 1
        const goPrev = () => {
          if (statPeriod === 'week') setWeekAnchor(subDays(weekAnchor, 7))
          else if (statPeriod === 'month') setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))
          else setStatYear(dataYears[Math.max(0, yearIdx - 1)])
        }
        const goNext = () => {
          if (statPeriod === 'week') setWeekAnchor(addDays(weekAnchor, 7))
          else if (statPeriod === 'month') setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))
          else setStatYear(dataYears[Math.min(dataYears.length - 1, yearIdx + 1)])
        }

        const tile = (value, label, color, sub) => (
          <div className="tile-accent" style={{ '--tile-color': color || 'var(--warn)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
            <div className="serif" style={{ fontSize: 24, lineHeight: 1, color: color || 'var(--text)' }}>{value}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
            {sub && <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
          </div>
        )
        return (
        <div data-stagger style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Wybór okresu */}
          <SegTabs
            items={[{ id: 'week', label: 'Tydzień' }, { id: 'month', label: 'Miesiąc' }, { id: 'year', label: 'Rok' }]}
            active={statPeriod} onChange={setStatPeriod} style={{ maxWidth: 420 }}
          />

          {/* Nawigator okresu */}
          <div className="habit-week-nav" style={{ margin: 0 }}>
            <button className="month-btn" onClick={goPrev} disabled={prevDisabled} style={{ opacity: prevDisabled ? 0.3 : 1 }}>‹</button>
            <span className="habit-period-label" style={{ textTransform: statPeriod === 'week' ? 'none' : 'none' }}>{navLabel}</span>
            <button className="month-btn" onClick={goNext} disabled={nextDisabled} style={{ opacity: nextDisabled ? 0.3 : 1 }}>›</button>
          </div>

          {/* Podsumowanie okresu — duży pierścień % + kafelki */}
          <div className="card card-hover-glow" style={{
            padding: 18,
            borderTop: '2px solid color-mix(in oklab, var(--accent) 80%, transparent)',
            background: 'linear-gradient(140deg, var(--surface) 45%, color-mix(in oklab, var(--accent) 7%, var(--surface)) 100%)',
          }}>
            {kicker('Realizacja — ' + navLabel)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <Ring value={agg.pct} size={104} thickness={9} color="var(--warn)" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(80px,1fr))', gap: 10, flex: 1, minWidth: 180 }}>
                {tile(`${agg.done}/${agg.expected}`, 'Zrobione', 'var(--accent)')}
                {tile(agg.perfectDays, 'Dni 100%')}
                {tile(agg.completions, 'Odhaczeń')}
                {tile(bestStreakAll, 'Rekord serii', undefined, 'dni')}
              </div>
            </div>
          </div>

          {/* Trend realizacji w czasie — tydzień: słupki, miesiąc: kalendarz, rok: bez wykresu */}
          {activeHabits.length > 0 && statPeriod !== 'year' && (
            <div className="card card-hover-glow" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                {kicker(trendTitle)}
                {statPeriod === 'month' && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-sub)', textTransform: 'capitalize', marginBottom: 10 }}>{navLabel}</span>}
              </div>
              {statPeriod === 'month' ? (
                <>
                  <MonthCalendar month={monthAnchor} renderCell={aggCellFor(activeHabits)} cellH={30} gap={4} font={11} />
                  {intensityLegend}
                </>
              ) : (
                <BarChartSVG
                  data={buckets.map(b => ({ label: b.label, value: b.value, active: b.active }))}
                  height={150} accent="var(--warn)" fmt={v => `${v}%`}
                />
              )}
            </div>
          )}

          {/* Legenda kwadracików */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', padding: '0 4px' }}>
              {(() => {
                const chip = (bg, border, label) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-muted)' }}>
                    <span style={{ width: 13, height: 13, borderRadius: 4, background: bg, border: border || '1px solid transparent', flexShrink: 0 }} />{label}
                  </span>
                )
                const usedPauses = [...new Set(pauses.map(p => p.reason))]
                return <>
                  {chip('var(--accent)', null, 'zrobione')}
                  {chip('color-mix(in oklab, var(--accent) 58%, #000)', null, 'dodatkowo / w przerwie')}
                  {chip('transparent', '1px solid var(--border-strong)', 'pominięte')}
                  {usedPauses.map(rid => { const m = pauseReasonMeta(rid); return <span key={rid}>{chip(m.color + '33', `1px solid ${m.color}66`, m.label.toLowerCase())}</span> })}
                </>
              })()}
            </div>
          )}

          {/* Karty nawyków — z procentem z wybranego okresu */}
          <div data-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
            {filtered.length === 0 ? (
              <div className="list-empty"><p>Brak nawyków</p></div>
            ) : filtered.map(habit => {
              const streak = getStreak(habit.completedDates, habit.frequencyDays, pauses, habit.startDate)
              const best   = getBestStreak(habit.completedDates, habit.frequencyDays, pauses, habit.startDate)
              const cat    = allCategories.find(c => c.id === habit.category)
              const color  = habit.color || 'var(--accent)'
              const pct    = rangeStats([habit], pauses, start, endClamped).pct
              const fmtShort = (d) => format(new Date(d + 'T12:00:00'), 'd MMM', { locale: pl })
              return (
                <div key={habit.id} className="card hover" style={{ padding: 16, cursor: 'pointer' }}
                  onClick={() => { setEditHabit(habit); setShowForm(true) }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 14 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                      display: 'grid', placeItems: 'center',
                      background: color + '1c', border: `1px solid ${color + '40'}`, color,
                    }}>
                      <CatIcon categoryId={null} emoji={habit.emoji} size={17} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{habit.name}</div>
                      {cat && <div className="kicker" style={{ marginTop: 3 }}>{cat.label}</div>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <Ring value={pct} size={78} thickness={8} color={color} label={ringSub} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--warn)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconFlame size={14} /> <span className="mono" style={{ fontSize: 13 }}>{streak} dni serii</span>
                      </div>
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6 }}>rekord: {best} dni</div>
                    </div>
                  </div>

                  {/* Wykonanie — miesiąc jako kalendarz, tydzień/rok jako siatka */}
                  {statPeriod === 'month' ? (
                    <MonthCalendar month={monthAnchor} renderCell={habitCellFor(habit, color)} cellH={18} gap={3} font={8} />
                  ) : (
                    <>
                      <HabitDayGrid habit={habit} pauses={pauses} start={start} end={end} today={today} color={color} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{fmtShort(start)}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{fmtShort(end)}</span>
                      </div>
                    </>
                  )}
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

      {showPause && <PauseForm user={user} onClose={() => setShowPause(false)} />}
      {showReorder && <HabitReorderModal user={user} habits={activeHabits} onClose={() => setShowReorder(false)} />}
      {showForm && (
        <HabitForm user={user} onClose={() => { setShowForm(false); setEditHabit(null) }} editData={editHabit} />
      )}
    </div>
  )
}
