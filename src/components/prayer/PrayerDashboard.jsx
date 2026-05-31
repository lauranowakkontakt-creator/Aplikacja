import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, parseISO, isToday, isBefore, startOfDay, subDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CatIcon, IconEdit, IconTrash, IconClose, IconPrayer, IconUsers, IconBook, IconChart, IconFlame, IconCheck } from '../Icons'

const PRAYER_CATS = [
  { id: 'personal',  label: 'Osobiste',      icon: '🙏', color: '#8b5cf6' },
  { id: 'family',    label: 'Rodzina',        icon: '❤️', color: '#ec4899' },
  { id: 'others',    label: 'Za innych',      icon: '🤝', color: '#3b82f6' },
  { id: 'thanks',    label: 'Dziękczynienie', icon: '🙌', color: '#f59e0b' },
  { id: 'health',    label: 'Zdrowie',        icon: '💊', color: '#ef4444' },
  { id: 'work',      label: 'Praca/Nauka',    icon: '💼', color: '#10b981' },
  { id: 'spiritual', label: 'Duchowe',        icon: '✝️', color: '#C94B28' },
  { id: 'general',   label: 'Ogólne',         icon: '🌍', color: '#607D8B' },
]

const PRIORITY_CFG = [
  { v: 5, label: 'Krytyczny', color: '#ef4444' },
  { v: 4, label: 'Wysoki',    color: '#f97316' },
  { v: 3, label: 'Średni',    color: '#f59e0b' },
  { v: 2, label: 'Niski',     color: '#3b82f6' },
  { v: 1, label: 'Minimalny', color: '#9E9E9E' },
]

const PERSON_ICONS = ['👤','👨','👩','👴','👵','👦','👧','👨‍👩‍👧','💑','👫','🧑','👶','🧑‍💼','🧑‍🏫','🧑‍⚕️','🙋','🫂','❤️','🌟','🕊️']

const findCat  = (id) => PRAYER_CATS.find(c => c.id === id)
const findPrio = (v)  => PRIORITY_CFG.find(p => p.v === v)
const TODAY    = () => format(new Date(), 'yyyy-MM-dd')

export default function PrayerDashboard({ user }) {
  const [intentions, setIntentions] = useState([])
  const [people, setPeople]         = useState([])
  const [sessions, setSessions]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('intentions')

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'prayerIntentions'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, async snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Auto-expire intentions past deadline
      const today = TODAY()
      for (const item of list) {
        if (item.status === 'active' && item.deadline && item.deadline < today) {
          await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
            status: 'ended', endedAt: Timestamp.now(), endedNote: 'Termin modlitwy minął'
          })
        }
      }
      setIntentions(list)
      setLoading(false)
    })
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'prayerPeople'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'prayerSessions'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const TAB_TITLES = { intentions: 'Intencje', people: 'Osoby', journal: 'Dziennik', stats: 'Statystyki' }

  // Stats for tiles
  const activeIntentions = intentions.filter(i => i.status === 'active').length
  const totalSessions = sessions.length
  const streak = (() => {
    let s = 0
    const today = format(new Date(), 'yyyy-MM-dd')
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      if (d > today) continue
      if (sessions.some(s => s.date === d)) s++
      else if (d < today) break
    }
    return s
  })()

  return (
    <div className="prayer-dashboard">
      {/* Mobile module header */}
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Modlitwa</div>
          <div className="mod-header-title">{TAB_TITLES[tab]}</div>
        </div>
        <div className="mod-header-right">
          <button className="icon-btn" onClick={() => setTab('journal')} title="Dziennik"><IconBook size={16} /></button>
        </div>
      </div>

      {/* Verse card */}
      <div className="prayer-verse-card">
        <div className="prayer-verse-kicker">Werset dnia · {format(new Date(), 'd.MM', { locale: pl })}</div>
        <p className="prayer-verse-text">"Bądź cicho przed Panem<br />i czekaj cierpliwie na Niego."</p>
        <div className="prayer-verse-ref">— Psalm 37,7</div>
      </div>

      {/* Stat tiles */}
      <div className="prayer-stat-tiles">
        <div className="prayer-stat-tile">
          <IconFlame size={16} style={{ color: 'var(--primary)' }} />
          <div className="prayer-stat-num">{streak}</div>
          <div className="prayer-stat-lbl">Dni z rzędu</div>
        </div>
        <div className="prayer-stat-tile">
          <IconCheck size={16} style={{ color: 'var(--expense)' }} />
          <div className="prayer-stat-num">{totalSessions}</div>
          <div className="prayer-stat-lbl">Modlitw</div>
        </div>
        <div className="prayer-stat-tile">
          <IconPrayer size={16} style={{ color: 'var(--warn)' }} />
          <div className="prayer-stat-num">{activeIntentions}</div>
          <div className="prayer-stat-lbl">Intencji</div>
        </div>
      </div>

      <div className="habit-view-tabs">
        <button className={`habit-view-tab ${tab === 'intentions' ? 'active' : ''}`} onClick={() => setTab('intentions')}><IconPrayer size={14} /> Intencje</button>
        <button className={`habit-view-tab ${tab === 'people'     ? 'active' : ''}`} onClick={() => setTab('people')}><IconUsers size={14} /> Osoby</button>
        <button className={`habit-view-tab ${tab === 'journal'    ? 'active' : ''}`} onClick={() => setTab('journal')}><IconBook size={14} /> Dziennik</button>
        <button className={`habit-view-tab ${tab === 'stats'      ? 'active' : ''}`} onClick={() => setTab('stats')}><IconChart size={14} /> Statystyki</button>
      </div>

      {tab === 'intentions' && <IntentionsView user={user} intentions={intentions} people={people} />}
      {tab === 'people'     && <PeopleView     user={user} people={people} intentions={intentions} />}
      {tab === 'journal'    && <JournalView    user={user} sessions={sessions} />}
      {tab === 'stats'      && <StatsView      sessions={sessions} intentions={intentions} people={people} />}
    </div>
  )
}

/* ─── IntentionsView ─── */
function IntentionsView({ user, intentions, people }) {
  const [filterPerson, setFilterPerson] = useState(null)
  const [filterCat, setFilterCat]       = useState(null)
  const [showForm, setShowForm]         = useState(false)
  const [editItem, setEditItem]         = useState(null)
  const [endItem, setEndItem]           = useState(null)
  const [showEnded, setShowEnded]       = useState(false)

  const active = intentions
    .filter(i => i.status === 'active' || !i.status)
    .filter(i => !filterPerson || i.personId === filterPerson)
    .filter(i => !filterCat    || i.categoryId === filterCat)
    .sort((a, b) => (b.priority || 3) - (a.priority || 3))

  const ended = intentions.filter(i => i.status === 'ended' || i.status === 'answered')

  const urgent    = active.filter(i => (i.priority || 3) === 5)
  const nonUrgent = active.filter(i => (i.priority || 3) !== 5)

  const handleDelete = async (id) => {
    if (!confirm('Usunąć intencję?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'prayerIntentions', id))
  }

  const handleEnd = async (id, note) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', id), {
      status: 'ended', endedAt: Timestamp.now(), endedNote: note || ''
    })
    setEndItem(null)
  }

  const togglePrayedToday = async (item) => {
    const today = TODAY()
    const prayed = item.prayedDates?.includes(today)
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      prayedDates: prayed ? arrayRemove(today) : arrayUnion(today)
    })
  }

  const usedPeople = people.filter(p => active.some(i => i.personId === p.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary chips */}
      {intentions.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{active.filter(i => !filterPerson && !filterCat).length}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Aktywnych</p>
          </div>
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{intentions.filter(i => (i.status === 'active' || !i.status) && (i.priority || 3) === 5).length}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Pilnych</p>
          </div>
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{intentions.filter(i => i.prayedDates?.includes(TODAY())).length}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Dziś</p>
          </div>
        </div>
      )}

      {/* Filter by person */}
      {usedPeople.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button className={`todo-list-chip ${!filterPerson ? 'active' : ''}`} onClick={() => setFilterPerson(null)}>Wszyscy</button>
          {usedPeople.map(p => (
            <button key={p.id}
              className={`todo-list-chip ${filterPerson === p.id ? 'active' : ''}`}
              onClick={() => { setFilterPerson(filterPerson === p.id ? null : p.id); setFilterCat(null) }}>
              {p.icon || '👤'} {p.name}
            </button>
          ))}
        </div>
      )}

      <button className="btn-add-habit" onClick={() => { setEditItem(null); setShowForm(true) }}>
        + Dodaj intencję
      </button>

      {/* Priority 5 — urgent banner */}
      {urgent.length > 0 && (
        <div style={{ border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.06)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '.05em' }}>🔴 Pilne intencje</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {urgent.map(item => <IntentionCard key={item.id} item={item} people={people} onTogglePrayed={togglePrayedToday} onEnd={() => setEndItem(item)} onEdit={() => { setEditItem(item); setShowForm(true) }} onDelete={handleDelete} />)}
          </div>
        </div>
      )}

      {/* Regular active */}
      {nonUrgent.length === 0 && urgent.length === 0 && ended.length === 0 ? (
        <div className="list-empty">
          <p>Brak intencji</p>
          <p className="list-empty-hint">Dodaj pierwszą intencję modlitewną</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {nonUrgent.map(item => <IntentionCard key={item.id} item={item} people={people} onTogglePrayed={togglePrayedToday} onEnd={() => setEndItem(item)} onEdit={() => { setEditItem(item); setShowForm(true) }} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Ended section */}
      {ended.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button className="todo-done-toggle" onClick={() => setShowEnded(v => !v)}>
            {showEnded ? '▾' : '▸'} Zakończone ({ended.length})
          </button>
          {showEnded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {ended.map(item => {
                const cat    = findCat(item.categoryId)
                const person = people.find(p => p.id === item.personId)
                return (
                  <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', opacity: 0.65 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 18 }}>{item.status === 'answered' ? '🙌' : '✅'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{item.title}</p>
                        {person && <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{person.icon || '👤'} {person.name}</p>}
                        {item.endedNote && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{item.endedNote}"</p>}
                        {item.endedAt && <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{format(item.endedAt?.toDate?.() || new Date(), 'd MMM yyyy', { locale: pl })}</p>}
                      </div>
                      <button className="t-btn delete" onClick={() => handleDelete(item.id)}><IconTrash size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {showForm && <IntentionForm user={user} editData={editItem} people={people} onClose={() => { setShowForm(false); setEditItem(null) }} />}
      {endItem   && <EndModal item={endItem} onConfirm={(note) => handleEnd(endItem.id, note)} onClose={() => setEndItem(null)} />}
    </div>
  )
}

/* ─── IntentionCard ─── */
function IntentionCard({ item, people, onTogglePrayed, onEnd, onEdit, onDelete }) {
  const cat    = findCat(item.categoryId)
  const prio   = findPrio(item.priority || 3)
  const person = people.find(p => p.id === item.personId)
  const prayedToday = item.prayedDates?.includes(TODAY())
  const hasDeadline = !!item.deadline
  const deadlinePast = hasDeadline && item.deadline < TODAY()

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${prio.color}`, borderRadius: 12, padding: '12px 14px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {cat && (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color, flexShrink: 0 }}>
            <CatIcon categoryId={cat.id} emoji={cat.icon} size={16} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{item.title}</p>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: prio.color + '22', color: prio.color, fontWeight: 700 }}>P{item.priority || 3}</span>
          </div>
          {person && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              {person.icon || '👤'} Za {person.name}
            </p>
          )}
          {cat && <p style={{ margin: '1px 0 0', fontSize: 10, color: cat.color, fontWeight: 600 }}>{cat.label}</p>}
          {item.note && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{item.note}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {hasDeadline && (
              <span style={{ fontSize: 10, color: deadlinePast ? '#ef4444' : 'var(--text-muted)', fontWeight: deadlinePast ? 700 : 400 }}>
                📅 do {format(parseISO(item.deadline), 'd MMM yyyy', { locale: pl })}
              </span>
            )}
            {!hasDeadline && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>∞ bezterminowo</span>}
            {item.prayedDates?.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🙏 ×{item.prayedDates.length}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button className="t-btn" onClick={onEdit}><IconEdit size={13} /></button>
          <button className="t-btn delete" onClick={() => onDelete(item.id)}><IconTrash size={13} /></button>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button onClick={() => onTogglePrayed(item)} style={{
          flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600,
          border: `1px solid ${prayedToday ? '#27AE60' : 'var(--border)'}`,
          background: prayedToday ? 'rgba(39,174,96,0.15)' : 'transparent',
          color: prayedToday ? '#27AE60' : 'var(--text-muted)'
        }}>
          {prayedToday ? <><IconCheck size={12} /> Pomodlone dziś</> : <><IconPrayer size={12} /> Módl się</>}
        </button>
        <button onClick={onEnd} style={{
          padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
          border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)'
        }}>
          Zakończ
        </button>
      </div>
    </div>
  )
}

/* ─── PeopleView ─── */
function PeopleView({ user, people, intentions }) {
  const [showForm, setShowForm] = useState(false)
  const [editPerson, setEditPerson] = useState(null)

  const handleDelete = async (id) => {
    if (!confirm('Usunąć osobę?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'prayerPeople', id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button className="btn-add-habit" onClick={() => { setEditPerson(null); setShowForm(true) }}>
        + Dodaj osobę
      </button>

      {people.length === 0 ? (
        <div className="list-empty">
          <p>Brak osób</p>
          <p className="list-empty-hint">Dodaj osoby za które chcesz się modlić</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {people.map(p => {
            const activeCount = intentions.filter(i => i.personId === p.id && (i.status === 'active' || !i.status)).length
            return (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {p.icon || '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{p.name}</p>
                  {p.note && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{p.note}</p>}
                  {activeCount > 0 && (
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: '#8b5cf6' }}>🙏 {activeCount} aktywnych intencji</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="t-btn" onClick={() => { setEditPerson(p); setShowForm(true) }}><IconEdit size={13} /></button>
                  <button className="t-btn delete" onClick={() => handleDelete(p.id)}><IconTrash size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && <PersonForm user={user} editData={editPerson} onClose={() => { setShowForm(false); setEditPerson(null) }} />}
    </div>
  )
}

/* ─── JournalView ─── */
function JournalView({ user, sessions }) {
  const [showForm, setShowForm] = useState(false)
  const todayStr   = format(new Date(), 'yyyy-MM-dd')
  const todayEntry = sessions.find(s => s.date === todayStr)

  const allDates = [...new Set(sessions.map(s => s.date))].sort().reverse()
  let streak = 0, cursor = todayStr
  for (const d of allDates) {
    if (d === cursor) { streak++; cursor = format(subDays(parseISO(cursor), 1), 'yyyy-MM-dd') }
    else if (d < cursor) break
  }

  const handleDelete = async (id) => {
    if (!confirm('Usunąć wpis?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'prayerSessions', id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'var(--surface)', border: `2px solid ${todayEntry ? '#27AE60' : 'var(--border)'}`, borderRadius: 16, padding: '18px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 32 }}>{todayEntry ? '🙏' : '💭'}</p>
        <p style={{ margin: '8px 0 4px', fontSize: 15, fontWeight: 700 }}>
          {todayEntry ? 'Modliłaś się dziś' : 'Brak modlitwy dziś'}
        </p>
        {todayEntry?.note && <p style={{ margin: '4px 0 8px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{todayEntry.note}"</p>}
        {!todayEntry && <button className="btn-add-habit" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>+ Zaloguj modlitwę</button>}
      </div>

      {streak > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconFlame size={28} style={{ color: 'var(--warn)', flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{streak} dni z rzędu</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Nieprzerwaną passę</p>
          </div>
        </div>
      )}

      {todayEntry && <button className="btn-add-habit" onClick={() => setShowForm(true)}>+ Dodaj kolejny wpis</button>}

      {sessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sessions.slice(0, 20).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
              <span style={{ fontSize: 18 }}>🙏</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                  {isToday(parseISO(s.date)) ? 'Dziś' : format(parseISO(s.date), 'EEEE, d MMM', { locale: pl })}
                </p>
                {(s.note || s.duration) && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                    {s.duration ? `⏱ ${s.duration} min` : ''}{s.duration && s.note ? ' · ' : ''}{s.note}
                  </p>
                )}
              </div>
              <button className="t-btn delete" onClick={() => handleDelete(s.id)}><IconTrash size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 && (
        <div className="list-empty"><p>Brak wpisów</p><p className="list-empty-hint">Zaloguj pierwszą modlitwę powyżej</p></div>
      )}

      {showForm && <SessionForm user={user} onClose={() => setShowForm(false)} />}
    </div>
  )
}

/* ─── StatsView ─── */
function StatsView({ sessions, intentions, people }) {
  const [period, setPeriod] = useState('month')
  const PERIODS = [{ id: 'week', label: 'Tydzień', days: 7 }, { id: 'month', label: 'Miesiąc', days: 30 }, { id: 'year', label: 'Rok', days: 365 }]
  const days = PERIODS.find(p => p.id === period).days

  const todayStr  = format(new Date(), 'yyyy-MM-dd')
  const cutoff    = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')
  const inPeriod  = sessions.filter(s => s.date >= cutoff)
  const uniqueDays = new Set(inPeriod.map(s => s.date)).size

  const allDates = [...new Set(sessions.map(s => s.date))].sort().reverse()
  let streak = 0, cursor = todayStr
  for (const d of allDates) {
    if (d === cursor) { streak++; cursor = format(subDays(parseISO(cursor), 1), 'yyyy-MM-dd') }
    else if (d < cursor) break
  }

  const ended = intentions.filter(i => i.status === 'ended' || i.status === 'answered')
  const totalPrayedToday = intentions.filter(i => i.prayedDates?.includes(todayStr)).length

  const heatDates = Array.from({ length: 35 }, (_, i) => format(subDays(new Date(), 34 - i), 'yyyy-MM-dd'))
  const sessionDates = new Set(sessions.map(s => s.date))

  // Most prayed-for person
  const personStats = people.map(p => ({
    ...p,
    count: intentions.filter(i => i.personId === p.id && i.prayedDates?.length > 0).reduce((s, i) => s + (i.prayedDates?.length || 0), 0)
  })).filter(p => p.count > 0).sort((a, b) => b.count - a.count)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
        <IconFlame size={36} style={{ color: 'var(--warn)' }} />
        <p style={{ margin: '6px 0 2px', fontSize: 28, fontWeight: 700 }}>{streak}</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>dni z rzędu</p>
      </div>

      <div className="habit-view-tabs">
        {PERIODS.map(p => <button key={p.id} className={`habit-view-tab ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{uniqueDays}</p>
          <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>Dni modlitwy</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{totalPrayedToday}</p>
          <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>Dziś</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#27AE60' }}>{ended.length}</p>
          <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>Zakończonych</p>
        </div>
      </div>

      <div className="chart-section">
        <h3 className="chart-title">Ostatnie 5 tygodni</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-muted)', paddingBottom: 4 }}>{d}</div>
          ))}
          {heatDates.map(d => (
            <div key={d} style={{ height: 24, borderRadius: 5, background: sessionDates.has(d) ? '#8b5cf6' : 'var(--surface)', border: `1px solid ${sessionDates.has(d) ? '#8b5cf6' : 'var(--border)'}` }} />
          ))}
        </div>
      </div>

      {personStats.length > 0 && (
        <div className="chart-section">
          <h3 className="chart-title">Modlitwy za osoby</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {personStats.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{p.icon || '👤'}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🙏 ×{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── IntentionForm ─── */
function IntentionForm({ user, editData, people, onClose }) {
  const [title, setTitle]       = useState(editData?.title || '')
  const [note, setNote]         = useState(editData?.note || '')
  const [categoryId, setCatId]  = useState(editData?.categoryId || '')
  const [personId, setPersonId] = useState(editData?.personId || '')
  const [priority, setPriority] = useState(editData?.priority || 3)
  const [deadline, setDeadline] = useState(editData?.deadline || '')
  const [noDeadline, setNoDeadline] = useState(!editData?.deadline)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Wpisz treść intencji'); return }
    setSaving(true)
    const data = {
      title: title.trim(), note: note.trim(),
      categoryId: categoryId || null, personId: personId || null,
      priority, deadline: noDeadline ? null : (deadline || null),
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'prayerIntentions'), {
          ...data, status: 'active', prayedDates: [], createdAt: Timestamp.now()
        })
      }
      onClose()
    } catch { setError('Błąd zapisu'); setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj intencję' : 'Nowa intencja'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Intencja</label>
            <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)}
              autoFocus maxLength={150} placeholder="O co się modlisz?" />
          </div>

          {/* Priority */}
          <div className="form-group">
            <label>Priorytet</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {PRIORITY_CFG.slice().reverse().map(p => (
                <button key={p.v} type="button" onClick={() => setPriority(p.v)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: priority === p.v ? 700 : 400,
                  border: `2px solid ${priority === p.v ? p.color : 'var(--border)'}`,
                  background: priority === p.v ? p.color + '22' : 'transparent',
                  color: priority === p.v ? p.color : 'var(--text-muted)'
                }}>{p.v}</button>
              ))}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: findPrio(priority)?.color }}>{findPrio(priority)?.label}</p>
          </div>

          {/* Person */}
          {people.length > 0 && (
            <div className="form-group">
              <label>Za kogo (opcjonalnie)</label>
              <div className="account-chips">
                <button type="button" className={`account-chip ${!personId ? 'active' : ''}`} onClick={() => setPersonId('')}>Ogólna</button>
                {people.map(p => (
                  <button key={p.id} type="button"
                    className={`account-chip ${personId === p.id ? 'active' : ''}`}
                    onClick={() => setPersonId(p.id)}>{p.icon || '👤'} {p.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Category */}
          <div className="form-group">
            <label>Kategoria (opcjonalnie)</label>
            <div className="cal-cat-grid">
              {PRAYER_CATS.map(cat => (
                <button key={cat.id} type="button"
                  className={`cal-cat-btn ${categoryId === cat.id ? 'active' : ''}`}
                  style={categoryId === cat.id ? { borderColor: cat.color, background: cat.color + '22' } : {}}
                  onClick={() => setCatId(categoryId === cat.id ? '' : cat.id)}>
                  <span className="cal-cat-icon" style={categoryId === cat.id ? { background: cat.color + '33' } : {}}><CatIcon categoryId={cat.id} emoji={cat.icon} size={15} /></span>
                  <span className="cal-cat-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className="form-group">
            <label>Czas trwania</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <button type="button" className={`bmi-toggle ${noDeadline ? 'on' : ''}`} onClick={() => setNoDeadline(v => !v)} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bezterminowo</span>
            </div>
            {!noDeadline && (
              <input type="date" className="form-input" value={deadline} onChange={e => setDeadline(e.target.value)} placeholder="Data zakończenia" />
            )}
          </div>

          <div className="form-group">
            <label>Notatka (opcjonalnie)</label>
            <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)}
              maxLength={300} placeholder="Szczegóły..." />
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Dodaj intencję'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── EndModal ─── */
function EndModal({ item, onConfirm, onClose }) {
  const [note, setNote] = useState('')
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Zakończ modlitwę</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div className="form">
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-muted)' }}>"{item.title}"</p>
          <div className="form-group">
            <label>Komentarz (opcjonalnie)</label>
            <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)}
              autoFocus maxLength={300} placeholder="np. Wypełnione, sytuacja się zmieniła..." />
          </div>
          <button className="btn-save" onClick={() => onConfirm(note)}>Zakończ</button>
        </div>
      </div>
    </div>
  )
}

/* ─── PersonForm ─── */
function PersonForm({ user, editData, onClose }) {
  const [name, setName]   = useState(editData?.name || '')
  const [note, setNote]   = useState(editData?.note || '')
  const [icon, setIcon]   = useState(editData?.icon || '👤')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const data = { name: name.trim(), note: note.trim(), icon, updatedAt: Timestamp.now() }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'prayerPeople', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'prayerPeople'), { ...data, createdAt: Timestamp.now() })
      }
      onClose()
    } catch { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj osobę' : 'Nowa osoba'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Imię / nazwa</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)}
              autoFocus maxLength={60} placeholder="np. Mama, Przyjaciel Paweł..." />
          </div>
          <div className="form-group">
            <label>Ikona</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {PERSON_ICONS.map(i => (
                <button key={i} type="button" onClick={() => setIcon(i)} style={{
                  width: 34, height: 34, borderRadius: 8, fontSize: 18, cursor: 'pointer',
                  border: `2px solid ${icon === i ? 'var(--primary)' : 'var(--border)'}`,
                  background: icon === i ? 'rgba(201,75,40,0.1)' : 'transparent'
                }}>{i}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Notatka (opcjonalnie)</label>
            <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)}
              maxLength={200} placeholder="np. Chora na raka, szuka Boga..." />
          </div>
          <button type="submit" className="btn-save" disabled={saving || !name.trim()}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz' : 'Dodaj osobę'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── SessionForm ─── */
function SessionForm({ user, onClose }) {
  const [date, setDate]         = useState(format(new Date(), 'yyyy-MM-dd'))
  const [duration, setDuration] = useState('')
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await addDoc(collection(db, 'users', user.uid, 'prayerSessions'), {
      date, duration: duration ? parseInt(duration) : null, note: note.trim(), createdAt: Timestamp.now()
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>🙏 Zaloguj modlitwę</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Data</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Czas (min, opcjonalnie)</label>
            <input type="number" min="1" max="240" className="form-input" value={duration} onChange={e => setDuration(e.target.value)} placeholder="np. 15" />
          </div>
          <div className="form-group">
            <label>Notatka (opcjonalnie)</label>
            <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="Jak przebiegała modlitwa?" />
          </div>
          <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Zapisywanie...' : 'Zapisz'}</button>
        </form>
      </div>
    </div>
  )
}
