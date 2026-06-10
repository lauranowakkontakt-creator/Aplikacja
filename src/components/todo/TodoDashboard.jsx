import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  format, isPast, isToday, parseISO,
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval, isWithinInterval
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ICON_CATALOG, CatIcon, IconEdit, IconTrash, IconClose, IconChart, IconCheck, IconSearch, IconMore, IconFlag } from '../Icons'
import { Ring } from '../ChartPrimitives'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'

const PRIORITY = [
  { id: 'high',   label: 'Wysoki',  color: '#E53935' },
  { id: 'medium', label: 'Średni',  color: '#FB8C00' },
  { id: 'low',    label: 'Niski',   color: '#43A047' },
]
const LIST_ICONS  = [
  '📁','🏠','💼','📚','🛒','💪','✈️','🎯','❤️','🌱',
  '💡','🎨','🔧','📝','🎵','🌍','🏋️','🍕','☕','🐾',
  '💰','🎮','🎬','📷','🚗','🧘','🏃','🧹','💊','🌺',
  '⭐','🔑','📅','💌','🏆','🎁','🌙','☀️','🔥','💎',
  '🧠','⚽','🎸','📱','💻','🏠','🌿','🦋','🍀','🎉',
  '🙏','✝️','🕊️','📖','⚡','🎭','🌊','🏔️','🦁','🌸',
]
const LIST_COLORS = [
  '#C94B28','#E05A2B','#F97316','#F59E0B','#EAB308','#84CC16',
  '#22C55E','#10B981','#14B8A6','#06B6D4','#3B82F6','#6366F1',
  '#8B5CF6','#A855F7','#EC4899','#F43F5E','#64748B','#6B7280',
  '#059669','#0EA5E9','#DC2626','#7C3AED','#0D9488','#4F46E5',
  '#BE185D','#6B9E72','#4A90D9','#1ABC9C','#E74C3C','#92400E',
]
const pOrder      = { high: 0, medium: 1, low: 2 }

const kicker = (t) => (
  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 10 }}>{t}</div>
)

export default function TodoDashboard({ user }) {
  const [todos, setTodos]           = useState([])
  const [lists, setLists]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('tasks')
  const [activeList, setActiveList] = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [editTodo, setEditTodo]     = useState(null)
  const [showDone, setShowDone]     = useState(false)
  const [showListForm, setShowListForm] = useState(false)
  const [editList, setEditList]       = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMenu, setShowMenu]     = useState(false)
  const [quickInput, setQuickInput] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'todos'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => { setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) })
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'todoLists'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setLists(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const toggleDone = async (todo) => {
    await updateDoc(doc(db, 'users', user.uid, 'todos', todo.id), {
      done: !todo.done, doneAt: todo.done ? null : Timestamp.now(), updatedAt: Timestamp.now()
    })
  }

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć zadanie?' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'todos', id))
  }

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!quickInput.trim()) return
    await addDoc(collection(db, 'users', user.uid, 'todos'), {
      title: quickInput.trim(), note: '', listId: activeList || null,
      priority: 'medium', dueDate: null, done: false,
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(), doneAt: null
    })
    setQuickInput('')
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

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const activeListObj = lists.find(l => l.id === activeList)
  const headerTitle = activeListObj ? activeListObj.name : 'Zadania'
  const activeListColor = activeListObj?.color || 'var(--sky)'

  const dueToday = active.filter(t => t.dueDate && isToday(parseISO(t.dueDate)))
  const highCount = active.filter(t => t.priority === 'high').length
  const totalForList = byList.length
  const doneForList = byList.filter(t => t.done).length
  const pct = totalForList > 0 ? Math.round((doneForList / totalForList) * 100) : 0

  return (
    <div className="todo-dashboard">
      {/* Mobile module header */}
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">To-do</div>
          <div className="mod-header-title">{headerTitle}</div>
        </div>
        <div className="mod-header-right" style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => { setShowSearch(s => !s); setSearchQuery('') }}
            style={showSearch ? { color: 'var(--primary)' } : {}}>
            <IconSearch size={16} />
          </button>
          <button className="icon-btn" onClick={() => setShowMenu(m => !m)}><IconMore size={16} /></button>
          {showMenu && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 10, padding: '6px 0',
              minWidth: 180, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }} onClick={() => setShowMenu(false)}>
              <button style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text)' }}
                onClick={() => { setShowDone(v => !v) }}>
                {showDone ? '✓ ' : ''}Ukończone zadania
              </button>
              <button style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text)' }}
                onClick={() => { setShowListForm(true) }}>
                + Nowa lista
              </button>
            </div>
          )}
        </div>
      </div>

      {showSearch && (
        <div style={{ padding: '0 0 12px' }}>
          <input autoFocus className="form-input" placeholder="Szukaj zadań..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} style={{ margin: 0 }} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
        <button onClick={() => setTab('tasks')}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 13, fontWeight: tab === 'tasks' ? 700 : 400,
            background: tab === 'tasks' ? 'var(--surface3)' : 'transparent',
            color: tab === 'tasks' ? 'var(--text)' : 'var(--text-muted)',
            border: tab === 'tasks' ? '1px solid var(--border-strong)' : '1px solid transparent',
            cursor: 'pointer',
          }}
        >Zadania</button>
        <button onClick={() => setTab('stats')}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 13, fontWeight: tab === 'stats' ? 700 : 400,
            background: tab === 'stats' ? 'var(--surface3)' : 'transparent',
            color: tab === 'stats' ? 'var(--text)' : 'var(--text-muted)',
            border: tab === 'stats' ? '1px solid var(--border-strong)' : '1px solid transparent',
            cursor: 'pointer',
          }}
        ><IconChart size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Statystyki</button>
      </div>

      {tab === 'stats' ? (
        <TodoStats todos={todos} lists={lists} />
      ) : (
        <>
          {/* List chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <button
              onClick={() => setActiveList(null)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 12, cursor: 'pointer', fontWeight: !activeList ? 700 : 400,
                border: `1px solid ${!activeList ? 'var(--sky)' : 'var(--border)'}`,
                background: !activeList ? 'var(--sky)22' : 'transparent',
                color: !activeList ? 'var(--sky)' : 'var(--text-muted)',
              }}
            >
              Wszystkie
              {todos.filter(t => !t.done).length > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--surface3)', borderRadius: 99, padding: '1px 6px' }}>
                  {todos.filter(t => !t.done).length}
                </span>
              )}
            </button>
            {lists.map(l => {
              const cnt = todos.filter(t => !t.done && t.listId === l.id).length
              const isActive = activeList === l.id
              return (
                <button key={l.id}
                  onClick={() => setActiveList(l.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 99, fontSize: 12, cursor: 'pointer', fontWeight: isActive ? 700 : 400,
                    border: `1px solid ${isActive ? l.color : 'var(--border)'}`,
                    background: isActive ? l.color + '22' : 'transparent',
                    color: isActive ? l.color : 'var(--text-muted)',
                  }}
                >
                  <CatIcon categoryId={null} emoji={l.icon} size={12} /> {l.name}
                  {cnt > 0 && <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--surface3)', borderRadius: 99, padding: '1px 6px' }}>{cnt}</span>}
                  {isActive && <span onClick={e => { e.stopPropagation(); setEditList(l) }} style={{ marginLeft: 4, opacity: 0.6, fontSize: 11 }}>✏️</span>}
                </button>
              )
            })}
            <button
              onClick={() => setShowListForm(true)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)',
              }}
            >+ Lista</button>
          </div>

          {/* Summary card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: activeListColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconFlag size={20} style={{ color: activeListColor }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{active.length} {active.length === 1 ? 'zadanie' : 'zadań'} do zrobienia</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {highCount > 0 ? `${highCount} z wysokim priorytetem` : 'brak pilnych'}
              </div>
            </div>
            <Ring value={pct} size={52} thickness={6} color="var(--sky)" />
          </div>

          {/* Active tasks */}
          {active.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Aktywne</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {active.map(todo => (
                  <TodoItem key={todo.id} todo={todo} lists={lists}
                    onToggle={toggleDone}
                    onEdit={() => { setEditTodo(todo); setShowForm(true) }}
                    onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {active.length === 0 && done.length === 0 && (
            <div className="list-empty">
              <p>Brak zadań</p>
              <p className="list-empty-hint">Wpisz poniżej aby dodać pierwsze zadanie</p>
            </div>
          )}

          {/* Done tasks */}
          {done.length > 0 && (
            <div style={{ marginBottom: 80 }}>
              <button onClick={() => setShowDone(v => !v)} style={{
                fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 6
              }}>
                {showDone ? '▾' : '▸'} Zrobione ({done.length})
              </button>
              {showDone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.55 }}>
                  {done.map(todo => (
                    <TodoItem key={todo.id} todo={todo} lists={lists}
                      onToggle={toggleDone}
                      onEdit={() => { setEditTodo(todo); setShowForm(true) }}
                      onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sticky quick-add */}
          <div style={{
            position: 'sticky', bottom: 0, background: 'var(--bg)', paddingBottom: 12, paddingTop: 8,
            borderTop: '1px solid var(--border)', marginTop: 8,
          }}>
            <form onSubmit={handleQuickAdd}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 14px',
              }}>
                <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>+</span>
                <input
                  value={quickInput}
                  onChange={e => setQuickInput(e.target.value)}
                  placeholder="Dodaj zadanie..."
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text)' }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4 }}>↵</span>
              </div>
            </form>
          </div>
        </>
      )}

      {showForm && (
        <TodoForm user={user} lists={lists} editData={editTodo} defaultListId={activeList}
          onClose={() => { setShowForm(false); setEditTodo(null) }} />
      )}
      {showListForm && <ListForm user={user} onClose={() => setShowListForm(false)} />}
      {editList && <ListForm user={user} onClose={() => setEditList(null)} editData={editList} />}
    </div>
  )
}

/* ─── TodoItem ─── */
function TodoItem({ todo, lists, onToggle, onEdit, onDelete }) {
  const list     = lists.find(l => l.id === todo.listId)
  const priority = PRIORITY.find(p => p.id === todo.priority)
  const date     = todo.dueDate ? parseISO(todo.dueDate) : null
  const overdue  = date && isPast(date) && !isToday(date) && !todo.done
  const dueToday = date && isToday(date) && !todo.done
  const listColor = list?.color || 'var(--border)'

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      {/* Checkbox */}
      <button onClick={() => onToggle(todo)} style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
        border: `2px solid ${todo.done ? 'var(--income)' : list ? listColor : priority?.color || 'var(--border)'}`,
        background: todo.done ? 'var(--income)' : 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11
      }}>{todo.done ? <IconCheck size={12} /> : ''}</button>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 14, fontWeight: 600,
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
              {overdue ? '⚠ ' : dueToday ? '⏰ ' : '📅 '}
              {format(date, 'd MMM', { locale: pl })}
            </span>
          )}
        </div>
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

      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
        {PERIODS.map(p => (
          <button key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 13, fontWeight: period === p.id ? 700 : 400,
              background: period === p.id ? 'var(--surface3)' : 'transparent',
              color: period === p.id ? 'var(--text)' : 'var(--text-muted)',
              border: period === p.id ? '1px solid var(--border-strong)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >{p.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <StatCard value={doneInPeriod.length} label="Ukończonych" color="var(--income)" big />
        <StatCard value={`${completionRate}%`} label="Ukończono" color="var(--primary)" big />
      </div>

      {chartData.length > 0 && chartData.some(d => d.count > 0) && (
        <div className="chart-section">
          <h3 className="chart-title">Ukończone zadania</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                formatter={v => [v, 'Ukończone']}
              />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {chartData.map((_, i) => <Cell key={i} fill="var(--income)" fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
              <ListStatRow icon="📌" name="Bez listy" color="var(--text-muted)"
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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: big ? '16px 12px' : '12px 10px', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: big ? 28 : 22, fontWeight: 700, color }}>{value}</p>
      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
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

/* ─── TodoForm ─── */
function TodoForm({ user, lists, editData, defaultListId, onClose }) {
  const [title, setTitle]       = useState(editData?.title || '')
  const [note, setNote]         = useState(editData?.note || '')
  const [listId, setListId]     = useState(editData?.listId || defaultListId || '')
  const [priority, setPriority] = useState(editData?.priority || 'medium')
  const [dueDate, setDueDate]   = useState(editData?.dueDate || '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Wpisz tytuł zadania'); return }
    setSaving(true)
    const data = {
      title: title.trim(), note: note.trim(),
      listId: listId || null, priority,
      dueDate: dueDate || null,
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
              autoFocus maxLength={100} placeholder="Co trzeba zrobić?" />
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
  const [iconKey, setIconKey]   = useState(editData?.icon || 'IcFolder')
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
              autoFocus placeholder="np. Praca, Dom, Projekt..." maxLength={30} />
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
