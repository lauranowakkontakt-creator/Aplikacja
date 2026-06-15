import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO,
  addMonths, subMonths, getDate, addDays, addWeeks, addYears, differenceInCalendarDays
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { ICON_CATALOG, CatIcon, IconEdit, IconTrash, IconTag, IconClose, IconChevronLeft, IconChevronRight, IconCheck, IconCalendar, IconRepeat } from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'

// `icon` holds an SVG icon-catalog key (see Icons.jsx) — never an emoji.
const DEFAULT_CATEGORIES = [
  { slug: 'work',     label: 'Praca',     icon: 'IcBriefcase', color: '#3b82f6' },
  { slug: 'home',     label: 'Dom',       icon: 'IcSofa',      color: '#10b981' },
  { slug: 'health',   label: 'Zdrowie',   icon: 'IconHeart',   color: '#ef4444' },
  { slug: 'birthday', label: 'Urodziny',  icon: 'IcCake',      color: '#f59e0b' },
  { slug: 'study',    label: 'Nauka',     icon: 'IcBookOpen',  color: '#8b5cf6' },
  { slug: 'sport',    label: 'Sport',     icon: 'IcDumbbell',  color: '#14b8a6' },
  { slug: 'family',   label: 'Rodzina',   icon: 'IcUsersGrp',  color: '#ec4899' },
  { slug: 'meeting',  label: 'Spotkania', icon: 'IcHandshake', color: '#6366f1' },
  { slug: 'travel',   label: 'Wyjazdy',   icon: 'IcPlane',     color: '#C94B28' },
  { slug: 'finance',  label: 'Finanse',   icon: 'IcWallet',    color: '#84cc16' },
  { slug: 'prayer',   label: 'Modlitwa',  icon: 'IcPray',      color: '#a78bfa' },
  { slug: 'other',    label: 'Inne',      icon: 'IconMore',    color: '#607D8B' },
]

const PERSON_COLORS = [
  '#E74C3C','#E91E63','#9C27B0','#8B5CF6','#3F51B5','#2196F3',
  '#00BCD4','#009688','#4CAF50','#F59E0B','#FF9800','#FF5722',
  '#EC4899','#14B8A6','#84CC16','#6366F1',
]

const RECURRENCE = [
  { id: '',        label: 'Nie' },
  { id: 'daily',   label: 'Codziennie' },
  { id: 'weekly',  label: 'Co tydzień' },
  { id: 'monthly', label: 'Co miesiąc' },
  { id: 'yearly',  label: 'Co rok' },
]
const RECUR_LABEL = { daily: 'co dzień', weekly: 'co tydzień', monthly: 'co miesiąc', yearly: 'co rok' }
const recStep = (d, rec) =>
  rec === 'daily' ? addDays(d, 1) : rec === 'weekly' ? addWeeks(d, 1) : rec === 'monthly' ? addMonths(d, 1) : addYears(d, 1)

// Rozwija wydarzenia cykliczne na konkretne wystąpienia w zakresie [rangeStart, rangeEnd] (stringi yyyy-MM-dd)
function expandEvents(events, rangeStart, rangeEnd) {
  const out = []
  for (const e of events) {
    if (!e.recurrence) {
      if ((e.dateEnd || e.date) >= rangeStart && e.date <= rangeEnd) out.push(e)
      continue
    }
    const durDays = e.dateEnd ? differenceInCalendarDays(parseISO(e.dateEnd), parseISO(e.date)) : 0
    const hardEnd = e.recurUntil || rangeEnd
    let cur = parseISO(e.date)
    let guard = 0
    while (guard++ < 900) {
      const cd = format(cur, 'yyyy-MM-dd')
      if (cd > rangeEnd || cd > hardEnd) break
      const cdEnd = durDays ? format(addDays(cur, durDays), 'yyyy-MM-dd') : null
      if ((cdEnd || cd) >= rangeStart) out.push({ ...e, date: cd, dateEnd: cdEnd, _baseId: e.id, _recurring: true })
      cur = recStep(cur, e.recurrence)
    }
  }
  return out
}

const CAT_COLORS = [
  '#C94B28','#E05A2B','#F97316','#F59E0B','#EAB308','#84CC16',
  '#22C55E','#10B981','#14B8A6','#06B6D4','#3B82F6','#6366F1',
  '#8B5CF6','#A855F7','#EC4899','#F43F5E','#64748B','#607D8B',
  '#059669','#0EA5E9','#DC2626','#7C3AED','#0D9488','#4F46E5',
  '#BE185D','#A78BFA','#92400E','#4A90D9','#1ABC9C','#E74C3C',
]
const WEEKDAYS = ['Pn','Wt','Śr','Cz','Pt','So','Nd']

const findCat    = (cats, id)   => cats.find(c => c.id === id)
const findPerson = (ppl, id)    => ppl.find(p => p.id === id)
const getEventColor = (cats, ppl, e) =>
  findPerson(ppl, e.personId)?.color || findCat(cats, e.categoryId)?.color || e.color || '#607D8B'
const initials = (name) =>
  (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const kicker = (t) => (
  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 2, background: 'var(--accent)', opacity: 0.6 }} />
    {t}
  </div>
)

/* ─── PersonBubble ─────────────────────────────────────────────────────── */
function PersonBubble({ person, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: person.color + '30', border: `2px solid ${person.color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: person.color, fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
      letterSpacing: '-0.02em',
    }}>
      {initials(person.name)}
    </div>
  )
}

/* ─── CalendarDashboard ────────────────────────────────────────────────── */
export default function CalendarDashboard({ user }) {
  const [events, setEvents]         = useState([])
  const [todos, setTodos]           = useState([])
  const [payments, setPayments]     = useState([])
  const [categories, setCategories] = useState([])
  const [calPeople, setCalPeople]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay]   = useState(new Date())
  const [tab, setTab]               = useState('month')
  const [showForm, setShowForm]     = useState(false)
  const [editEvent, setEditEvent]   = useState(null)
  const [showCatMgr, setShowCatMgr]       = useState(false)
  const [showPeopleMgr, setShowPeopleMgr] = useState(false)
  const [editPerson, setEditPerson]       = useState(null)
  const [filterPersonId, setFilterPersonId] = useState(null)

  const deletePerson = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć osobę?', message: 'Jej wydarzenia pozostaną, ale stracą przypisanie do osoby.' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'calendarPeople', id))
    if (filterPersonId === id) setFilterPersonId(null)
  }
  const openPersonEdit = (p) => { setEditPerson(p); setShowPeopleMgr(true) }

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'calendarCategories'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, async snap => {
      if (snap.empty) {
        for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
          const c = DEFAULT_CATEGORIES[i]
          await addDoc(collection(db, 'users', user.uid, 'calendarCategories'), {
            ...c, createdAt: Timestamp.fromMillis(Date.now() + i * 10)
          })
        }
        return
      }
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'calendarPeople'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setCalPeople(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'calendarEvents'), orderBy('date', 'asc'))
    return onSnapshot(q, snap => { setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) })
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'todos'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => !t.done && t.dueDate)))
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'regularPayments'), orderBy('dayOfMonth', 'asc'))
    return onSnapshot(q, snap => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.frequency === 'monthly')))
  }, [user.uid])

  const handleDayClick = (day) => {
    setSelectedDay(day)
    if (!isSameMonth(day, currentMonth)) setCurrentMonth(day)
  }

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć wydarzenie?' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'calendarEvents', id))
  }

  // Wydarzenia z rozwiniętą cyklicznością dla widocznego zakresu (miesiąc ± bufor + agenda do przodu)
  const expandedEvents = useMemo(() => {
    const rs = format(startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const re = format(endOfMonth(addMonths(currentMonth, 6)), 'yyyy-MM-dd')
    return expandEvents(events, rs, re)
  }, [events, currentMonth])

  const eventsOnDay = (day) => {
    const s = format(day, 'yyyy-MM-dd')
    const all = expandedEvents.filter(e => s >= e.date && s <= (e.dateEnd || e.date))
    return filterPersonId ? all.filter(e => e.personId === filterPersonId) : all
  }
  const todosOnDay    = (day) => todos.filter(t => t.dueDate === format(day, 'yyyy-MM-dd'))
  const paymentsOnDay = (day) => payments.filter(p => p.dayOfMonth === getDate(day))

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const calMonthLabel  = format(currentMonth, 'LLLL yyyy', { locale: pl })
  const selEvts  = eventsOnDay(selectedDay)
  const selTodos = todosOnDay(selectedDay)
  const selPmts  = paymentsOnDay(selectedDay)
  const monthStr = format(currentMonth, 'yyyy-MM')
  const monthEvents = expandedEvents.filter(e => e.date.startsWith(monthStr))
  const colorOf = (e) => getEventColor(categories, calPeople, e)

  return (
    <div className="calendar-dashboard">
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Kalendarz</div>
          <div className="mod-header-title" style={{ textTransform: 'capitalize' }}>{calMonthLabel}</div>
        </div>
        <div className="mod-header-right">
          <button className="icon-btn" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><IconChevronLeft size={16} /></button>
          <button className="icon-btn" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><IconChevronRight size={16} /></button>
          <button className="icon-btn" onClick={() => { setEditEvent(null); setShowForm(true) }}
            style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none' }}>
            <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>
      </div>

      {/* Tabs + category btn */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', flex: 1, gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
          {[['month','Miesiąc'],['week','Tydzień'],['agenda','Agenda'],['people','Osoby']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 13, fontWeight: tab === key ? 700 : 400,
              background: tab === key ? 'var(--surface3)' : 'transparent',
              color: tab === key ? 'var(--text)' : 'var(--text-muted)',
              border: tab === key ? '1px solid var(--border-strong)' : '1px solid transparent',
              cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
        <button className="cal-nav-btn" title="Kategorie" style={{ fontSize: 12, padding: '7px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={() => setShowCatMgr(true)}><IconTag size={13} /></button>
      </div>

      {/* Person filter pills */}
      {calPeople.length > 0 && tab !== 'people' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <button onClick={() => setFilterPersonId(null)} style={{
            padding: '4px 10px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
            border: `1.5px solid ${filterPersonId === null ? 'var(--text)' : 'var(--border)'}`,
            background: filterPersonId === null ? 'var(--surface3)' : 'transparent',
            color: filterPersonId === null ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: filterPersonId === null ? 700 : 400,
          }}>Wszyscy</button>
          {calPeople.map(p => (
            <button key={p.id} onClick={() => setFilterPersonId(filterPersonId === p.id ? null : p.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px 3px 4px',
              borderRadius: 99, fontSize: 12, cursor: 'pointer',
              border: `1.5px solid ${p.color}`,
              background: filterPersonId === p.id ? p.color + '28' : 'transparent',
              color: filterPersonId === p.id ? p.color : 'var(--text-muted)',
              fontWeight: filterPersonId === p.id ? 700 : 400,
            }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 700 }}>
                {initials(p.name)}
              </div>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* MONTH TAB */}
      {tab === 'month' && (
        <div className="g2-14">
          {/* Left: calendar */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18 }}>
            <div className="cal-inner-nav">
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 2, background: 'var(--accent)', opacity: 0.6 }} />
                {format(currentMonth, 'LLLL yyyy', { locale: pl })}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setCurrentMonth(m => subMonths(m, 1))}>‹</button>
                <button className="icon-btn" style={{ width: 30, height: 30, fontSize: 11, padding: '2px 6px' }}
                  onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()) }}>Dziś</button>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setCurrentMonth(m => addMonths(m, 1))}>›</button>
              </div>
            </div>

            <CalendarGrid
              currentMonth={currentMonth}
              selectedDay={selectedDay}
              categories={categories}
              calPeople={calPeople}
              events={filterPersonId ? expandedEvents.filter(e => e.personId === filterPersonId) : expandedEvents}
              onDayClick={handleDayClick}
              todosOnDay={todosOnDay}
              paymentsOnDay={paymentsOnDay}
            />

            <div className="cal-mini-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 14 }}>
              {[[monthEvents.length,'Wydarzeń'],[todos.filter(t=>t.dueDate?.startsWith(monthStr)).length,'Zadań'],[payments.length,'Płatności']].map(([n,lbl]) => (
                <div key={lbl} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div className="cal-stat-num" style={{ fontSize: 16, fontWeight: 700 }}>{n}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: day detail */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 2, background: 'var(--accent)', opacity: 0.6 }} />
                  {format(selectedDay, 'EEEE', { locale: pl })}
                  {isToday(selectedDay) && <span style={{ marginLeft: 8, background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700 }}>DZIŚ</span>}
                </div>
                <div className="cal-day-panel-date" style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.15, textTransform: 'capitalize', marginTop: 2 }}>
                  {format(selectedDay, 'd MMMM', { locale: pl })}
                </div>
              </div>
              <button onClick={() => { setEditEvent(null); setShowForm(true) }} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20,
                background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>+ Wydarzenie</button>
            </div>

            {selEvts.length + selTodos.length + selPmts.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Brak wydarzeń</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selEvts.map(e => {
                  const color  = colorOf(e)
                  const person = findPerson(calPeople, e.personId)
                  const cat    = findCat(categories, e.categoryId)
                  return (
                    <div key={e.id} style={{ background: 'var(--surface2)', border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {person && <PersonBubble person={person} size={26} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                          {e.startTime && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</div>}
                        </div>
                        <button className="t-btn" onClick={() => { setEditEvent(e); setShowForm(true) }}><IconEdit size={12} /></button>
                        <button className="t-btn delete" onClick={() => handleDelete(e.id)}><IconTrash size={12} /></button>
                      </div>
                      {person && <div style={{ fontSize: 11, color: person.color, fontWeight: 600, marginTop: 5 }}>{person.name}</div>}
                      {!person && cat && <div style={{ fontSize: 10, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 4 }}>{cat.label}</div>}
                      {e.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>{e.note}</div>}
                    </div>
                  )
                })}
                {selTodos.map(t => (
                  <div key={t.id} className="cal-event-row" style={{ borderLeftColor: '#6366f1', opacity: 0.8 }}>
                    <IconCheck size={14} style={{ color: '#6366f1', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>
                      {t.title} <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>TERMIN ZADANIA</span>
                    </p>
                  </div>
                ))}
                {selPmts.map(p => (
                  <div key={p.id} className="cal-event-row" style={{ borderLeftColor: '#f59e0b', opacity: 0.8 }}>
                    <CatIcon categoryId={p.categoryId} emoji={p.categoryIcon} size={14} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{p.name}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>REGULARNA PŁATNOŚĆ</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'week' && (
        <WeekView
          weekDate={selectedDay}
          events={expandedEvents}
          categories={categories}
          calPeople={calPeople}
          filterPersonId={filterPersonId}
          todosOnDay={todosOnDay}
          paymentsOnDay={paymentsOnDay}
          onPrev={() => setSelectedDay(d => addDays(d, -7))}
          onNext={() => setSelectedDay(d => addDays(d, 7))}
          onToday={() => setSelectedDay(new Date())}
          onAddOn={(day) => { setSelectedDay(day); setEditEvent(null); setShowForm(true) }}
          onEdit={e => { setEditEvent(e); setShowForm(true) }}
          onDelete={handleDelete}
        />
      )}

      {tab === 'agenda' && (
        <AgendaView events={expandedEvents} categories={categories} calPeople={calPeople}
          filterPersonId={filterPersonId}
          onAdd={() => { setEditEvent(null); setShowForm(true) }}
          onEdit={e => { setEditEvent(e); setShowForm(true) }}
          onDelete={handleDelete} />
      )}

      {tab === 'people' && (
        <PeopleView calPeople={calPeople} events={expandedEvents} categories={categories}
          onManage={() => { setEditPerson(null); setShowPeopleMgr(true) }}
          onEditPerson={openPersonEdit}
          onDeletePerson={deletePerson}
          onEdit={e => { setEditEvent(e); setShowForm(true) }}
          onDelete={handleDelete} />
      )}

      {showForm && (
        <EventForm user={user} editData={editEvent} categories={categories} calPeople={calPeople}
          defaultDate={format(selectedDay, 'yyyy-MM-dd')}
          onClose={() => { setShowForm(false); setEditEvent(null) }} />
      )}
      {showCatMgr    && <CategoryManager user={user} categories={categories} onClose={() => setShowCatMgr(false)} />}
      {showPeopleMgr && <PeopleManager   user={user} calPeople={calPeople} editData={editPerson} onClose={() => { setShowPeopleMgr(false); setEditPerson(null) }} />}
    </div>
  )
}

/* ─── CalendarGrid ─── */
function CalendarGrid({ currentMonth, selectedDay, categories, calPeople, events, onDayClick, todosOnDay, paymentsOnDay }) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const allDays    = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end:   endOfWeek(monthEnd,     { weekStartsOn: 1 })
  })
  const weeks = []
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7))

  const eventsOnDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return events.filter(e => dayStr >= e.date && dayStr <= (e.dateEnd || e.date))
  }

  const getSpanPos = (event, day) => {
    if (!event.dateEnd || event.dateEnd === event.date) return 'solo'
    const dayStr = format(day, 'yyyy-MM-dd')
    const wStart = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const wEnd   = format(endOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const effStart = event.date > wStart ? event.date : wStart
    const effEnd   = event.dateEnd < wEnd  ? event.dateEnd  : wEnd
    if (dayStr === effStart) return 'start'
    if (dayStr === effEnd)   return 'end'
    return 'mid'
  }

  return (
    <div>
      <div className="cal-grid" style={{ marginBottom: 2 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0 6px', letterSpacing: '.06em' }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="cal-grid" style={{ marginBottom: 2 }}>
          {week.map(day => {
            const evts = eventsOnDay(day)
            const tdos = todosOnDay(day)
            const pmts = paymentsOnDay(day)
            const isSelected = isSameDay(day, selectedDay)
            const inMonth    = isSameMonth(day, currentMonth)
            const today      = isToday(day)

            const multiDay  = evts.filter(e => e.dateEnd && e.dateEnd !== e.date)
            const singleDay = evts.filter(e => !e.dateEnd || e.dateEnd === e.date)

            const singleItems = [
              ...singleDay.map(e => ({ label: e.title, color: getEventColor(categories, calPeople, e) })),
              ...tdos.map(t => ({ label: t.title, color: '#6366f1' })),
              ...pmts.map(p => ({ label: p.name,  color: '#f59e0b' })),
            ]
            const visibleSingle = singleItems.slice(0, Math.max(0, 3 - multiDay.length))
            const overflow = singleItems.length - visibleSingle.length + Math.max(0, multiDay.length - 3)

            return (
              <button
                key={day.toISOString()}
                className={`cal-day${isSelected ? ' cal-day--sel' : ''}`}
                onClick={() => onDayClick(day)}
                style={{ opacity: inMonth ? 1 : 0.25 }}
              >
                <div className={`cal-day-num${today ? ' today' : isSelected ? ' selected' : ''}`}>
                  {getDate(day)}
                </div>
                <div className="cal-chips">
                  {multiDay.slice(0, 3).map((e) => {
                    const pos     = getSpanPos(e, day)
                    const color   = getEventColor(categories, calPeople, e)
                    const isStart = pos === 'start' || pos === 'solo'
                    const isEnd   = pos === 'end'   || pos === 'solo'
                    return (
                      <div key={e.id} className="cal-mday" style={{
                        background: color + '40',
                        borderLeft:  isStart ? `2px solid ${color}` : `2px solid ${color}40`,
                        borderRight: isEnd   ? `2px solid ${color}` : 'none',
                        borderTop: `1px solid ${color}66`, borderBottom: `1px solid ${color}66`,
                        borderTopLeftRadius:     isStart ? 3 : 0,
                        borderBottomLeftRadius:  isStart ? 3 : 0,
                        borderTopRightRadius:    isEnd ? 3 : 0,
                        borderBottomRightRadius: isEnd ? 3 : 0,
                        paddingLeft: isStart ? 4 : 0,
                      }}>
                        {isStart && <span className="cal-mday-title">{e.title}</span>}
                      </div>
                    )
                  })}
                  {visibleSingle.map((item, i) => (
                    <div key={i} className="cal-chip" style={{ background: item.color + '28', borderLeft: `2px solid ${item.color}` }}>
                      <span className="cal-chip-text">{item.label}</span>
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div className="cal-chip-more">+{overflow}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ─── WeekView ─────────────────────────────────────────────────────────── */
function WeekView({ weekDate, events, categories, calPeople, filterPersonId, todosOnDay, paymentsOnDay, onPrev, onNext, onToday, onAddOn, onEdit, onDelete }) {
  const start = startOfWeek(weekDate, { weekStartsOn: 1 })
  const days  = eachDayOfInterval({ start, end: endOfWeek(weekDate, { weekStartsOn: 1 }) })
  const evOn = (day) => {
    const s = format(day, 'yyyy-MM-dd')
    let all = events.filter(e => s >= e.date && s <= (e.dateEnd || e.date))
    if (filterPersonId) all = all.filter(e => e.personId === filterPersonId)
    return all.sort((a, b) => (a.startTime || '99').localeCompare(b.startTime || '99'))
  }
  const rangeLabel = `${format(start, 'd', { locale: pl })}–${format(days[6], 'd MMM yyyy', { locale: pl })}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="icon-btn" onClick={onPrev}><IconChevronLeft size={16} /></button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>{rangeLabel}</span>
        <button className="icon-btn" style={{ width: 'auto', padding: '0 10px', fontSize: 12 }} onClick={onToday}>Dziś</button>
        <button className="icon-btn" onClick={onNext}><IconChevronRight size={16} /></button>
      </div>

      {days.map(day => {
        const evts  = evOn(day)
        const tds   = todosOnDay(day)
        const pms   = paymentsOnDay(day)
        const today = isToday(day)
        const count = evts.length + tds.length + pms.length
        return (
          <div key={day.toISOString()} style={{
            background: 'var(--surface)', border: `1px solid ${today ? 'color-mix(in oklab, var(--accent) 40%, var(--border))' : 'var(--border)'}`,
            borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: today ? 'var(--accent-soft)' : 'var(--surface2)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize', color: today ? 'var(--accent)' : 'var(--text)' }}>
                {format(day, 'EEEE', { locale: pl })}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{format(day, 'd MMM', { locale: pl })}</span>
              {today && <span style={{ fontSize: 8, fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>DZIŚ</span>}
              <button className="t-btn" style={{ marginLeft: 'auto' }} title="Dodaj" onClick={() => onAddOn(day)}>+</button>
            </div>
            {count === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>—</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px' }}>
                {evts.map(e => {
                  const color = getEventColor(categories, calPeople, e)
                  return (
                    <div key={e.id + e.date} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '7px 10px' }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: 38, flexShrink: 0 }}>{e.startTime || '—'}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                      {e.recurrence && <IconRepeat size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                      <button className="t-btn" onClick={() => onEdit(e)}><IconEdit size={12} /></button>
                      <button className="t-btn delete" onClick={() => onDelete(e.id)}><IconTrash size={12} /></button>
                    </div>
                  )
                })}
                {tds.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                    <IconCheck size={12} style={{ color: '#6366f1' }} /> {t.title} <span style={{ fontSize: 9, color: '#6366f1', fontWeight: 700 }}>ZADANIE</span>
                  </div>
                ))}
                {pms.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                    <CatIcon categoryId={p.categoryId} emoji={p.categoryIcon} size={12} /> {p.name} <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>PŁATNOŚĆ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── AgendaView ───────────────────────────────────────────────────────── */
function AgendaView({ events, categories, calPeople, filterPersonId, onAdd, onEdit, onDelete }) {
  const today    = format(new Date(), 'yyyy-MM-dd')
  const src      = filterPersonId ? events.filter(e => e.personId === filterPersonId) : events
  const upcoming = [...src].filter(e => e.date >= today)
    .sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : (a.startTime || '').localeCompare(b.startTime || ''))
  const grouped  = {}
  upcoming.forEach(e => { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e) })
  const dates    = Object.keys(grouped).sort()
  const past     = [...src].filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button className="btn-add-habit" onClick={onAdd}>+ Dodaj wydarzenie</button>
      {dates.length === 0 ? (
        <div className="list-empty">
          <p>Brak nadchodzących wydarzeń</p>
          <p className="list-empty-hint">Dodaj wydarzenie przyciskiem powyżej</p>
        </div>
      ) : dates.map(date => (
        <div key={date}>
          <p className="cal-agenda-date">
            {isToday(parseISO(date)) ? 'DZIŚ' : format(parseISO(date), 'EEEE, d MMMM', { locale: pl })}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped[date].map(e => <EventRow key={e.id} e={e} categories={categories} calPeople={calPeople} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
        </div>
      ))}
      {past.length > 0 && (
        <details>
          <summary style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, listStyle: 'none', marginTop: 4 }}>
            <IconChevronRight size={12} style={{ verticalAlign: 'middle' }} /> Minione ({past.length})
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {past.map(e => <EventRow key={e.id} e={e} categories={categories} calPeople={calPeople} onEdit={onEdit} onDelete={onDelete} muted />)}
          </div>
        </details>
      )}
    </div>
  )
}

/* ─── EventRow ─────────────────────────────────────────────────────────── */
function EventRow({ e, categories, calPeople, onEdit, onDelete, muted }) {
  const person = findPerson(calPeople, e.personId)
  const cat    = findCat(categories, e.categoryId)
  const color  = getEventColor(categories, calPeople, e)
  return (
    <div className="cal-event-row" style={{ borderLeftColor: color, opacity: muted ? 0.5 : 1 }}>
      {(e.startTime || (e.dateEnd && e.dateEnd !== e.date)) && (
        <div style={{ minWidth: 44, flexShrink: 0 }}>
          {e.startTime && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{e.startTime}</div>}
          {e.endTime   && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>–{e.endTime}</div>}
          {e.dateEnd && e.dateEnd !== e.date && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>→{format(parseISO(e.dateEnd), 'd MMM', { locale: pl })}</div>
          )}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          {person && <PersonBubble person={person} size={20} />}
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{e.title}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {person && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: person.color + '22', color: person.color, fontWeight: 700 }}>{person.name}</span>}
          {cat    && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: color + '18', color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{cat.label}</span>}
        </div>
        {e.note && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{e.note}</p>}
      </div>
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <button className="t-btn" onClick={() => onEdit(e)}><IconEdit size={13} /></button>
        <button className="t-btn delete" onClick={() => onDelete(e.id)}><IconTrash size={13} /></button>
      </div>
    </div>
  )
}

/* ─── PeopleView ───────────────────────────────────────────────────────── */
function PeopleView({ calPeople, events, categories, onManage, onEditPerson, onDeletePerson, onEdit, onDelete }) {
  const today = format(new Date(), 'yyyy-MM-dd')

  const upcomingFor = (personId) =>
    events.filter(e => e.personId === personId && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))

  const noPerson = events.filter(e => !e.personId && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button className="btn-add-habit" onClick={onManage}>+ Zarządzaj osobami</button>

      {calPeople.length === 0 && (
        <div className="list-empty">
          <p>Brak osób</p>
          <p className="list-empty-hint">Dodaj osoby przyciskiem powyżej, każda dostanie swój kolor</p>
        </div>
      )}

      {calPeople.map(person => {
        const upcoming = upcomingFor(person.id)
        return (
          <div key={person.id} style={{ background: 'var(--surface)', border: `1px solid ${person.color}44`, borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: person.color + '14', borderBottom: `1px solid ${person.color}22` }}>
              <PersonBubble person={person} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{person.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {upcoming.length > 0 ? `${upcoming.length} nadchodzących wydarzeń` : 'Nic zaplanowanego'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="t-btn" title="Edytuj osobę" onClick={() => onEditPerson(person)}><IconEdit size={14} /></button>
                <button className="t-btn delete" title="Usuń osobę" onClick={() => onDeletePerson(person.id)}><IconTrash size={14} /></button>
              </div>
            </div>

            {upcoming.length > 0 ? (
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {upcoming.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 10px', borderRadius: 9, background: 'var(--surface2)' }}>
                    <div style={{ flexShrink: 0, paddingTop: 1 }}>
                      <div style={{ fontSize: 11, color: person.color, fontWeight: 700, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {format(parseISO(e.date), 'd MMM', { locale: pl })}
                      </div>
                      {e.startTime && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{e.startTime}</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</div>
                      {e.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>{e.note}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button className="t-btn" onClick={() => onEdit(e)}><IconEdit size={11} /></button>
                      <button className="t-btn delete" onClick={() => onDelete(e.id)}><IconTrash size={11} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nic zaplanowanego</div>
            )}
          </div>
        )
      })}

      {noPerson.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.12em', borderBottom: '1px solid var(--border)' }}>
            Bez osoby
          </div>
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {noPerson.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{format(parseISO(e.date), 'd MMM', { locale: pl })}</span>
                <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{e.title}</span>
                <button className="t-btn" onClick={() => onEdit(e)}><IconEdit size={11} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── EventForm ────────────────────────────────────────────────────────── */
function EventForm({ user, editData, defaultDate, categories, calPeople, onClose }) {
  const [title, setTitle]           = useState(editData?.title || '')
  const [date, setDate]             = useState(editData?.date || defaultDate)
  const [dateEnd, setDateEnd]       = useState(editData?.dateEnd || '')
  const [allDay, setAllDay]         = useState(editData ? !editData.startTime : true)
  const [startTime, setStartTime]   = useState(editData?.startTime || '')
  const [endTime, setEndTime]       = useState(editData?.endTime || '')
  const [note, setNote]             = useState(editData?.note || '')
  const [categoryId, setCategoryId] = useState(editData?.categoryId || '')
  const [personId, setPersonId]     = useState(editData?.personId || '')
  const [recurrence, setRecurrence] = useState(editData?.recurrence || '')
  const [recurUntil, setRecurUntil] = useState(editData?.recurUntil || '')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const selectedCat    = findCat(categories, categoryId)
  const selectedPerson = findPerson(calPeople, personId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Wpisz tytuł'); return }
    if (!date) { setError('Wybierz datę'); return }
    setSaving(true)
    const data = {
      title: title.trim(), date,
      dateEnd: dateEnd && dateEnd > date ? dateEnd : null,
      startTime: allDay ? null : (startTime || null),
      endTime:   allDay ? null : (endTime   || null),
      note: note.trim(),
      categoryId: categoryId || null,
      categoryIcon: selectedCat?.icon || null,
      color: selectedPerson?.color || selectedCat?.color || '#607D8B',
      personId: personId || null,
      personName: selectedPerson?.name || null,
      recurrence: recurrence || null,
      recurUntil: recurrence && recurUntil ? recurUntil : null,
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'calendarEvents', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'calendarEvents'), { ...data, createdAt: Timestamp.now() })
      }
      onClose()
    } catch { setError('Błąd zapisu'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">

          <div className="form-group">
            <label>Tytuł</label>
            <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)}
              maxLength={100} placeholder="np. Lekarz, Urodziny Mamy..." />
          </div>

          {/* OSOBY — wybór jako pierwsza rzecz */}
          {calPeople.length > 0 && (
            <div className="form-group">
              <label>Dla kogo?</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => setPersonId('')} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '8px 10px', borderRadius: 12, cursor: 'pointer', fontSize: 11,
                  border: `2px solid ${!personId ? 'var(--border-strong)' : 'var(--border)'}`,
                  background: !personId ? 'var(--surface3)' : 'transparent',
                  color: !personId ? 'var(--text)' : 'var(--text-muted)',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-muted)' }}>—</div>
                  Brak
                </button>
                {calPeople.map(p => (
                  <button key={p.id} type="button" onClick={() => setPersonId(p.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '8px 10px', borderRadius: 12, cursor: 'pointer', fontSize: 11,
                    border: `2px solid ${personId === p.id ? p.color : 'var(--border)'}`,
                    background: personId === p.id ? p.color + '22' : 'transparent',
                    color: personId === p.id ? p.color : 'var(--text-muted)',
                    fontWeight: personId === p.id ? 700 : 400,
                  }}>
                    <PersonBubble person={p} size={36} />
                    {p.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kategoria — opcjonalna */}
          <div className="form-group">
            <label>Kategoria (opcjonalnie)</label>
            <div className="cal-cat-grid">
              {categories.map(cat => (
                <button key={cat.id} type="button"
                  className={`cal-cat-btn ${categoryId === cat.id ? 'active' : ''}`}
                  style={categoryId === cat.id ? { borderColor: cat.color, background: cat.color + '22' } : {}}
                  onClick={() => setCategoryId(categoryId === cat.id ? '' : cat.id)}>
                  <span className="cal-cat-icon" style={categoryId === cat.id ? { background: cat.color + '33' } : {}}><CatIcon categoryId={cat.slug} emoji={cat.icon} size={15} /></span>
                  <span className="cal-cat-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Data</label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Data końca (opcjonalnie)</label>
              <input type="date" className="form-input" value={dateEnd}
                onChange={e => setDateEnd(e.target.value)} min={date} />
            </div>
          </div>

          <div className="form-group">
            <div className="type-toggle">
              <button type="button"
                className={`type-btn ${allDay ? 'active expense' : ''}`}
                onClick={() => setAllDay(true)}>Całodniowe</button>
              <button type="button"
                className={`type-btn ${!allDay ? 'active expense' : ''}`}
                onClick={() => setAllDay(false)}>Z godzinami</button>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconRepeat size={13} /> Powtarzaj</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RECURRENCE.map(r => (
                <button key={r.id} type="button" onClick={() => setRecurrence(r.id)} style={{
                  flex: '1 1 auto', minWidth: 64, padding: '8px 0', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: recurrence === r.id ? 700 : 400,
                  border: `1px solid ${recurrence === r.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: recurrence === r.id ? 'var(--accent-soft)' : 'transparent',
                  color: recurrence === r.id ? 'var(--accent)' : 'var(--text-muted)',
                }}>{r.label}</button>
              ))}
            </div>
            {recurrence && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>Powtarzaj do (opcjonalnie)</label>
                <input type="date" className="form-input" value={recurUntil} min={date}
                  onChange={e => setRecurUntil(e.target.value)} />
              </div>
            )}
          </div>

          {!allDay && (
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Od</label>
                <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Do</label>
                <input type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          )}
          {people?.length > 0 && (
            <div className="form-group">
              <label>Osoba (opcjonalnie)</label>
              <div className="account-chips">
                <button type="button" className={`account-chip ${!personId ? 'active' : ''}`} onClick={() => setPersonId('')}>Brak</button>
                {people.map(p => (
                  <button key={p.id} type="button"
                    className={`account-chip ${personId === p.id ? 'active' : ''}`}
                    onClick={() => setPersonId(p.id)}
                  >{p.name}</button>
                ))}
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Opis / notatka</label>
            <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)}
              maxLength={300} placeholder="Szczegóły, miejsce, link..." />
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj wydarzenie'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── PeopleManager ────────────────────────────────────────────────────── */
function PeopleManager({ user, calPeople, editData, onClose }) {
  const [editId, setEditId] = useState(editData?.id || null)
  const [name, setName]     = useState(editData?.name || '')
  const [color, setColor]   = useState(editData?.color || PERSON_COLORS[0])
  const [saving, setSaving] = useState(false)

  const resetForm = () => { setEditId(null); setName(''); setColor(PERSON_COLORS[0]) }
  const startEdit = (p) => { setEditId(p.id); setName(p.name); setColor(p.color || PERSON_COLORS[0]) }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    if (editId) {
      await updateDoc(doc(db, 'users', user.uid, 'calendarPeople', editId), { name: name.trim(), color })
    } else {
      await addDoc(collection(db, 'users', user.uid, 'calendarPeople'), {
        name: name.trim(), color, createdAt: Timestamp.now()
      })
    }
    resetForm()
    setSaving(false)
  }

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć osobę?', message: 'Jej wydarzenia pozostaną, ale stracą przypisanie do osoby.' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'calendarPeople', id))
    if (editId === id) resetForm()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Osoby w kalendarzu</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div className="form">
          {calPeople.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {calPeople.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: editId === p.id ? p.color + '18' : 'var(--surface2)', borderRadius: 10, border: `1px solid ${editId === p.id ? p.color : p.color + '33'}` }}>
                  <PersonBubble person={p} size={34} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: p.color }}>{p.name}</span>
                  <button className="t-btn" title="Edytuj" onClick={() => startEdit(p)}><IconEdit size={13} /></button>
                  <button className="t-btn delete" title="Usuń" onClick={() => handleDelete(p.id)}><IconTrash size={13} /></button>
                </div>
              ))}
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 14px' }} />
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700 }}>{editId ? 'Edytuj osobę' : 'Dodaj osobę'}</p>

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Imię / nazwa</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)}
                placeholder="np. Mama, Zuzia, Tomek..." maxLength={40} />
            </div>
            <div className="form-group">
              <label>Kolor</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: name ? 10 : 0 }}>
                {PERSON_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{
                    width: 34, height: 34, borderRadius: '50%', background: c, cursor: 'pointer', border: 'none',
                    boxShadow: color === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : 'none',
                    transition: 'box-shadow .15s',
                  }} />
                ))}
              </div>
              {name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <PersonBubble person={{ name, color }} size={40} />
                  <span style={{ fontSize: 13, color, fontWeight: 600 }}>{name}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-save" disabled={saving || !name.trim()} style={{ flex: 1 }}>
                {saving ? 'Zapisywanie...' : editId ? 'Zapisz zmiany' : '+ Dodaj osobę'}
              </button>
              {editId && (
                <button type="button" onClick={resetForm} style={{ padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>
                  Anuluj
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ─── CategoryManager ──────────────────────────────────────────────────── */
function CategoryManager({ user, categories, onClose }) {
  const [icon, setIcon]     = useState('IconCalendar')
  const [label, setLabel]   = useState('')
  const [color, setColor]   = useState(CAT_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [iconSearch, setIconSearch] = useState('')

  const filteredIcons = iconSearch.trim()
    ? ICON_CATALOG.filter(ic => ic.label.toLowerCase().includes(iconSearch.toLowerCase()) || ic.group.toLowerCase().includes(iconSearch.toLowerCase()))
    : ICON_CATALOG

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    await addDoc(collection(db, 'users', user.uid, 'calendarCategories'), {
      label: label.trim(), icon, color, createdAt: Timestamp.now()
    })
    setLabel(''); setSaving(false)
  }

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć kategorię?' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'calendarCategories', id))
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Kategorie</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div className="form">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color }}>
                  <CatIcon categoryId={cat.slug} emoji={cat.icon} size={17} />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat.label}</span>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <button className="t-btn delete" onClick={() => handleDelete(cat.id)}><IconTrash size={13} /></button>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700 }}>Dodaj kategorię</p>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Nazwa</label>
              <input type="text" className="form-input" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="np. Wakacje, Projekt..." maxLength={30} />
            </div>
            <div className="form-group">
              <label>Ikona</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color, border: `2px solid ${color}`, flexShrink: 0 }}>
                  <CatIcon categoryId={null} emoji={icon} size={22} />
                </div>
                <input type="text" className="form-input" value={iconSearch} onChange={e => setIconSearch(e.target.value)}
                  placeholder="Szukaj ikony..." style={{ margin: 0, flex: 1 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
                {filteredIcons.map(ic => (
                  <button key={ic.key} type="button" title={ic.label} onClick={() => setIcon(ic.key)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                    border: `2px solid ${icon === ic.key ? color : 'var(--border)'}`,
                    background: icon === ic.key ? color + '22' : 'transparent',
                    color: icon === ic.key ? color : 'var(--text-muted)'
                  }}>
                    <CatIcon categoryId={null} emoji={ic.key} size={17} />
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Kolor</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CAT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: `3px solid ${color === c ? 'var(--text)' : 'transparent'}`
                  }} />
                ))}
              </div>
            </div>
            <button type="submit" className="btn-save" disabled={saving || !label.trim()}>
              {saving ? 'Dodawanie...' : '+ Dodaj kategorię'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
