import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO,
  addMonths, subMonths, getDate
} from 'date-fns'
import { pl } from 'date-fns/locale'

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

const CAT_ICONS   = ['💼','🏠','❤️','🎉','📚','💪','👨‍👩‍👧','🤝','✈️','💰','🙏','📌','🎵','🍽️','🎬','🏥','🎓','🛒','🌿','⚽','🎨','🔧','📞','🎂','🚗','💊','📸','🌙','☀️','🎯']
const CAT_COLORS  = ['#C94B28','#3b82f6','#10b981','#ef4444','#f59e0b','#8b5cf6','#14b8a6','#ec4899','#6366f1','#84cc16','#a78bfa','#607D8B']
const WEEKDAYS    = ['Pn','Wt','Śr','Cz','Pt','So','Nd']

const findCat   = (cats, id) => cats.find(c => c.id === id)
const getCatColor = (cats, e) => findCat(cats, e.categoryId)?.color || e.color || '#607D8B'

export default function CalendarDashboard({ user }) {
  const [events, setEvents]       = useState([])
  const [todos, setTodos]         = useState([])
  const [payments, setPayments]   = useState([])
  const [categories, setCategories] = useState([])
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

  const eventsOnDay   = (day) => events.filter(e => e.date === format(day, 'yyyy-MM-dd'))
  const todosOnDay    = (day) => todos.filter(t => t.dueDate === format(day, 'yyyy-MM-dd'))
  const paymentsOnDay = (day) => payments.filter(p => p.dayOfMonth === getDate(day))

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div className="calendar-dashboard">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="habit-view-tabs" style={{ flex: 1 }}>
          <button className={`habit-view-tab ${tab === 'month'  ? 'active' : ''}`} onClick={() => setTab('month')}>📅 Miesiąc</button>
          <button className={`habit-view-tab ${tab === 'agenda' ? 'active' : ''}`} onClick={() => setTab('agenda')}>📋 Agenda</button>
        </div>
        <button className="cal-nav-btn" style={{ fontSize: 13, padding: '5px 10px', whiteSpace: 'nowrap' }}
          onClick={() => setShowCatMgr(true)}>🏷 Kategorie</button>
      </div>

      {tab === 'month' ? (
        <>
          <MonthView
            currentMonth={currentMonth} selectedDay={selectedDay} categories={categories}
            onDayClick={handleDayClick}
            onPrev={() => setCurrentMonth(m => subMonths(m, 1))}
            onNext={() => setCurrentMonth(m => addMonths(m, 1))}
            onToday={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()) }}
            eventsOnDay={eventsOnDay} todosOnDay={todosOnDay} paymentsOnDay={paymentsOnDay}
          />
          <DayDetail
            day={selectedDay} categories={categories}
            events={eventsOnDay(selectedDay)} todos={todosOnDay(selectedDay)} payments={paymentsOnDay(selectedDay)}
            onAdd={() => { setEditEvent(null); setShowForm(true) }}
            onEdit={e => { setEditEvent(e); setShowForm(true) }}
            onDelete={handleDelete}
          />
        </>
      ) : (
        <AgendaView
          events={events} categories={categories}
          onAdd={() => { setEditEvent(null); setShowForm(true) }}
          onEdit={e => { setEditEvent(e); setShowForm(true) }}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <EventForm user={user} editData={editEvent} categories={categories}
          defaultDate={format(selectedDay, 'yyyy-MM-dd')}
          onClose={() => { setShowForm(false); setEditEvent(null) }} />
      )}

      {showCatMgr && (
        <CategoryManager user={user} categories={categories} onClose={() => setShowCatMgr(false)} />
      )}
    </div>
  )
}

/* ─── MonthView ─── */
function MonthView({ currentMonth, selectedDay, categories, onDayClick, onPrev, onNext, onToday, eventsOnDay, todosOnDay, paymentsOnDay }) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const days       = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end:   endOfWeek(monthEnd,     { weekStartsOn: 1 })
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button className="cal-nav-btn" onClick={onPrev}>‹</button>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>
          {format(currentMonth, 'LLLL yyyy', { locale: pl })}
        </p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="cal-nav-btn" style={{ fontSize: 12, padding: '5px 10px' }} onClick={onToday}>Dziś</button>
          <button className="cal-nav-btn" onClick={onNext}>›</button>
        </div>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0 6px' }}>{d}</div>
        ))}
        {days.map(day => {
          const evts = eventsOnDay(day)
          const tdos = todosOnDay(day)
          const pmts = paymentsOnDay(day)
          const isSelected = isSameDay(day, selectedDay)
          const inMonth    = isSameMonth(day, currentMonth)
          const today      = isToday(day)
          const dots = [
            ...evts.slice(0, 2).map(e => getCatColor(categories, e)),
            ...(tdos.length > 0 ? ['#6366f1'] : []),
            ...(pmts.length > 0 ? ['#f59e0b'] : []),
          ].slice(0, 3)

          return (
            <button key={day.toISOString()} className="cal-day" onClick={() => onDayClick(day)}
              style={{ opacity: inMonth ? 1 : 0.28 }}>
              <div className={`cal-day-num${today ? ' today' : isSelected ? ' selected' : ''}`}>
                {getDate(day)}
              </div>
              {dots.length > 0 && (
                <div className="cal-dots">
                  {dots.map((c, i) => <div key={i} className="cal-dot" style={{ background: c }} />)}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── DayDetail ─── */
function DayDetail({ day, events, todos, payments, categories, onAdd, onEdit, onDelete }) {
  return (
    <div className="cal-day-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
          <span style={{ textTransform: 'capitalize' }}>{format(day, 'EEEE, d MMMM', { locale: pl })}</span>
          {isToday(day) && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--primary)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>DZIŚ</span>}
        </p>
        <button className="btn-add-habit" style={{ padding: '5px 12px', fontSize: 12 }} onClick={onAdd}>+ Dodaj</button>
      </div>

      {events.length === 0 && todos.length === 0 && payments.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '8px 0' }}>Brak wydarzeń</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {events.map(e => <EventRow key={e.id} e={e} categories={categories} onEdit={onEdit} onDelete={onDelete} />)}
          {todos.map(t => (
            <div key={t.id} className="cal-event-row" style={{ borderLeftColor: '#6366f1', opacity: 0.8 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>
                {t.title} <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>TERMIN ZADANIA</span>
              </p>
            </div>
          ))}
          {payments.map(p => (
            <div key={p.id} className="cal-event-row" style={{ borderLeftColor: '#f59e0b', opacity: 0.8 }}>
              <span style={{ fontSize: 14 }}>{p.categoryIcon || '🔄'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{p.name}</p>
                <p style={{ margin: '1px 0 0', fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>REGULARNA PŁATNOŚĆ</p>
              </div>
            </div>
          ))}
        </div>
      )}
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
                <button className="t-btn delete" onClick={() => onDelete(e.id)}>🗑️</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

/* ─── EventRow (shared) ─── */
function EventRow({ e, categories, onEdit, onDelete }) {
  const cat = findCat(categories, e.categoryId)
  return (
    <div className="cal-event-row" style={{ borderLeftColor: getCatColor(categories, e) }}>
      {cat && (
        <div style={{ width: 28, height: 28, borderRadius: 8, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
          {cat.icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{e.title}</p>
        {cat && <p style={{ margin: '1px 0 0', fontSize: 10, color: cat.color, fontWeight: 600 }}>{cat.label}</p>}
        {e.startTime && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>🕐 {e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</p>}
        {e.note && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{e.note}</p>}
      </div>
      <button className="t-btn" onClick={() => onEdit(e)}>✏️</button>
      <button className="t-btn delete" onClick={() => onDelete(e.id)}>🗑️</button>
    </div>
  )
}

/* ─── EventForm ─── */
function EventForm({ user, editData, defaultDate, categories, onClose }) {
  const [title, setTitle]           = useState(editData?.title || '')
  const [date, setDate]             = useState(editData?.date || defaultDate)
  const [startTime, setStartTime]   = useState(editData?.startTime || '')
  const [endTime, setEndTime]       = useState(editData?.endTime || '')
  const [note, setNote]             = useState(editData?.note || '')
  const [categoryId, setCategoryId] = useState(editData?.categoryId || '')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const selectedCat = findCat(categories, categoryId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Wpisz tytuł'); return }
    if (!date) { setError('Wybierz datę'); return }
    setSaving(true)
    const data = {
      title: title.trim(), date,
      startTime: startTime || null, endTime: endTime || null,
      note: note.trim(),
      categoryId: categoryId || null,
      categoryIcon: selectedCat?.icon || null,
      color: selectedCat?.color || '#607D8B',
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
          <button className="modal-close" onClick={onClose}>✕</button>
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
                  <span className="cal-cat-icon" style={categoryId === cat.id ? { background: cat.color + '33' } : {}}>{cat.icon}</span>
                  <span className="cal-cat-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Data</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
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
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form">
          {/* Existing categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface2, rgba(255,255,255,.04))', borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{cat.icon}</div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat.label}</span>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <button className="t-btn delete" onClick={() => handleDelete(cat.id)}>🗑️</button>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />

          {/* Add new */}
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700 }}>Dodaj kategorię</p>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Nazwa</label>
              <input type="text" className="form-input" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="np. Wakacje, Projekt..." maxLength={30} autoFocus />
            </div>
            <div className="form-group">
              <label>Ikona</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {CAT_ICONS.map(i => (
                  <button key={i} type="button" onClick={() => setIcon(i)} style={{
                    width: 34, height: 34, borderRadius: 8, fontSize: 17, cursor: 'pointer',
                    border: `2px solid ${icon === i ? 'var(--primary)' : 'var(--border)'}`,
                    background: icon === i ? 'rgba(201,75,40,0.1)' : 'transparent'
                  }}>{i}</button>
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
