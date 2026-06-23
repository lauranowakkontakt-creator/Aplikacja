import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { format, subDays, addDays, parseISO, differenceInDays, isPast, isToday } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  IconBudget, IconHabits, IconMood, IconTodo, IconCalendar, IconPrayer, IconBook,
  IconFlame, IconChevronRight, IconCheck, IconClock, IconBills,
} from './Icons'
import { Ring } from './ChartPrimitives'
import { fmt, getCurrencyCode, CURRENCIES } from '../utils/currency'
import { BIBLE_BOOKS, TOTAL_CHAPTERS, chapterKey } from '../utils/bibleData'

const TODAY = () => format(new Date(), 'yyyy-MM-dd')

/* mała wersja isHabitDue — bez serii, tylko czy nawyk wypada dziś */
function isDueOn(habit, dateStr, pauses) {
  if (habit.archived) return false
  if (habit.startDate && dateStr < habit.startDate) return false
  if (habit.endDate && dateStr > habit.endDate) return false
  if (pauses.some(p => dateStr >= p.from && dateStr <= p.to)) return false
  const days = habit.frequencyDays || [0, 1, 2, 3, 4, 5, 6]
  return days.includes(new Date(dateStr + 'T12:00:00').getDay())
}

function greeting() {
  const h = new Date().getHours()
  if (h < 6)  return 'Dobrej nocy'
  if (h < 12) return 'Dzień dobry'
  if (h < 18) return 'Miłego dnia'
  return 'Dobry wieczór'
}

export default function Pulpit({ user, onNavigate }) {
  const [accounts, setAccounts]     = useState([])
  const [habits, setHabits]         = useState([])
  const [pauses, setPauses]         = useState([])
  const [moodLogs, setMoodLogs]     = useState([])
  const [todos, setTodos]           = useState([])
  const [events, setEvents]         = useState([])
  const [intentions, setIntentions] = useState([])
  const [payments, setPayments]     = useState([])
  const [bible, setBible]           = useState({ counts: {} })

  useEffect(() => {
    const subs = [
      onSnapshot(doc(db, 'users', user.uid, 'bible', 'progress'),
        s => setBible({ counts: s.data()?.counts || {} }),
        () => setBible({ counts: {} })),
      onSnapshot(query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc')),
        s => setAccounts(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'users', user.uid, 'habits'), orderBy('createdAt', 'asc')),
        s => setHabits(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'users', user.uid, 'habitPauses'), orderBy('from', 'desc')),
        s => setPauses(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'users', user.uid, 'moodLogs'), orderBy('createdAt', 'desc')),
        s => setMoodLogs(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'users', user.uid, 'todos'), orderBy('createdAt', 'desc')),
        s => setTodos(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'users', user.uid, 'calendarEvents'), orderBy('date', 'asc')),
        s => setEvents(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'users', user.uid, 'prayerIntentions'), orderBy('createdAt', 'desc')),
        s => setIntentions(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'users', user.uid, 'regularPayments'), orderBy('createdAt', 'asc')),
        s => setPayments(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ]
    return () => subs.forEach(u => u())
  }, [user.uid])

  const today = TODAY()

  /* ── BUDŻET ── */
  const budget = useMemo(() => {
    let excluded = []
    try { const s = localStorage.getItem(`excludedAccounts_${user.uid}`); excluded = s ? JSON.parse(s) : [] } catch {}
    const included = accounts.filter(a => !excluded.includes(a.id))
    const byCur = included.reduce((acc, a) => {
      const cur = a.currency || 'PLN'
      acc[cur] = (acc[cur] || 0) + (a.balance || 0)
      return acc
    }, {})
    const totalPLN = byCur['PLN'] || 0
    const others = Object.entries(byCur).filter(([c]) => c !== 'PLN')
    return { totalPLN, others, count: accounts.length }
  }, [accounts, user.uid])

  /* ── NAWYKI ── */
  const habitsStat = useMemo(() => {
    const due = habits.filter(h => isDueOn(h, today, pauses))
    const done = due.filter(h => h.completedDates?.includes(today)).length
    const pct = due.length > 0 ? Math.round((done / due.length) * 100) : 0
    return { due: due.length, done, pct }
  }, [habits, pauses, today])

  /* ── NASTRÓJ ── */
  const moodStat = useMemo(() => {
    const todayLogs = moodLogs.filter(l => l.date === today)
    const last = todayLogs[0] || null
    const last30 = moodLogs.filter(l => l.date >= format(subDays(new Date(), 29), 'yyyy-MM-dd') && l.moodValue)
    const avg = last30.length ? last30.reduce((s, l) => s + l.moodValue, 0) / last30.length : 0
    return { loggedToday: !!last, lastLabel: last?.moodLabel, lastColor: last?.moodColor, avg }
  }, [moodLogs, today])

  /* ── TO-DO ── */
  const todoStat = useMemo(() => {
    const active = todos.filter(t => !t.done)
    const overdue = active.filter(t => t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate)))
    const dueToday = active.filter(t => t.dueDate && isToday(parseISO(t.dueDate)))
    return { active: active.length, overdue: overdue.length, dueToday: dueToday.length }
  }, [todos])

  /* ── KALENDARZ ── */
  const calStat = useMemo(() => {
    const upcoming = events
      .filter(e => (e.dateEnd || e.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
    const todayEvents = events.filter(e => today >= e.date && today <= (e.dateEnd || e.date))
    return { next: upcoming[0] || null, todayCount: todayEvents.length }
  }, [events, today])

  /* ── MODLITWA ── */
  const prayerStat = useMemo(() => {
    const active = intentions.filter(i => i.status === 'active' || !i.status)
    const prayedToday = active.filter(i => i.prayedDates?.includes(today)).length
    const allDates = new Set(intentions.flatMap(i => i.prayedDates || []))
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      if (d > today) continue
      if (allDates.has(d)) streak++
      else if (d < today) break
    }
    return { active: active.length, prayedToday, streak }
  }, [intentions, today])

  /* ── BIBLIA ── */
  const bibleStat = useMemo(() => {
    const counts = bible.counts || {}
    let read = 0
    for (const b of BIBLE_BOOKS)
      for (let c = 1; c <= b.chapters; c++)
        if (counts[chapterKey(b.id, c)] > 0) read++
    return { read, pct: Math.round((read / TOTAL_CHAPTERS) * 100) }
  }, [bible])

  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  /* ── DZIŚ / JUTRO — wspólna agenda ── */
  const occursOn = (e, dateStr) => {
    if (dateStr < e.date) return false
    if (e.recurUntil && dateStr > e.recurUntil) return false
    if (!e.recurrence) return dateStr <= (e.dateEnd || e.date)
    const start = parseISO(e.date), now = parseISO(dateStr)
    if (e.recurrence === 'daily')  return true
    if (e.recurrence === 'weekly') return differenceInDays(now, start) % 7 === 0
    if (e.recurrence === 'monthly') return start.getDate() === now.getDate()
    if (e.recurrence === 'yearly')  return start.getDate() === now.getDate() && start.getMonth() === now.getMonth()
    return false
  }
  const buildAgenda = (dateStr) => {
    const items = []
    const d = parseISO(dateStr)
    // Wydarzenia z kalendarza (z uwzględnieniem cykliczności) — z osobą w nazwie
    events.filter(e => occursOn(e, dateStr)).forEach(e => {
      const person = e.personName || e.who || ''
      items.push({
        key: 'ev-' + e.id + '-' + dateStr, module: 'calendar', color: e.color || '#5FBF98',
        time: e.startTime || null,
        label: person ? `${e.title} · ${person}` : e.title,
        meta: e.startTime ? (e.endTime ? `${e.startTime}–${e.endTime}` : e.startTime) : 'cały dzień',
      })
    })
    // Zadania na dany dzień (nieukończone)
    todos.filter(t => !t.done && t.dueDate === dateStr).forEach(t => {
      items.push({ key: 'td-' + t.id + '-' + dateStr, module: 'todo', color: '#5BB6D9', time: null, label: t.title, meta: 'zadanie' })
    })
    // Płatności (miesięczne, w dniu, jeszcze nieodhaczone)
    const dayNum = d.getDate()
    const period = format(d, 'yyyy-MM')
    payments.filter(p => p.frequency === 'monthly' && (p.dayOfMonth || 1) === dayNum && !p.donePeriods?.includes(period)
      && (!p.dateFrom || p.dateFrom <= dateStr) && (!p.dateTo || p.dateTo >= dateStr)).forEach(p => {
      items.push({ key: 'pm-' + p.id + '-' + dateStr, module: 'budget', color: '#E0B15A', time: null, label: p.name, meta: `${p.type === 'income' ? '+' : '−'}${fmt(p.amount)}` })
    })
    // Sortuj: z godziną najpierw (wg godziny), reszta po
    return items.sort((a, b) => (a.time ? 0 : 1) - (b.time ? 0 : 1) || (a.time || '').localeCompare(b.time || ''))
  }
  const agenda         = useMemo(() => buildAgenda(today),    [events, todos, payments, today])
  const agendaTomorrow = useMemo(() => buildAgenda(tomorrow), [events, todos, payments, tomorrow])

  const habitsLeft = habitsStat.due - habitsStat.done
  const prayerLeft = prayerStat.active - prayerStat.prayedToday

  const curCode = getCurrencyCode()
  const curSymbol = CURRENCIES.find(c => c.code === curCode)?.symbol || 'zł'
  const privateMode = (() => {
    try { return localStorage.getItem('mw_privateMode') === 'true' } catch { return false }
  })()

  const dateLabel = format(new Date(), 'EEEE, d MMMM', { locale: pl })

  return (
    <div className="pulpit">
      {/* Powitanie */}
      <div className="pulpit-hero">
        <div className="pulpit-hero-kicker" style={{ textTransform: 'capitalize' }}>{dateLabel}</div>
        <h1 className="pulpit-hero-title">{greeting()}, {(user?.displayName || 'Laura').split(' ')[0]}</h1>
      </div>

      {/* DZIŚ i JUTRO — wspólna agenda */}
      <div className="pulpit-today">
        <div className="pulpit-today-head">
          <span className="pulpit-today-kicker"><IconClock size={12} /> Dziś i jutro</span>
          {(habitsLeft > 0 || prayerLeft > 0) && (
            <div className="pulpit-today-chips">
              {habitsLeft > 0 && (
                <button className="pulpit-today-chip" onClick={() => onNavigate('habits')} style={{ '--c': '#E0B15A' }}>
                  <IconHabits size={11} /> {habitsLeft} {habitsLeft === 1 ? 'nawyk' : 'nawyki'}
                </button>
              )}
              {prayerLeft > 0 && (
                <button className="pulpit-today-chip" onClick={() => onNavigate('prayer')} style={{ '--c': '#C9A24A' }}>
                  <IconPrayer size={11} /> {prayerLeft} do modlitwy
                </button>
              )}
            </div>
          )}
        </div>
        <div className="pulpit-today-cols">
          <AgendaColumn
            title="Dziś"
            items={agenda}
            onNavigate={onNavigate}
            empty={habitsLeft <= 0 && prayerLeft <= 0
              ? <><IconCheck size={15} /> Wszystko ogarnięte — wolny dzień</>
              : 'Brak wydarzeń i zadań na dziś'}
          />
          <AgendaColumn
            title="Jutro"
            items={agendaTomorrow}
            onNavigate={onNavigate}
            empty="Brak wydarzeń i zadań na jutro"
          />
        </div>
      </div>

      {/* Siatka kart */}
      <div className="pulpit-grid">

        {/* BUDŻET */}
        <PulpitCard accent="#E0673E" Icon={IconBudget} label="Budżet" onClick={() => onNavigate('budget')}>
          <div className="pulpit-value" style={{ color: privateMode ? 'var(--text-muted)' : (budget.totalPLN >= 0 ? 'var(--income)' : 'var(--expense)') }}>
            {privateMode ? '••••' : fmt(budget.totalPLN)}
          </div>
          <div className="pulpit-sub">
            {privateMode
              ? `${budget.count} ${budget.count === 1 ? 'konto' : 'kont'}`
              : budget.others.length > 0
                ? budget.others.map(([c, v]) => `${Math.round(v)} ${c}`).join(' · ')
                : `Saldo łączne · ${budget.count} ${budget.count === 1 ? 'konto' : 'kont'}`}
          </div>
        </PulpitCard>

        {/* NAWYKI */}
        <PulpitCard accent="#E0B15A" Icon={IconHabits} label="Nawyki" onClick={() => onNavigate('habits')}>
          <div className="pulpit-row">
            <Ring value={habitsStat.pct} size={56} thickness={6} color="#E0B15A" />
            <div>
              <div className="pulpit-value" style={{ fontSize: 26 }}>
                {habitsStat.done}<span className="pulpit-value-dim">/{habitsStat.due}</span>
              </div>
              <div className="pulpit-sub">{habitsStat.due > 0 ? 'zrobione dziś' : 'brak na dziś'}</div>
            </div>
          </div>
        </PulpitCard>

        {/* KALENDARZ */}
        <PulpitCard accent="#5FBF98" Icon={IconCalendar} label="Kalendarz" onClick={() => onNavigate('calendar')}>
          {calStat.next ? (
            <>
              <div className="pulpit-value" style={{ fontSize: 17, lineHeight: 1.25 }}>{calStat.next.title}</div>
              <div className="pulpit-sub" style={{ textTransform: 'capitalize' }}>
                {isToday(parseISO(calStat.next.date))
                  ? `Dziś${calStat.next.startTime ? ' · ' + calStat.next.startTime : ''}`
                  : format(parseISO(calStat.next.date), 'EEEE, d MMM', { locale: pl })}
              </div>
            </>
          ) : (
            <>
              <div className="pulpit-value" style={{ fontSize: 17 }}>Nic w planach</div>
              <div className="pulpit-sub">Dodaj wydarzenie</div>
            </>
          )}
        </PulpitCard>

        {/* TO-DO */}
        <PulpitCard accent="#5BB6D9" Icon={IconTodo} label="To-do" onClick={() => onNavigate('todo')}>
          <div className="pulpit-value" style={{ fontSize: 26 }}>
            {todoStat.active}<span className="pulpit-value-dim"> {todoStat.active === 1 ? 'zadanie' : 'zadań'}</span>
          </div>
          <div className="pulpit-sub" style={{ color: todoStat.overdue > 0 ? 'var(--expense)' : 'var(--text-muted)' }}>
            {todoStat.overdue > 0
              ? `${todoStat.overdue} przeterminowane`
              : todoStat.dueToday > 0 ? `${todoStat.dueToday} na dziś` : 'na bieżąco'}
          </div>
        </PulpitCard>

        {/* NASTRÓJ */}
        <PulpitCard accent="#9B7CF0" Icon={IconMood} label="Nastrój" onClick={() => onNavigate('mood')}>
          {moodStat.loggedToday ? (
            <div className="pulpit-row" style={{ gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: moodStat.lastColor || '#9B7CF0', flexShrink: 0 }} />
              <div className="pulpit-value" style={{ fontSize: 18 }}>{moodStat.lastLabel}</div>
            </div>
          ) : (
            <div className="pulpit-value" style={{ fontSize: 18 }}>Brak wpisu</div>
          )}
          <div className="pulpit-sub">
            {moodStat.avg > 0 ? `Śr. ${moodStat.avg.toFixed(1).replace('.', ',')}/5 · 30 dni` : 'Zapisz jak się masz'}
          </div>
        </PulpitCard>

        {/* MODLITWA */}
        <PulpitCard accent="#C9A24A" Icon={IconPrayer} label="Modlitwa" onClick={() => onNavigate('prayer')}>
          <div className="pulpit-value" style={{ fontSize: 26 }}>
            {prayerStat.prayedToday}<span className="pulpit-value-dim">/{prayerStat.active}</span>
          </div>
          <div className="pulpit-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {prayerStat.streak > 0
              ? <><IconFlame size={11} style={{ color: '#C9A24A' }} /> {prayerStat.streak} dni serii</>
              : 'modlono dziś'}
          </div>
        </PulpitCard>

        {/* BIBLIA */}
        <PulpitCard accent="#4F74D9" Icon={IconBook} label="Biblia" onClick={() => onNavigate('bible')}>
          <div className="pulpit-row">
            <Ring value={bibleStat.pct} size={56} thickness={6} color="#4F74D9" />
            <div>
              <div className="pulpit-value" style={{ fontSize: 22 }}>
                {bibleStat.read}<span className="pulpit-value-dim">/{TOTAL_CHAPTERS}</span>
              </div>
              <div className="pulpit-sub">przeczytane rozdziały</div>
            </div>
          </div>
        </PulpitCard>

      </div>
    </div>
  )
}

function AgendaColumn({ title, items, empty, onNavigate }) {
  return (
    <div className="pulpit-today-col">
      <div className="pulpit-today-coltitle">{title}</div>
      {items.length === 0 ? (
        <div className="pulpit-today-empty">{empty}</div>
      ) : (
        <div className="pulpit-today-list">
          {items.map(it => (
            <button key={it.key} className="pulpit-today-item" onClick={() => onNavigate(it.module)}>
              <span className="pulpit-today-time">{it.time || '—'}</span>
              <span className="pulpit-today-dot" style={{ background: it.color }} />
              <span className="pulpit-today-label">{it.label}</span>
              <span className="pulpit-today-meta">{it.meta}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PulpitCard({ accent, Icon, label, children, onClick }) {
  return (
    <button className="pulpit-card" onClick={onClick} style={{ '--card-accent': accent }}>
      <div className="pulpit-card-head">
        <span className="pulpit-card-icon"><Icon size={16} /></span>
        <span className="pulpit-card-label">{label}</span>
        <IconChevronRight size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
      </div>
      <div className="pulpit-card-body">{children}</div>
    </button>
  )
}
