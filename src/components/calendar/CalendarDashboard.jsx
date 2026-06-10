import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO,
  addMonths, subMonths, getDate
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { CatIcon, IconEdit, IconTrash, IconCalendar, IconBook, IconTag, IconClose, IconChevronLeft, IconChevronRight } from '../Icons'

const DEFAULT_CATEGORIES = [
  { slug: 'work',     label: 'Praca',     icon: '💼', color: '#3b82f6' },
  { slug: 'home',     label: 'Dom',       icon: '🏠', color: '#10b981' },
  { slug: 'health',   label: 'Zdrowie',   icon: '❤️', color: '#ef4444' },
  { slug: 'birthday', label: 'Urodziny',  icon: '🎉', color: '#f59e0b' },
  { slug: 'study',    label: 'Nauka',     icon: '📚', color: '#8b5cf6' },
  { slug: 'sport',    label: 'Sport',     icon: '💪', color: '#14b8a6' },
  { slug: 'family',   label: 'Rodzina',   icon: '👨‍👩‍👧', color: '#ec4899' },
  { slug: 'meeting',  label: 'Spotkania', icon: '🤝', color: '#6366f1' },
  { slug: 'travel',   label: 'Wyjazdy',   icon: '✈️', color: '#C94B28' },
  { slug: 'finance',  label: 'Finanse',   icon: '💰', color: '#84cc16' },
  { slug: 'prayer',   label: 'Modlitwa',  icon: '🙏', color: '#a78bfa' },
  { slug: 'other',    label: 'Inne',      icon: '📌', color: '#607D8B' },
]

const CAT_ICONS   = [
  '💼','🏠','❤️','🎉','📚','💪','👨‍👩‍👧','🤝','✈️','💰',
  '🙏','📌','🎵','🍽️','🎬','🏥','🎓','🛒','🌿','⚽',
  '🎨','🔧','📞','🎂','🚗','💊','📸','🌙','☀️','🎯',
  '🌍','🏆','🎸','🎤','🧘','🏋️','🐾','🌺','⭐','🔑',
  '📅','💌','🎁','🔥','💎','🧠','💻','📱','🌊','🏔️',
  '✝️','🕊️','🌸','🦋','🍀','🎭','🎪','🚀','⚡','🌈',
]
const CAT_COLORS  = [
  '#C94B28','#E05A2B','#F97316','#F59E0B','#EAB308','#84CC16',
  '#22C55E','#10B981','#14B8A6','#06B6D4','#3B82F6','#6366F1',
  '#8B5CF6','#A855F7','#EC4899','#F43F5E','#64748B','#607D8B',
  '#059669','#0EA5E9','#DC2626','#7C3AED','#0D9488','#4F46E5',
  '#BE185D','#A78BFA','#92400E','#4A90D9','#1ABC9C','#E74C3C',
]
const WEEKDAYS    = ['Pn','Wt','Śr','Cz','Pt','So','Nd']

const findCat   = (cats, id) => cats.find(c => c.id === id)
const getCatColor = (cats, e) => findCat(cats, e.categoryId)?.color || e.color || '#607D8B'

const kicker = (t) => (
  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 10 }}>{t}</div>
)

export default function CalendarDashboard({ user }) {
  const [events, setEvents]       = useState([])
  const [todos, setTodos]         = useState([])
  const [payments, setPayments]   = useState([])
  const [categories, setCategories] = useState([])
  const [people, setPeople]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay]   = useState(new Date())
  const [tab, setTab]             = useState('month')
  const [showForm, setShowForm]   = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [showCatMgr, setShowCatMgr] = useState(false)

  // Categories — seed defaults on first load
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
    const q = query(collection(db, 'users', user.uid, 'prayerPeople'), orderBy('name', 'asc'))
    return onSnapshot(q, snap => setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
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
    if (!confirm('Usunąć wydarzenie?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'calendarEvents', id))
  }

  const eventsOnDay   = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return events.filter(e => {
      const start = e.date
      const end = e.dateEnd || e.date
      return dayStr >= start && dayStr <= end
    })
  }
  const todosOnDay    = (day) => todos.filter(t => t.dueDate === format(day, 'yyyy-MM-dd'))
  const paymentsOnDay = (day) => payments.filter(p => p.dayOfMonth === getDate(day))

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const calMonthLabel = format(currentMonth, 'LLLL yyyy', { locale: pl })
  const selectedDayEvents = eventsOnDay(selectedDay)
  const selectedDayTodos  = todosOnDay(selectedDay)
  const selectedDayPayments = paymentsOnDay(selectedDay)
  const selectedDayTotal  = selectedDayEvents.length + selectedDayTodos.length + selectedDayPayments.length

  // Mini stats for the month
  const monthStr = format(currentMonth, 'yyyy-MM')
  const monthEvents = events.filter(e => e.date.startsWith(monthStr))

  return (
    <div className="calendar-dashboard">
      {/* Mobile module header */}
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Kalendarz</div>
          <div className="mod-header-title" style={{ textTransform: 'capitalize' }}>{calMonthLabel}</div>
        </div>
        <div className="mod-header-right">
          <button className="icon-btn" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><IconChevronLeft size={16} /></button>
          <button className="icon-btn" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><IconChevronRight size={16} /></button>
          <button className="icon-btn" onClick={() => { setEditEvent(null); setShowForm(true) }}
            style={{ background: 'var(--primary)', color: 'var(--bg)', border: 'none' }}>
            <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>
      </div>

      {/* Tabs + categories button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', flex: 1, gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
          <button
            onClick={() => setTab('month')}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 13, fontWeight: tab === 'month' ? 700 : 400,
              background: tab === 'month' ? 'var(--surface3)' : 'transparent',
              color: tab === 'month' ? 'var(--text)' : 'var(--text-muted)',
              border: tab === 'month' ? '1px solid var(--border-strong)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >Miesiąc</button>
          <button
            onClick={() => setTab('agenda')}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 13, fontWeight: tab === 'agenda' ? 700 : 400,
              background: tab === 'agenda' ? 'var(--surface3)' : 'transparent',
              color: tab === 'agenda' ? 'var(--text)' : 'var(--text-muted)',
              border: tab === 'agenda' ? '1px solid var(--border-strong)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >Agenda</button>
        </div>
        <button className="cal-nav-btn" style={{ fontSize: 12, padding: '7px 12px', whiteSpace: 'nowrap' }}
          onClick={() => setShowCatMgr(true)}><IconTag size={13} /> Kat.</button>
      </div>

      {tab === 'month' ? (
        /* 2-column desktop layout */
        <div className="g2-14">
          {/* Left: calendar */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18 }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
                {format(currentMonth, 'LLLL yyyy', { locale: pl })}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setCurrentMonth(m => subMonths(m, 1))}>‹</button>
                <button className="icon-btn" style={{ width: 30, height: 30, fontSize: 11, padding: '2px 6px' }}
                  onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()) }}>Dziś</button>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setCurrentMonth(m => addMonths(m, 1))}>›</button>
              </div>
            </div>

            {/* Calendar grid */}
            <CalendarGrid
              currentMonth={currentMonth}
              selectedDay={selectedDay}
              categories={categories}
              onDayClick={handleDayClick}
              eventsOnDay={eventsOnDay}
              todosOnDay={todosOnDay}
              paymentsOnDay={paymentsOnDay}
            />

            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 14 }}>
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{monthEvents.length}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>Wydarzeń</div>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {todos.filter(t => t.dueDate?.startsWith(monthStr)).length}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>Zadań</div>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{payments.length}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>Płatności</div>
              </div>
            </div>
          </div>

          {/* Right: agenda dnia */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18, display: 'flex', flexDirection: 'column' }}>
            {/* Day header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
                  {format(selectedDay, 'EEEE', { locale: pl })}
                  {isToday(selectedDay) && (
                    <span style={{ marginLeft: 8, background: 'var(--primary)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700 }}>DZIŚ</span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.15, textTransform: 'capitalize', marginTop: 2 }}>
                  {format(selectedDay, 'd MMMM', { locale: pl })}
                </div>
              </div>
              <button onClick={() => { setEditEvent(null); setShowForm(true) }} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20,
                background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>
                + Wydarzenie
              </button>
            </div>

            {/* Events list */}
            {selectedDayTotal === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Brak wydarzeń
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedDayEvents.map(e => {
                  const color = getCatColor(categories, e)
                  const cat = findCat(categories, e.categoryId)
                  return (
                    <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {/* Time */}
                      <div style={{ minWidth: 44, flexShrink: 0, textAlign: 'right' }}>
                        {e.startTime && (
                          <>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{e.startTime}</div>
                            {e.endTime && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>–{e.endTime}</div>}
                          </>
                        )}
                      </div>
                      {/* Dot + vertical line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3 }} />
                      </div>
                      {/* Card */}
                      <div style={{ flex: 1, background: 'var(--surface2)', border: `1px solid ${color}33`, borderRadius: 10, padding: '8px 12px' }}
                        onMouseEnter={ev => ev.currentTarget.style.background = 'var(--surface3)'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'var(--surface2)'}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                        {cat && (
                          <div style={{ fontSize: 10, color, marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{cat.label}</div>
                        )}
                        {e.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>{e.note}</div>}
                        <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
                          <button className="t-btn" onClick={() => { setEditEvent(e); setShowForm(true) }}><IconEdit size={12} /></button>
                          <button className="t-btn delete" onClick={() => handleDelete(e.id)}><IconTrash size={12} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {selectedDayTodos.map(t => (
                  <div key={t.id} className="cal-event-row" style={{ borderLeftColor: '#6366f1', opacity: 0.8 }}>
                    <span style={{ fontSize: 14 }}>✅</span>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>
                      {t.title} <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>TERMIN ZADANIA</span>
                    </p>
                  </div>
                ))}
                {selectedDayPayments.map(p => (
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
      ) : (
        <AgendaView
          events={events} categories={categories}
          onAdd={() => { setEditEvent(null); setShowForm(true) }}
          onEdit={e => { setEditEvent(e); setShowForm(true) }}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <EventForm user={user} editData={editEvent} categories={categories} people={people}
          defaultDate={format(selectedDay, 'yyyy-MM-dd')}
          onClose={() => { setShowForm(false); setEditEvent(null) }} />
      )}

      {showCatMgr && (
        <CategoryManager user={user} categories={categories} onClose={() => setShowCatMgr(false)} />
      )}
    </div>
  )
}

/* ─── CalendarGrid ─── */
function CalendarGrid({ currentMonth, selectedDay, categories, onDayClick, eventsOnDay, todosOnDay, paymentsOnDay }) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const days       = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end:   endOfWeek(monthEnd,     { weekStartsOn: 1 })
  })

  return (
    <div className="cal-grid">
      {WEEKDAYS.map(d => (
        <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0 6px', letterSpacing: '.06em' }}>{d}</div>
      ))}
      {days.map(day => {
        const evts = eventsOnDay(day)
        const tdos = todosOnDay(day)
        const pmts = paymentsOnDay(day)
        const isSelected = isSameDay(day, selectedDay)
        const inMonth    = isSameMonth(day, currentMonth)
        const today      = isToday(day)

        const allItems = [
          ...evts.map(e => ({ label: e.title, color: getCatColor(categories, e), icon: e.categoryIcon || null })),
          ...tdos.map(t => ({ label: t.title, color: '#6366f1', icon: '✅' })),
          ...pmts.map(p => ({ label: p.name,  color: '#f59e0b', icon: '💳' })),
        ]
        const visible  = allItems.slice(0, 3)
        const overflow = allItems.length - 3

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
              {visible.map((item, i) => (
                <div key={i} className="cal-chip" style={{ background: item.color + '28', borderLeft: `2px solid ${item.color}` }}>
                  {item.icon && <span className="cal-chip-icon">{item.icon}</span>}
                  <span className="cal-chip-text">{item.label}</span>
                </div>
              ))}
              {overflow > 0 && (
                <div className="cal-chip-more">+{overflow} więcej</div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ─── AgendaView ─── */
function AgendaView({ events, categories, onAdd, onEdit, onDelete }) {
  const today    = format(new Date(), 'yyyy-MM-dd')
  const upcoming = [...events]
    .filter(e => e.date >= today)
    .sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : (a.startTime || '').localeCompare(b.startTime || ''))
  const grouped  = {}
  upcoming.forEach(e => { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e) })
  const dates    = Object.keys(grouped).sort()
  const past     = [...events].filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date))

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
            {isToday(parseISO(date)) ? '📌 DZIŚ' : format(parseISO(date), 'EEEE, d MMMM', { locale: pl })}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped[date].map(e => <EventRow key={e.id} e={e} categories={categories} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
        </div>
      ))}

      {past.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, listStyle: 'none' }}>
            ▸ Minione ({past.length})
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {past.map(e => (
              <div key={e.id} className="cal-event-row" style={{ borderLeftColor: getCatColor(categories, e), opacity: 0.5 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{e.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{format(parseISO(e.date), 'd MMM yyyy', { locale: pl })}</p>
                </div>
                <button className="t-btn delete" onClick={() => onDelete(e.id)}><IconTrash size={13} /></button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

/* ─── EventRow ─── */
function EventRow({ e, categories, onEdit, onDelete }) {
  const cat   = findCat(categories, e.categoryId)
  const color = getCatColor(categories, e)
  return (
    <div className="cal-event-row" style={{ borderLeftColor: color }}>
      {e.startTime && (
        <div style={{ minWidth: 44, flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{e.startTime}</div>
          {e.endTime && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>–{e.endTime}</div>}
          {e.dateEnd && e.dateEnd !== e.date && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
              →{format(parseISO(e.dateEnd), 'd MMM', { locale: pl })}
            </div>
          )}
        </div>
      )}
      {!e.startTime && e.dateEnd && e.dateEnd !== e.date && (
        <div style={{ minWidth: 44, flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
            →{format(parseISO(e.dateEnd), 'd MMM', { locale: pl })}
          </div>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{e.title}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: cat || e.personName ? 4 : 0 }}>
          {cat && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: color + '1A', color, borderRadius: 99, fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
              {cat.label}
            </div>
          )}
          {e.personName && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 99, fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
              👤 {e.personName}
            </div>
          )}
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

/* ─── EventForm ─── */
function EventForm({ user, editData, defaultDate, categories, people, onClose }) {
  const [title, setTitle]           = useState(editData?.title || '')
  const [date, setDate]             = useState(editData?.date || defaultDate)
  const [dateEnd, setDateEnd]       = useState(editData?.dateEnd || '')
  const [startTime, setStartTime]   = useState(editData?.startTime || '')
  const [endTime, setEndTime]       = useState(editData?.endTime || '')
  const [note, setNote]             = useState(editData?.note || '')
  const [categoryId, setCategoryId] = useState(editData?.categoryId || '')
  const [personId, setPersonId]     = useState(editData?.personId || '')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const selectedCat    = findCat(categories, categoryId)
  const selectedPerson = people?.find(p => p.id === personId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Wpisz tytuł'); return }
    if (!date) { setError('Wybierz datę'); return }
    setSaving(true)
    const data = {
      title: title.trim(), date,
      dateEnd: dateEnd && dateEnd > date ? dateEnd : null,
      startTime: startTime || null, endTime: endTime || null,
      note: note.trim(),
      categoryId: categoryId || null,
      categoryIcon: selectedCat?.icon || null,
      color: selectedCat?.color || '#607D8B',
      personId: personId || null,
      personName: selectedPerson?.name || null,
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
              autoFocus maxLength={100} placeholder="np. Spotkanie, Urodziny..." />
          </div>

          <div className="form-group">
            <label>Kategoria</label>
            <div className="cal-cat-grid">
              {categories.map(cat => (
                <button key={cat.id} type="button"
                  className={`cal-cat-btn ${categoryId === cat.id ? 'active' : ''}`}
                  style={categoryId === cat.id ? { borderColor: cat.color, background: cat.color + '22' } : {}}
                  onClick={() => setCategoryId(cat.id)}>
                  <span className="cal-cat-icon" style={categoryId === cat.id ? { background: cat.color + '33' } : {}}><CatIcon categoryId={cat.slug} emoji={cat.icon} size={15} /></span>
                  <span className="cal-cat-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Data</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Data końca (opcjonalnie)</label>
            <input type="date" className="form-input" value={dateEnd}
              onChange={e => setDateEnd(e.target.value)} min={date} />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Od (opcjonalnie)</label>
              <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Do (opcjonalnie)</label>
              <input type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
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
            <label>Notatka (opcjonalnie)</label>
            <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)}
              maxLength={200} placeholder="Szczegóły, link, miejsce..." />
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

/* ─── CategoryManager ─── */
function CategoryManager({ user, categories, onClose }) {
  const [icon, setIcon]     = useState(CAT_ICONS[0])
  const [label, setLabel]   = useState('')
  const [color, setColor]   = useState(CAT_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [emojiExpanded, setEmojiExpanded] = useState(false)

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
    if (!confirm('Usunąć kategorię?')) return
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
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface2, rgba(255,255,255,.04))', borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color }}><CatIcon categoryId={cat.slug} emoji={cat.icon} size={17} /></div>
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
                placeholder="np. Wakacje, Projekt..." maxLength={30} autoFocus />
            </div>
            <div className="form-group">
              <label>Ikona</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{icon}</span>
                <input type="text" className="form-input" value={icon}
                  onChange={e => { const v = [...e.target.value].slice(-2).join(''); if (v) setIcon(v) }}
                  placeholder="emoji" maxLength={4}
                  style={{ width: 72, textAlign: 'center', fontSize: 18, margin: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>lub wybierz:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {(emojiExpanded ? CAT_ICONS : CAT_ICONS.slice(0, 15)).map(i => (
                  <button key={i} type="button" onClick={() => setIcon(i)} style={{
                    width: 34, height: 34, borderRadius: 8, fontSize: 17, cursor: 'pointer',
                    border: `2px solid ${icon === i ? 'var(--primary)' : 'var(--border)'}`,
                    background: icon === i ? 'rgba(201,75,40,0.1)' : 'transparent'
                  }}>{i}</button>
                ))}
              </div>
              <button type="button" onClick={() => setEmojiExpanded(v => !v)}
                style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                {emojiExpanded ? '▲ Mniej' : `▼ Więcej (${CAT_ICONS.length - 15})`}
              </button>
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
