import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import useFallbackTimeout from '../../utils/useFallbackTimeout'
import {
  format, isPast, isToday, parseISO,
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval, isWithinInterval,
  isSameMonth, isSameDay, getDate, addMonths, subMonths, addDays, addWeeks
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { BarChartSVG } from '../ChartPrimitives'
import { ICON_CATALOG, CatIcon, IconEdit, IconTrash, IconClose, IconCheck, IconFlag, IconChevronDown, IconChevronLeft, IconChevronRight, IconCalendar, IconClock, IconRepeat, IconPlus } from '../Icons'
import StatTiles from '../StatTiles'
import SegTabs from '../SegTabs'
import TodoMenu from './TodoMenu'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'
import PersonBubble from '../PersonBubble'

const PRIORITY = [
  { id: 'high',   label: 'Wysoki',  color: '#E53935' },
  { id: 'medium', label: 'Średni',  color: '#FB8C00' },
  { id: 'low',    label: 'Niski',   color: '#43A047' },
]
const LIST_COLORS = [
  '#C94B28','#E05A2B','#F97316','#F59E0B','#EAB308','#84CC16',
  '#22C55E','#10B981','#14B8A6','#06B6D4','#3B82F6','#6366F1',
  '#8B5CF6','#A855F7','#EC4899','#F43F5E','#64748B','#6B7280',
  '#059669','#0EA5E9','#DC2626','#7C3AED','#0D9488','#4F46E5',
  '#BE185D','#6B9E72','#4A90D9','#1ABC9C','#E74C3C','#92400E',
]
const pOrder      = { high: 0, medium: 1, low: 2 }
const RECURRENCE = [
  { id: '',        label: 'Brak' },
  { id: 'daily',   label: 'Codziennie' },
  { id: 'weekly',  label: 'Co tydzień' },
  { id: 'monthly', label: 'Co miesiąc' },
]
const RECUR_LABEL = { daily: 'co dzień', weekly: 'co tydzień', monthly: 'co miesiąc' }
const nextOccurrence = (base, rec) =>
  rec === 'daily' ? addDays(base, 1) : rec === 'weekly' ? addWeeks(base, 1) : addMonths(base, 1)

const kicker = (t) => (
  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 2, background: 'var(--accent)', opacity: 0.6 }} />
    {t}
  </div>
)

export default function TodoDashboard({ user, setHeaderExtras }) {
  const [todos, setTodos]           = useState([])
  const [lists, setLists]           = useState([])
  const [people, setPeople]         = useState([])
  const [loading, setLoading]       = useState(true)
  useFallbackTimeout(() => setLoading(false))
  const [view, setView]             = useState('main') // main | stats (analiza w ⋮)
  const [activeList, setActiveList] = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [editTodo, setEditTodo]     = useState(null)
  const [formDefaultDue, setFormDefaultDue] = useState('')
  const [showDone, setShowDone]     = useState(false)
  const [showListForm, setShowListForm] = useState(false)
  const [editList, setEditList]       = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLists, setShowLists]   = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'todos'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => { setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      err => { console.error('todos subscription error:', err); setLoading(false) })
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'todoLists'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setLists(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'calendarPeople'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const peopleById = Object.fromEntries(people.map(p => [p.id, p]))

  const toggleDone = async (todo) => {
    // Zadanie cykliczne: zamiast „zrobione" przesuwamy na kolejny termin i odznaczamy podzadania
    if (!todo.done && todo.recurrence) {
      const base = todo.dueDate ? parseISO(todo.dueDate) : new Date()
      const next = nextOccurrence(base, todo.recurrence)
      await updateDoc(doc(db, 'users', user.uid, 'todos', todo.id), {
        dueDate: format(next, 'yyyy-MM-dd'),
        subtasks: (todo.subtasks || []).map(s => ({ ...s, done: false })),
        done: false, doneAt: null, lastDoneAt: Timestamp.now(), updatedAt: Timestamp.now()
      })
      toast.success(`Przeniesiono na ${format(next, 'd MMM', { locale: pl })}`)
      return
    }
    await updateDoc(doc(db, 'users', user.uid, 'todos', todo.id), {
      done: !todo.done, doneAt: todo.done ? null : Timestamp.now(), updatedAt: Timestamp.now()
    })
  }

  const toggleSubtask = async (todo, subId) => {
    const subtasks = (todo.subtasks || []).map(s => s.id === subId ? { ...s, done: !s.done } : s)
    await updateDoc(doc(db, 'users', user.uid, 'todos', todo.id), { subtasks, updatedAt: Timestamp.now() })
  }

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć zadanie?' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'todos', id))
  }

  const sortActive = (arr) => [...arr].sort((a, b) => {
    const aDate = a.dueDate ? parseISO(a.dueDate) : null
    const bDate = b.dueDate ? parseISO(b.dueDate) : null
    if (aDate && bDate) return aDate - bDate
    if (aDate) return -1
    if (bDate) return 1
    return (pOrder[a.priority] ?? 3) - (pOrder[b.priority] ?? 3)
  })

  const byList   = activeList ? todos.filter(t => t.listId === activeList) : todos
  const bySearch = searchQuery.trim() ? byList.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())) : byList
  const filtered = bySearch
  const active   = sortActive(filtered.filter(t => !t.done))
  const done     = filtered.filter(t => t.done)

  // Górna belka („Mój Świat"): [⋮ Więcej — z Analizą][＋ Nowe zadanie].
  // Hook przed early-returnem (zasady hooków).
  const handleMenu = (id) => {
    if (id === 'stats')   setView('stats')
    if (id === 'search')  { setShowSearch(s => !s); setSearchQuery('') }
    if (id === 'done')    setShowDone(v => !v)
    if (id === 'newlist') setShowListForm(true)
  }
  useEffect(() => {
    setHeaderExtras?.(
      <>
        <TodoMenu onAction={handleMenu} />
        <button className="hdr-btn accent" title="Nowe zadanie"
          onClick={() => { setEditTodo(null); setFormDefaultDue(''); setShowForm(true) }}>
          <IconPlus size={17} />
        </button>
      </>
    )
    return () => setHeaderExtras?.(null)
  }, [])

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const activeListObj = lists.find(l => l.id === activeList)
  const activeListColor = activeListObj?.color || 'var(--sky)'

  const dueToday = active.filter(t => t.dueDate && isToday(parseISO(t.dueDate)))
  const highCount = active.filter(t => t.priority === 'high').length

  const listRow = (isActive, color) => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8,
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: isActive ? 700 : 500, textAlign: 'left',
    background: isActive ? (color || 'var(--sky)') + '1c' : 'transparent', border: 'none',
    color: isActive ? (color || 'var(--sky)') : 'var(--text-sub)',
  })

  return (
    <div className="todo-dashboard">
      {view === 'stats' ? (
        <>
          <div className="rev-subhead">
            <button className="rev-back" onClick={() => setView('main')} title="Wróć"><IconChevronLeft size={18} /></button>
            <div className="rev-subhead-title">Analiza i statystyki</div>
          </div>
          <TodoStats todos={todos} lists={lists} />
        </>
      ) : (
        <>
          <StatTiles tiles={[
            { label: 'Aktywne', value: active.length },
            { label: 'Na dziś', value: dueToday.length, color: dueToday.length ? 'var(--accent)' : undefined },
            { label: 'Ukończone', value: done.length },
          ]} />

          {showSearch && (
            <div style={{ padding: '0 0 12px' }}>
              <input className="form-input" placeholder="Szukaj zadań..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} style={{ margin: 0 }} />
            </div>
          )}
          {/* Wybór listy (kategorie) — zwinięte, rozwijasz „Listy" */}
          <div style={{ position: 'relative', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setShowLists(s => !s)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 99, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              border: `1px solid ${activeListObj ? activeListColor : 'var(--border-strong)'}`,
              background: activeListObj ? activeListColor + '1c' : 'var(--surface2)',
              color: activeListObj ? activeListColor : 'var(--text-sub)',
            }}>
              {activeListObj ? <><CatIcon categoryId={null} emoji={activeListObj.icon} size={13} /> {activeListObj.name}</> : 'Wszystkie zadania'}
              <IconChevronDown size={13} style={{ opacity: 0.7 }} />
            </button>
            {activeListObj && (
              <button className="icon-btn" style={{ width: 32, height: 32 }} title="Edytuj listę" onClick={() => setEditList(activeListObj)}><IconEdit size={13} /></button>
            )}
            {showLists && (
              <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200, minWidth: 230, background: 'var(--popover-bg)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: 6, boxShadow: '0 10px 30px rgba(0,0,0,.4)', display: 'flex', flexDirection: 'column', gap: 2 }}
                onClick={() => setShowLists(false)}>
                <button onClick={() => setActiveList(null)} style={listRow(!activeList, 'var(--sky)')}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--sky)', flexShrink: 0 }} /> Wszystkie
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{todos.filter(t => !t.done).length || ''}</span>
                </button>
                {lists.map(l => {
                  const cnt = todos.filter(t => !t.done && t.listId === l.id).length
                  return (
                    <button key={l.id} onClick={() => setActiveList(l.id)} style={listRow(activeList === l.id, l.color)}>
                      <CatIcon categoryId={null} emoji={l.icon} size={13} /> {l.name}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{cnt || ''}</span>
                    </button>
                  )
                })}
                <button onClick={() => setShowListForm(true)} style={{ ...listRow(false), color: 'var(--text-muted)', borderTop: '1px solid var(--border)', borderRadius: 0, marginTop: 2, paddingTop: 8 }}>
                  <IconPlus size={13} /> Nowa lista
                </button>
              </div>
            )}
          </div>

          {/* Active tasks */}
          {active.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="kicker" style={{ marginBottom: 10 }}>Aktywne · {active.length}</div>
              <div data-stagger style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {active.map(todo => (
                  <TodoItem key={todo.id} todo={todo} lists={lists} peopleById={peopleById}
                    onToggle={toggleDone} onToggleSubtask={toggleSubtask}
                    onEdit={() => { setEditTodo(todo); setShowForm(true) }}
                    onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {active.length === 0 && done.length === 0 && (
            <div className="list-empty">
              <p>Brak zadań</p>
              <p className="list-empty-hint">Kliknij „+" u góry, aby dodać zadanie</p>
            </div>
          )}

          {/* Done tasks */}
          {done.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <button onClick={() => setShowDone(v => !v)} style={{
                fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 6
              }}>
                {showDone ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />} Zrobione ({done.length})
              </button>
              {showDone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.55 }}>
                  {done.map(todo => (
                    <TodoItem key={todo.id} todo={todo} lists={lists} peopleById={peopleById}
                      onToggle={toggleDone} onToggleSubtask={toggleSubtask}
                      onEdit={() => { setEditTodo(todo); setShowForm(true) }}
                      onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Kalendarz pod zadaniami */}
          <div style={{ marginTop: 8, marginBottom: 80 }}>
            <div className="kicker" style={{ marginBottom: 10 }}>Kalendarz</div>
            <TodoCalendar
              todos={todos} lists={lists}
              onToggle={toggleDone}
              onEdit={(t) => { setEditTodo(t); setShowForm(true) }}
              onAddOnDay={(dateStr) => { setEditTodo(null); setFormDefaultDue(dateStr); setShowForm(true) }}
            />
          </div>
        </>
      )}

      {showForm && (
        <TodoForm user={user} lists={lists} people={people} editData={editTodo} defaultListId={activeList} defaultDueDate={formDefaultDue}
          onClose={() => { setShowForm(false); setEditTodo(null); setFormDefaultDue('') }} />
      )}
      {showListForm && <ListForm user={user} onClose={() => setShowListForm(false)} />}
      {editList && <ListForm user={user} onClose={() => setEditList(null)} editData={editList} />}
    </div>
  )
}

/* ─── TodoItem ─── */
function TodoItem({ todo, lists, peopleById = {}, onToggle, onToggleSubtask, onEdit, onDelete }) {
  const list     = lists.find(l => l.id === todo.listId)
  const priority = PRIORITY.find(p => p.id === todo.priority)
  const date     = todo.dueDate ? parseISO(todo.dueDate) : null
  const overdue  = date && isPast(date) && !isToday(date) && !todo.done
  const dueToday = date && isToday(date) && !todo.done
  const listColor = list?.color || 'var(--border)'
  const subs     = todo.subtasks || []
  const subsDone = subs.filter(s => s.done).length
  const linkedPeople = (todo.peopleIds || []).map(id => peopleById[id]).filter(Boolean)

  return (
    <div className="card hover" style={{
      padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 13,
    }}>
      {/* Checkbox */}
      <button onClick={() => onToggle(todo)} style={{
        width: 24, height: 24, borderRadius: 8, flexShrink: 0, marginTop: 1,
        border: `1.8px solid ${todo.done ? 'var(--income)' : list ? listColor : priority?.color || 'var(--border-strong)'}`,
        background: todo.done ? 'var(--income)' : 'transparent', cursor: 'pointer',
        display: 'grid', placeItems: 'center', color: 'var(--bg)',
        transition: 'all .2s var(--spring)',
      }}>{todo.done ? <IconCheck size={13} /> : ''}</button>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 14.5, fontWeight: 500,
          textDecoration: todo.done ? 'line-through' : 'none',
          color: todo.done ? 'var(--text-muted)' : 'var(--text)'
        }}>{todo.title}</p>
        {todo.note && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{todo.note}</p>}
        <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {list && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: listColor + '22', color: listColor, fontWeight: 600 }}>
              <CatIcon categoryId={null} emoji={list.icon} size={11} /> {list.name}
            </span>
          )}
          {priority && !todo.done && (
            <span style={{
              fontSize: 10, padding: '1px 7px', borderRadius: 4,
              background: priority.color + '22', color: priority.color, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.04em',
            }}>
              {priority.label}
            </span>
          )}
          {date && (
            <span style={{ fontSize: 11, fontWeight: overdue || dueToday ? 600 : 400, color: overdue ? '#E53935' : dueToday ? '#FB8C00' : 'var(--text-muted)' }}>
              {overdue ? <IconFlag size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} /> : dueToday ? <IconClock size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} /> : <IconCalendar size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />}
              {format(date, 'd MMM', { locale: pl })}
            </span>
          )}
          {todo.recurrence && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: 'var(--sky)22', color: 'var(--sky)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <IconRepeat size={10} /> {RECUR_LABEL[todo.recurrence]}
            </span>
          )}
          {subs.length > 0 && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text-muted)', fontWeight: 600 }}>
              {subsDone}/{subs.length}
            </span>
          )}
        </div>

        {/* Osoby, których dotyczy zadanie */}
        {linkedPeople.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {linkedPeople.map(p => (
              <span key={p.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px 2px 2px', borderRadius: 999,
                background: (p.color || 'var(--accent)') + '18', color: p.color || 'var(--accent)', fontSize: 11, fontWeight: 600,
              }}>
                <PersonBubble person={p} size={18} /> {p.name}
              </span>
            ))}
          </div>
        )}

        {/* Podzadania */}
        {subs.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {subs.map(s => (
              <button key={s.id} type="button" onClick={() => onToggleSubtask?.(todo, s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 5, flexShrink: 0, display: 'grid', placeItems: 'center',
                  border: `1.5px solid ${s.done ? 'var(--income)' : 'var(--border-strong)'}`,
                  background: s.done ? 'var(--income)' : 'transparent', color: '#fff',
                }}>{s.done && <IconCheck size={10} />}</span>
                <span style={{ fontSize: 12, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--text-muted)' : 'var(--text-sub)' }}>{s.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        <button className="t-btn" onClick={onEdit}><IconEdit size={13} /></button>
        <button className="t-btn delete" onClick={() => onDelete(todo.id)}><IconTrash size={13} /></button>
      </div>
    </div>
  )
}

/* ─── Statystyki ─── */
const PERIODS = [
  { id: 'day',   label: 'Dziś' },
  { id: 'week',  label: 'Tydzień' },
  { id: 'month', label: 'Miesiąc' },
  { id: 'year',  label: 'Rok' },
]

function TodoStats({ todos, lists }) {
  const [period, setPeriod] = useState('month')

  const now    = new Date()
  const ranges = {
    day:   { start: startOfDay(now),            end: endOfDay(now) },
    week:  { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
    month: { start: startOfMonth(now),          end: endOfMonth(now) },
    year:  { start: startOfYear(now),           end: endOfYear(now) },
  }
  const range = ranges[period]

  const allActive  = todos.filter(t => !t.done)
  const overdue    = allActive.filter(t => t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate)))
  const dueToday   = allActive.filter(t => t.dueDate && isToday(parseISO(t.dueDate)))

  const doneInPeriod = todos.filter(t => {
    if (!t.done || !t.doneAt) return false
    const d = t.doneAt.toDate ? t.doneAt.toDate() : new Date(t.doneAt)
    return isWithinInterval(d, range)
  })

  const totalInPeriod  = todos.filter(t => {
    const created = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt)
    return created <= range.end
  }).length
  const completionRate = totalInPeriod > 0 ? Math.round((doneInPeriod.length / Math.max(doneInPeriod.length + allActive.length, 1)) * 100) : 0

  const chartData = (() => {
    if (period === 'day') return []
    if (period === 'week' || period === 'month') {
      const days = eachDayOfInterval(range)
      return days.map(d => {
        const count = doneInPeriod.filter(t => {
          const done = t.doneAt.toDate ? t.doneAt.toDate() : new Date(t.doneAt)
          return format(done, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd')
        }).length
        return { label: format(d, period === 'week' ? 'EEE' : 'd', { locale: pl }), count }
      })
    }
    return eachMonthOfInterval(range).map(m => {
      const count = doneInPeriod.filter(t => {
        const done = t.doneAt.toDate ? t.doneAt.toDate() : new Date(t.doneAt)
        return format(done, 'yyyy-MM') === format(m, 'yyyy-MM')
      }).length
      return { label: format(m, 'MMM', { locale: pl }), count }
    })
  })()

  const byList = lists.map(l => ({
    ...l,
    done:   doneInPeriod.filter(t => t.listId === l.id).length,
    active: allActive.filter(t => t.listId === l.id).length,
  })).filter(l => l.done > 0 || l.active > 0)
  const noListDone   = doneInPeriod.filter(t => !t.listId).length
  const noListActive = allActive.filter(t => !t.listId).length

  const byPriority = PRIORITY.map(p => ({
    ...p, count: allActive.filter(t => t.priority === p.id).length
  }))
  const noPriorityCount = allActive.filter(t => !t.priority).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <StatCard value={allActive.length}  label="Aktywnych"       color="var(--text)" />
        <StatCard value={overdue.length}    label="Przeterminowane" color={overdue.length > 0 ? '#E53935' : 'var(--text-muted)'} />
        <StatCard value={dueToday.length}   label="Na dziś"         color={dueToday.length > 0 ? '#FB8C00' : 'var(--text-muted)'} />
      </div>

      <SegTabs items={PERIODS} active={period} onChange={setPeriod} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <StatCard value={doneInPeriod.length} label="Ukończonych" color="var(--income)" big />
        <StatCard value={`${completionRate}%`} label="Ukończono" color="var(--accent)" big />
      </div>

      {chartData.length > 0 && chartData.some(d => d.count > 0) && (
        <div className="chart-section">
          <h3 className="chart-title">Ukończone zadania</h3>
          <BarChartSVG
            height={160}
            accent="var(--income)"
            fmt={(v) => `${v} ukończ.`}
            data={chartData.map((d, i) => ({
              // przy 31 dniach miesiąca pokazuj co drugą etykietę, żeby się nie zlewały
              label: chartData.length > 14 && i % 2 === 1 ? '' : d.label,
              value: d.count,
            }))}
          />
        </div>
      )}

      {(byList.length > 0 || noListDone > 0 || noListActive > 0) && (
        <div className="chart-section">
          <h3 className="chart-title">Według list</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byList.map(l => (
              <ListStatRow key={l.id} icon={l.icon} name={l.name} color={l.color}
                done={l.done} active={l.active} />
            ))}
            {(noListDone > 0 || noListActive > 0) && (
              <ListStatRow icon="IconMore" name="Bez listy" color="var(--text-muted)"
                done={noListDone} active={noListActive} />
            )}
          </div>
        </div>
      )}

      {allActive.length > 0 && (
        <div className="chart-section">
          <h3 className="chart-title">Aktywne według priorytetu</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {byPriority.filter(p => p.count > 0).map(p => (
              <PriorityRow key={p.id} label={p.label} color={p.color} count={p.count} total={allActive.length} />
            ))}
            {noPriorityCount > 0 && (
              <PriorityRow label="Brak" color="var(--text-muted)" count={noPriorityCount} total={allActive.length} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, color, big }) {
  return (
    <div className="card" style={{ padding: big ? '18px 12px' : '14px 10px', textAlign: 'center' }}>
      <div className="serif" style={{ fontSize: big ? 34 : 26, color }}>{value}</div>
      <div className="kicker" style={{ marginTop: 6 }}>{label}</div>
    </div>
  )
}

function ListStatRow({ icon, name, color, done, active }) {
  const total = done + active
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CatIcon categoryId={null} emoji={icon} size={16} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{done} / {total}</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: 'var(--border)' }}>
          <div style={{ height: '100%', borderRadius: 3, background: color === 'var(--text-muted)' ? '#607D8B' : color, width: `${pct}%`, transition: 'width .3s' }} />
        </div>
      </div>
    </div>
  )
}

function PriorityRow({ label, color, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, width: 64 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--border)' }}>
        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 24, textAlign: 'right' }}>{count}</span>
    </div>
  )
}

/* ─── TodoCalendar ─── */
const TC_WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
function TodoCalendar({ todos, lists, onToggle, onEdit, onAddOnDay }) {
  const [month, setMonth]       = useState(new Date())
  const [selected, setSelected] = useState(new Date())

  const listColor = (id) => lists.find(l => l.id === id)?.color || 'var(--sky)'
  const monthStart = startOfMonth(month)
  const allDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  })
  const weeks = []
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7))

  const dated = todos.filter(t => t.dueDate)
  const tasksOn = (day) => dated.filter(t => t.dueDate === format(day, 'yyyy-MM-dd'))

  const selStr   = format(selected, 'yyyy-MM-dd')
  const selTasks = dated.filter(t => t.dueDate === selStr)
    .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || pOrder[a.priority] - pOrder[b.priority])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="icon-btn" onClick={() => setMonth(m => subMonths(m, 1))}><IconChevronLeft size={16} /></button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>
          {format(month, 'LLLL yyyy', { locale: pl })}
        </span>
        <button className="icon-btn" onClick={() => setMonth(m => addMonths(m, 1))}><IconChevronRight size={16} /></button>
      </div>

      {/* Grid */}
      <div>
        <div className="cal-grid" style={{ marginBottom: 2 }}>
          {TC_WEEKDAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0 6px', letterSpacing: '.06em' }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="cal-grid" style={{ marginBottom: 2 }}>
            {week.map(day => {
              const ts       = tasksOn(day)
              const isSel    = isSameDay(day, selected)
              const inMonth  = isSameMonth(day, month)
              const today    = isToday(day)
              return (
                <button key={day.toISOString()} className={`cal-day${isSel ? ' cal-day--sel' : ''}`}
                  onClick={() => setSelected(day)} style={{ opacity: inMonth ? 1 : 0.3 }}>
                  <div className={`cal-day-num${today ? ' today' : isSel ? ' selected' : ''}`}>{getDate(day)}</div>
                  <div className="cal-chips">
                    {ts.slice(0, 3).map(t => {
                      const c = listColor(t.listId)
                      return (
                        <div key={t.id} className="cal-chip" style={{ background: c + '28', borderLeft: `2px solid ${c}`, opacity: t.done ? 0.5 : 1 }}>
                          <span className="cal-chip-dot" style={{ '--dot-color': c }} />
                          <span className="cal-chip-text" style={{ textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</span>
                        </div>
                      )
                    })}
                    {ts.length > 3 && <div className="cal-chip-more">+{ts.length - 3}</div>}
                  </div>
                  {/* Kropki na mobile (chipy tekstowe są ukryte) — zadania widoczne bez klikania */}
                  {ts.length > 0 && (
                    <div className="cal-dots">
                      {ts.slice(0, 5).map(t => (
                        <span key={t.id} className="cal-dot" style={{ background: listColor(t.listId), opacity: t.done ? 0.4 : 1 }} />
                      ))}
                      {ts.length > 5 && <span className="cal-dots-more">+{ts.length - 5}</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Selected day tasks */}
      <div className="cal-day-detail">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize', flex: 1 }}>
            {format(selected, 'EEEE, d MMMM', { locale: pl })}
          </span>
          <button className="t-btn" title="Dodaj zadanie na ten dzień" onClick={() => onAddOnDay(selStr)} style={{ width: 'auto', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <IconCheck size={12} /> Dodaj
          </button>
        </div>
        {selTasks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>Brak zadań na ten dzień</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selTasks.map(t => {
              const c = listColor(t.listId)
              const pc = PRIORITY.find(p => p.id === t.priority)?.color || '#888'
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--surface2)', borderLeft: `3px solid ${c}` }}>
                  <button onClick={() => onToggle(t)} title={t.done ? 'Cofnij' : 'Zrobione'} style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'grid', placeItems: 'center',
                    border: `1.5px solid ${t.done ? 'var(--income)' : 'var(--border-strong)'}`,
                    background: t.done ? 'var(--income)' : 'transparent', color: '#fff',
                  }}>{t.done && <IconCheck size={12} />}</button>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-muted)' : 'var(--text)' }}>{t.title}</span>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: pc, flexShrink: 0 }} title={t.priority} />
                  <button className="t-btn" onClick={() => onEdit(t)}><IconEdit size={13} /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── TodoForm ─── */
function TodoForm({ user, lists, people = [], editData, defaultListId, defaultDueDate, onClose }) {
  const [title, setTitle]       = useState(editData?.title || '')
  const [note, setNote]         = useState(editData?.note || '')
  const [listId, setListId]     = useState(editData?.listId || defaultListId || '')
  const [priority, setPriority] = useState(editData?.priority || 'medium')
  const [dueDate, setDueDate]   = useState(editData?.dueDate || defaultDueDate || '')
  const [recurrence, setRecurrence] = useState(editData?.recurrence || '')
  const [subtasks, setSubtasks] = useState(editData?.subtasks || [])
  const [peopleIds, setPeopleIds] = useState(editData?.peopleIds || [])
  const [subInput, setSubInput] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const togglePerson = (id) => setPeopleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const addSub = () => {
    const t = subInput.trim()
    if (!t) return
    setSubtasks(prev => [...prev, { id: Date.now().toString(36), title: t, done: false }])
    setSubInput('')
  }
  const removeSub = (id) => setSubtasks(prev => prev.filter(s => s.id !== id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Wpisz tytuł zadania'); return }
    setSaving(true)
    const data = {
      title: title.trim(), note: note.trim(),
      listId: listId || null, priority,
      dueDate: dueDate || null,
      recurrence: recurrence || null,
      subtasks,
      peopleIds,
      done: editData?.done ?? false,
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'todos', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'todos'), { ...data, createdAt: Timestamp.now(), doneAt: null })
      }
      onClose()
    } catch { setError('Błąd zapisu'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj zadanie' : 'Nowe zadanie'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Zadanie</label>
            <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)}
              maxLength={100} placeholder="Co trzeba zrobić?" />
          </div>
          <div className="form-group">
            <label>Notatka (opcjonalnie)</label>
            <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)}
              maxLength={200} placeholder="Dodatkowe szczegóły..." />
          </div>
          <div className="form-group">
            <label>Priorytet</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITY.map(p => (
                <button key={p.id} type="button" onClick={() => setPriority(p.id)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: priority === p.id ? 700 : 400,
                  border: `2px solid ${priority === p.id ? p.color : 'var(--border)'}`,
                  background: priority === p.id ? p.color + '22' : 'transparent',
                  color: priority === p.id ? p.color : 'var(--text-muted)'
                }}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Termin (opcjonalnie)</label>
            <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Powtarzanie</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RECURRENCE.map(r => (
                <button key={r.id} type="button" onClick={() => setRecurrence(r.id)} style={{
                  flex: '1 1 auto', minWidth: 70, padding: '8px 0', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: recurrence === r.id ? 700 : 400,
                  border: `1px solid ${recurrence === r.id ? 'var(--sky)' : 'var(--border)'}`,
                  background: recurrence === r.id ? 'var(--sky)22' : 'transparent',
                  color: recurrence === r.id ? 'var(--sky)' : 'var(--text-muted)',
                }}>{r.label}</button>
              ))}
            </div>
            {recurrence && <p style={{ margin: '6px 2px 0', fontSize: 11, color: 'var(--text-muted)' }}>Po odhaczeniu zadanie wróci z kolejnym terminem ({RECUR_LABEL[recurrence]}).</p>}
          </div>

          <div className="form-group">
            <label>Podzadania (opcjonalnie)</label>
            {subtasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {subtasks.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 8, padding: '7px 10px' }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{s.title}</span>
                    <button type="button" className="t-btn delete" onClick={() => removeSub(s.id)}><IconTrash size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" className="form-input" value={subInput} onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSub() } }}
                placeholder="Dodaj krok..." maxLength={100} style={{ flex: 1, margin: 0 }} />
              <button type="button" className="btn-save" style={{ width: 'auto', margin: 0, padding: '0 14px' }} onClick={addSub}><IconPlus size={16} /></button>
            </div>
          </div>

          {people.length > 0 && (
            <div className="form-group">
              <label>Osoby, których dotyczy (opcjonalnie)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {people.map(p => {
                  const on = peopleIds.includes(p.id)
                  return (
                    <button type="button" key={p.id} onClick={() => togglePerson(p.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 5px', borderRadius: 999,
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                      border: `1px solid ${on ? (p.color || 'var(--accent)') : 'var(--border)'}`,
                      background: on ? (p.color || 'var(--accent)') + '1e' : 'var(--surface2)',
                      color: on ? (p.color || 'var(--accent)') : 'var(--text-sub)',
                    }}>
                      <PersonBubble person={p} size={24} />
                      {p.name}
                      {on && <IconCheck size={13} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {lists.length > 0 && (
            <div className="form-group">
              <label>Lista</label>
              <div className="account-chips">
                <button type="button" className={`account-chip ${!listId ? 'active' : ''}`} onClick={() => setListId('')}>Bez listy</button>
                {lists.map(l => (
                  <button key={l.id} type="button"
                    className={`account-chip ${listId === l.id ? 'active' : ''}`}
                    style={listId === l.id ? { borderColor: l.color, background: l.color + '22' } : {}}
                    onClick={() => setListId(l.id)}><CatIcon categoryId={null} emoji={l.icon} size={13} /> {l.name}</button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj zadanie'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── ListForm (create + edit) ─── */
function ListForm({ user, onClose, editData }) {
  const [name, setName]         = useState(editData?.name || '')
  const [iconKey, setIconKey]   = useState(editData?.icon || 'IcBriefcase')
  const [iconSearch, setIconSearch] = useState('')
  const [color, setColor]       = useState(editData?.color || '#6366f1')
  const [saving, setSaving]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const filteredIcons = iconSearch.trim()
    ? ICON_CATALOG.filter(ic => ic.label.toLowerCase().includes(iconSearch.toLowerCase()) || ic.group.toLowerCase().includes(iconSearch.toLowerCase()))
    : ICON_CATALOG

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    if (editData) {
      await updateDoc(doc(db, 'users', user.uid, 'todoLists', editData.id), {
        name: name.trim(), icon: iconKey, color
      })
    } else {
      await addDoc(collection(db, 'users', user.uid, 'todoLists'), {
        name: name.trim(), icon: iconKey, color, createdAt: Timestamp.now()
      })
    }
    onClose()
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await deleteDoc(doc(db, 'users', user.uid, 'todoLists', editData.id))
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj listę' : 'Nowa lista'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Nazwa</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)}
              placeholder="np. Praca, Dom, Projekt..." maxLength={30} />
          </div>
          <div className="form-group">
            <label>Ikona</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color, border: `2px solid ${color}` }}>
                <CatIcon categoryId={null} emoji={iconKey} size={22} />
              </div>
              <input type="text" className="form-input" value={iconSearch} onChange={e => setIconSearch(e.target.value)}
                placeholder="Szukaj ikony..." style={{ margin: 0, flex: 1 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
              {filteredIcons.map(ic => (
                <button key={ic.key} type="button"
                  onClick={() => setIconKey(ic.key)}
                  title={ic.label}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    border: `2px solid ${iconKey === ic.key ? color : 'var(--border)'}`,
                    background: iconKey === ic.key ? color + '22' : 'transparent',
                    color: iconKey === ic.key ? color : 'var(--text-muted)', padding: 0
                  }}>
                  <CatIcon categoryId={null} emoji={ic.key} size={17} />
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Kolor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {LIST_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: `3px solid ${color === c ? 'var(--text)' : 'transparent'}`
                }} />
              ))}
            </div>
          </div>
          <button type="submit" className="btn-save" disabled={saving || !name.trim()}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Utwórz listę'}
          </button>
          {editData && (
            <button type="button" onClick={handleDelete} style={{
              width: '100%', padding: 12, borderRadius: 'var(--r)', border: `1px solid ${confirmDelete ? 'var(--expense)' : 'var(--border)'}`,
              background: confirmDelete ? 'var(--expense)22' : 'transparent', color: confirmDelete ? 'var(--expense)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 14, marginTop: 4,
            }}>
              {confirmDelete ? 'Kliknij ponownie aby potwierdzić usunięcie' : 'Usuń listę'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
