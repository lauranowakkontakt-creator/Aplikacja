import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO,
  addMonths, subMonths, getDate
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { CatIcon, IconEdit, IconTrash, IconTag, IconClose, IconChevronLeft, IconChevronRight } from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'

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

const PERSON_COLORS = [
  '#E74C3C','#E91E63','#9C27B0','#8B5CF6','#3F51B5','#2196F3',
  '#00BCD4','#009688','#4CAF50','#F59E0B','#FF9800','#FF5722',
  '#EC4899','#14B8A6','#84CC16','#6366F1',
]

const CAT_ICONS = [
  '💼','🏠','❤️','🎉','📚','💪','👨‍👩‍👧','🤝','✈️','💰',
  '🙏','📌','🎵','🍽️','🎬','🏥','🎓','🛒','🌿','⚽',
  '🎨','🔧','📞','🎂','🚗','💊','📸','🌙','☀️','🎯',
  '🌍','🏆','🎸','🎤','🧘','🏋️','🐾','🌺','⭐','🔑',
  '📅','💌','🎁','🔥','💎','🧠','💻','📱','🌊','🏔️',
  '✝️','🕊️','🌸','🦋','🍀','🎭','🎪','🚀','⚡','🌈',
]
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
  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 10 }}>{t}</div>
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
  const [filterPersonId, setFilterPersonId] = useState(null)

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

  const eventsOnDay = (day) => {
    const s = format(day, 'yyyy-MM-dd')
    const all = events.filter(e => s >= e.date && s <= (e.dateEnd || e.date))
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
  const monthEvents = events.filter(e => e.date.startsWith(monthStr))
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
            style={{ background: 'var(--primary)', color: 'var(--bg)', border: 'none' }}>
            <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>
      </div>

      {/* Tabs + category btn */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', flex: 1, gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
          {[['month','Miesiąc'],['agenda','Agenda'],['people','Osoby']].map(([key, label]) => (
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

            <CalendarGrid
              currentMonth={currentMonth} selectedDay={selectedDay}
              categories={categories} calPeople={calPeople}
              onDayClick={handleDayClick}
              eventsOnDay={eventsOnDay} todosOnDay={todosOnDay} paymentsOnDay={paymentsOnDay}
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
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
                  {format(selectedDay, 'EEEE', { locale: pl })}
                  {isToday(selectedDay) && <span style={{ marginLeft: 8, background: 'var(--primary)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700 }}>DZIŚ</span>}
                </div>
                <div className="cal-day-panel-date" style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.15, textTransform: 'capitalize', marginTop: 2 }}>
                  {format(selectedDay, 'd MMMM', { locale: pl })}
                </div>
              </div>
              <button onClick={() => { setEditEvent(null); setShowForm(true) }} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20,
                background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
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
                    <span style={{ fontSize: 14 }}>✅</span>
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

      {tab === 'agenda' && (
        <AgendaView events={events} categories={categories} calPeople={calPeople}
          filterPersonId={filterPersonId}
          onAdd={() => { setEditEvent(null); setShowForm(true) }}
          onEdit={e => { setEditEvent(e); setShowForm(true) }}
          onDelete={handleDelete} />
      )}

      {tab === 'people' && (
        <PeopleView calPeople={calPeople} events={events} categories={categories}
          onManage={() => setShowPeopleMgr(true)}
          onEdit={e => { setEditEvent(e); setShowForm(true) }}
          onDelete={handleDelete} />
      )}

      {showForm && (
        <EventForm user={user} editData={editEvent} categories={categories} calPeople={calPeople}
          defaultDate={format(selectedDay, 'yyyy-MM-dd')}
          onClose={() => { setShowForm(false); setEditEvent(null) }} />
      )}
      {showCatMgr    && <CategoryManager user={user} categories={categories} onClose={() => setShowCatMgr(false)} />}
      {showPeopleMgr && <PeopleManager   user={user} calPeople={calPeople}   onClose={() => setShowPeopleMgr(false)} />}
    </div>
  )
}

/* ─── CalendarGrid ─────────────────────────────────────────────────────── */
function CalendarGrid({ currentMonth, selectedDay, categories, calPeople, onDayClick, eventsOnDay, todosOnDay, paymentsOnDay }) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(currentMonth),     { weekStartsOn: 1 })
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
          ...evts.map(e => ({ color: getEventColor(categories, calPeople, e), label: e.title })),
          ...tdos.map(t => ({ color: '#6366f1', label: t.title })),
          ...pmts.map(p => ({ color: '#f59e0b', label: p.name })),
        ]
        const visible  = allItems.slice(0, 3)
        const overflow = allItems.length - 3

        return (
          <button key={day.toISOString()} className={`cal-day${isSelected ? ' cal-day--sel' : ''}`}
            onClick={() => onDayClick(day)} style={{ opacity: inMonth ? 1 : 0.25 }}>
            <div className={`cal-day-num${today ? ' today' : isSelected ? ' selected' : ''}`}>
              {getDate(day)}
            </div>
            <div className="cal-chips">
              {visible.map((item, i) => (
                <div key={i} className="cal-chip"
                  style={{ '--dot-color': item.color, background: item.color + '28', borderLeft: `2px solid ${item.color}` }}>
                  <span className="cal-chip-dot" />
                  <span className="cal-chip-text">{item.label}</span>
                </div>
              ))}
              {overflow > 0 && <div className="cal-chip-more">+{overflow}</div>}
            </div>
          </button>
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
            {isToday(parseISO(date)) ? '📌 DZIŚ' : format(parseISO(date), 'EEEE, d MMMM', { locale: pl })}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped[date].map(e => <EventRow key={e.id} e={e} categories={categories} calPeople={calPeople} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
        </div>
      ))}
      {past.length > 0 && (
        <details>
          <summary style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, listStyle: 'none', marginTop: 4 }}>
            ▸ Minione ({past.length})
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
function PeopleView({ calPeople, events, categories, onManage, onEdit, onDelete }) {
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
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{person.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {upcoming.length > 0 ? `${upcoming.length} nadchodzących wydarzeń` : 'Nic zaplanowanego'}
                </div>
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
  const [startTime, setStartTime]   = useState(editData?.startTime || '')
  const [endTime, setEndTime]       = useState(editData?.endTime || '')
  const [note, setNote]             = useState(editData?.note || '')
  const [categoryId, setCategoryId] = useState(editData?.categoryId || '')
  const [personId, setPersonId]     = useState(editData?.personId || '')
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
      startTime: startTime || null, endTime: endTime || null,
      note: note.trim(),
      categoryId: categoryId || null,
      categoryIcon: selectedCat?.icon || null,
      color: selectedPerson?.color || selectedCat?.color || '#607D8B',
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

          <div className="form-group">
            <label>Data</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Data końca (opcjonalnie)</label>
            <input type="date" className="form-input" value={dateEnd} onChange={e => setDateEnd(e.target.value)} min={date} />
          </div>
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
function PeopleManager({ user, calPeople, onClose }) {
  const [name, setName]     = useState('')
  const [color, setColor]   = useState(PERSON_COLORS[0])
  const [saving, setSaving] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await addDoc(collection(db, 'users', user.uid, 'calendarPeople'), {
      name: name.trim(), color, createdAt: Timestamp.now()
    })
    setName('')
    setSaving(false)
  }

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć osobę?', message: 'Jej wydarzenia pozostaną, ale stracą przypisanie do osoby.' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'calendarPeople', id))
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
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 10, border: `1px solid ${p.color}33` }}>
                  <PersonBubble person={p} size={34} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: p.color }}>{p.name}</span>
                  <button className="t-btn delete" onClick={() => handleDelete(p.id)}><IconTrash size={13} /></button>
                </div>
              ))}
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 14px' }} />
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700 }}>Dodaj osobę</p>

          <form onSubmit={handleAdd}>
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
            <button type="submit" className="btn-save" disabled={saving || !name.trim()}>
              {saving ? 'Dodawanie...' : '+ Dodaj osobę'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ─── CategoryManager ──────────────────────────────────────────────────── */
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
