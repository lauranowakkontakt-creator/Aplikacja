import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, subDays, addDays, parseISO, differenceInDays, isBefore, startOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { ICON_CATALOG, CatIcon, IconEdit, IconTrash, IconClose, IconPrayer, IconUsers, IconChart, IconFlame, IconCheck, IconChevronLeft, IconChevronRight } from '../Icons'
import { Heatmap } from '../ChartPrimitives'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'

const PRIORITY_CFG = [
  { v: 5, label: 'Pilna',   color: '#ef4444' },
  { v: 4, label: 'Wysoka',  color: '#f97316' },
  { v: 3, label: 'Średnia', color: '#f59e0b' },
  { v: 2, label: 'Niska',   color: '#3b82f6' },
  { v: 1, label: 'Mała',    color: '#9E9E9E' },
]

const NEGLECT_LEVELS = [
  { min: 0,  max: 2,   level: 1, label: 'niedawno',    color: '#22c55e' },
  { min: 3,  max: 6,   level: 2, label: 'trochę dawno',color: '#eab308' },
  { min: 7,  max: 13,  level: 3, label: 'kilka dni',   color: '#f59e0b' },
  { min: 14, max: 29,  level: 4, label: 'dawno',       color: '#f97316' },
  { min: 30, max: 9999,level: 5, label: 'zapomniana',  color: '#ef4444' },
]

const TODAY     = () => format(new Date(), 'yyyy-MM-dd')
const findPrio  = (v) => PRIORITY_CFG.find(p => p.v === v) || PRIORITY_CFG[2]

function getNeglect(days) {
  if (days === null) return { level: 5, label: 'nigdy',     color: '#ef4444' }
  return NEGLECT_LEVELS.find(l => days >= l.min && days <= l.max) || NEGLECT_LEVELS[4]
}

function daysSince(dates) {
  if (!dates?.length) return null
  const last = [...dates].sort().reverse()[0]
  return differenceInDays(new Date(), parseISO(last))
}

const kicker = (t) => (
  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 10 }}>{t}</div>
)

export default function PrayerDashboard({ user }) {
  const [intentions, setIntentions] = useState([])
  const [people, setPeople]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('people')
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [carMode, setCarMode]       = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'prayerIntentions'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setIntentions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user.uid])

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'prayerPeople'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  // Auto-archive intentions past their dateTo
  useEffect(() => {
    const today = TODAY()
    intentions.forEach(async i => {
      if ((i.status === 'active' || !i.status) && i.dateTo && i.dateTo < today) {
        await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', i.id), {
          status: 'ended', endedAt: Timestamp.now(), autoArchived: true
        })
      }
    })
  }, [intentions])

  const today            = TODAY()
  const activeIntentions = intentions.filter(i => i.status === 'active' || !i.status)
  const prayedToday      = activeIntentions.filter(i => i.prayedDates?.includes(today)).length

  const allPrayedDates = useMemo(() => new Set(intentions.flatMap(i => i.prayedDates || [])), [intentions])
  const streak = useMemo(() => {
    let s = 0
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      if (d > today) continue
      if (allPrayedDates.has(d)) s++
      else if (d < today) break
    }
    return s
  }, [allPrayedDates])

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const switchTab = (t) => { setTab(t); setSelectedPerson(null) }

  return (
    <div className={`prayer-dashboard${carMode ? ' car-mode' : ''}`}>
      {/* Header */}
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Modlitwa</div>
          <div className="mod-header-title">
            {tab === 'people' ? (selectedPerson ? selectedPerson.name : 'Osoby') : tab === 'today' ? 'Dziś' : tab === 'archive' ? 'Archiwum' : 'Statystyki'}
          </div>
        </div>
        <div className="mod-header-right">
          <button
            className="icon-btn"
            onClick={() => setCarMode(m => !m)}
            style={carMode ? { background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 700 } : { fontSize: 13, padding: '4px 8px' }}
            title="Tryb auto"
          >🚗</button>
          <div className="prayer-stat-tile" style={{ padding: '4px 10px', gap: 6 }}>
            <IconFlame size={14} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{streak}</span>
          </div>
          <div className="prayer-stat-tile" style={{ padding: '4px 10px', gap: 6 }}>
            <IconPrayer size={14} style={{ color: 'var(--warn)' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{prayedToday}/{activeIntentions.length}</span>
          </div>
        </div>
      </div>

      {/* Verse hero card */}
      {!carMode && (
        <div style={{
          background: 'linear-gradient(140deg,var(--surface),var(--bg))',
          border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
          padding: 32, marginBottom: 18, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -80, right: -60, width: 200, height: 200,
            background: '#C9A24A', borderRadius: '50%', filter: 'blur(70px)', opacity: .16, pointerEvents: 'none'
          }} />
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 16 }}>
            Werset dnia · {format(new Date(), 'd.MM', { locale: pl })}
          </div>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 'clamp(18px,3vw,26px)',
            lineHeight: 1.5, fontStyle: 'italic', margin: 0, color: 'var(--text)'
          }}>
            „Bądź cicho przed Panem<br />i czekaj cierpliwie na Niego."
          </p>
          <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 14, letterSpacing: '.04em' }}>
            — Psalm 37,7
          </div>
        </div>
      )}

      {/* Stats tiles */}
      {!carMode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4, color: '#C9A24A' }}><IconPrayer size={22}/></div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#C9A24A', lineHeight: 1 }}>{prayedToday}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>Dziś</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14, textAlign: 'center' }}>
            <IconFlame size={22} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>{streak}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>Seria</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14, textAlign: 'center' }}>
            <IconUsers size={22} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--violet)', lineHeight: 1 }}>{people.length}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>Osób</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
        {[['people','Osoby'],['today','Dziś'],['stats','Statystyki'],['archive','Archiwum']].map(([id, label]) => (
          <button key={id}
            onClick={() => switchTab(id)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 12, fontWeight: tab === id ? 700 : 400,
              background: tab === id ? 'var(--surface3)' : 'transparent',
              color: tab === id ? 'var(--text)' : 'var(--text-muted)',
              border: tab === id ? '1px solid var(--border-strong)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all .2s',
            }}
          >{label}</button>
        ))}
      </div>

      {tab === 'people' && (
        selectedPerson
          ? <PersonDetailView
              user={user}
              person={selectedPerson}
              intentions={intentions}
              carMode={carMode}
              onBack={() => setSelectedPerson(null)}
            />
          : <PeopleView
              user={user}
              people={people}
              intentions={intentions}
              carMode={carMode}
              onSelect={setSelectedPerson}
            />
      )}
      {tab === 'today' && (
        <TodayView user={user} intentions={intentions} people={people} carMode={carMode} />
      )}
      {tab === 'stats' && (
        <StatsView intentions={intentions} people={people} allPrayedDates={allPrayedDates} streak={streak} />
      )}
      {tab === 'archive' && (
        <ArchiveView user={user} intentions={intentions} people={people} />
      )}
    </div>
  )
}

/* ─── PeopleView ─────────────────────────────────────────────────────────── */
function PeopleView({ user, people, intentions, carMode, onSelect }) {
  const [showForm, setShowForm] = useState(false)
  const [editPerson, setEditPerson] = useState(null)
  const today = TODAY()

  const withStats = useMemo(() => people.map(p => {
    const active = intentions.filter(i => i.personId === p.id && (i.status === 'active' || !i.status))
    const all    = intentions.filter(i => i.personId === p.id)
    const allDates = all.flatMap(i => i.prayedDates || [])
    const lastDate = allDates.length ? [...allDates].sort().reverse()[0] : null
    const days = lastDate ? differenceInDays(new Date(), parseISO(lastDate)) : null
    const prayedToday = allDates.includes(today)
    return { ...p, activeCount: active.length, days, prayedToday }
  }).sort((a, b) => {
    if (a.prayedToday && !b.prayedToday) return 1
    if (!a.prayedToday && b.prayedToday) return -1
    return (b.days ?? 999) - (a.days ?? 999)
  }), [people, intentions, today])

  const handleDeletePerson = async (id, e) => {
    e.stopPropagation()
    const ok = await confirmDialog({ title: 'Usunąć osobę?', message: 'Wszystkie prośby tej osoby zostaną usunięte.' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'prayerPeople', id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button className="btn-add-habit" onClick={() => { setEditPerson(null); setShowForm(true) }}>
        + Dodaj osobę
      </button>

      {people.length === 0 ? (
        <div className="list-empty">
          <p>Brak osób</p>
          <p className="list-empty-hint">Dodaj osoby za które chcesz się modlić</p>
        </div>
      ) : (
        withStats.map(p => {
          const neglect = getNeglect(p.activeCount > 0 ? p.days : -1)
          const isNeglected  = p.activeCount > 0 && !p.prayedToday && neglect.level >= 4
          const isAtRisk     = p.activeCount > 0 && !p.prayedToday && neglect.level === 3
          const borderColor  = isNeglected ? neglect.color : isAtRisk ? neglect.color : p.prayedToday ? '#27AE60' : 'transparent'
          return (
            <div key={p.id} onClick={() => onSelect(p)} style={{
              background: isNeglected ? neglect.color + '0D' : 'var(--surface)',
              border: `1px solid ${isNeglected ? neglect.color + '55' : isAtRisk ? neglect.color + '44' : 'var(--border)'}`,
              borderLeft: `3px solid ${borderColor}`,
              borderRadius: 12, padding: carMode ? '16px 18px' : '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'
            }}>
              <div style={{ width: carMode ? 54 : 44, height: carMode ? 54 : 44, borderRadius: 12, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8b5cf6' }}>
                <CatIcon categoryId={null} emoji={p.icon || 'IcUsers'} size={carMode ? 28 : 22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: carMode ? 19 : 14, fontWeight: 600 }}>{p.name}</p>
                  {p.prayedToday && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(39,174,96,0.15)', color: '#27AE60' }}>✓ dziś</span>}
                  {(isNeglected || isAtRisk) && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: neglect.color + '22', color: neglect.color, fontWeight: 700 }}>
                      L{neglect.level} · {neglect.label}
                    </span>
                  )}
                </div>
                <p style={{ margin: '3px 0 0', fontSize: carMode ? 13 : 11, color: 'var(--text-muted)' }}>
                  {p.activeCount} {p.activeCount === 1 ? 'prośba' : p.activeCount < 5 ? 'prośby' : 'próśb'}
                  {p.days === 0 && ' · modlono dziś'}
                  {p.days !== null && p.days > 0 && ` · ${p.days} dni temu`}
                  {p.days === null && p.activeCount > 0 && ' · jeszcze nie modlono'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button className="t-btn" onClick={e => { e.stopPropagation(); setEditPerson(p); setShowForm(true) }}><IconEdit size={13} /></button>
                <button className="t-btn delete" onClick={e => handleDeletePerson(p.id, e)}><IconTrash size={13} /></button>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 16, flexShrink: 0 }}>›</span>
            </div>
          )
        })
      )}

      {showForm && (
        <PersonForm user={user} editData={editPerson} onClose={() => { setShowForm(false); setEditPerson(null) }} />
      )}
    </div>
  )
}

/* ─── PersonDetailView ───────────────────────────────────────────────────── */
function PersonDetailView({ user, person, intentions, carMode, onBack }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [showEnded, setShowEnded]     = useState(false)

  const mine   = intentions.filter(i => i.personId === person.id)
  const active = mine.filter(i => i.status === 'active' || !i.status).sort((a, b) => {
    if ((a.priority || 3) === 5 && (b.priority || 3) !== 5) return -1
    if ((a.priority || 3) !== 5 && (b.priority || 3) === 5) return 1
    const at = a.prayedDates?.includes(TODAY())
    const bt = b.prayedDates?.includes(TODAY())
    if (at && !bt) return 1
    if (!at && bt) return -1
    return (b.priority || 3) - (a.priority || 3)
  })
  const ended = mine.filter(i => i.status === 'ended')

  const togglePrayed = async (item, date) => {
    const d = date || TODAY()
    const prayed = item.prayedDates?.includes(d)
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      prayedDates: prayed ? arrayRemove(d) : arrayUnion(d)
    })
  }

  const addNote = async (itemId, text) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', itemId), {
      notes: arrayUnion({ text, date: TODAY(), id: Date.now().toString() })
    })
  }

  const editNote = async (item, note, newText) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      notes: arrayRemove(note)
    })
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      notes: arrayUnion({ ...note, text: newText })
    })
  }

  const deleteNote = async (item, note) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      notes: arrayRemove(note)
    })
  }

  const archiveItem = async (item) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      status: 'ended', endedAt: Timestamp.now()
    })
  }

  const deleteItem = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć prośbę?' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'prayerIntentions', id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="t-btn" onClick={onBack} style={{ fontSize: 20, padding: '4px 8px' }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
          <CatIcon categoryId={null} emoji={person.icon || 'IcUsers'} size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{person.name}</p>
          {person.note && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{person.note}</p>}
        </div>
        <span style={{ fontSize: 12, color: '#8b5cf6', flexShrink: 0 }}>{active.length} aktywnych</span>
      </div>

      {active.length === 0 && !showAddForm && (
        <div className="list-empty">
          <p>Brak aktywnych próśb</p>
          <p className="list-empty-hint">Dodaj pierwszą prośbę modlitewną</p>
        </div>
      )}

      {active.map(item => (
        <RequestCard
          key={item.id}
          item={item}
          user={user}
          carMode={carMode}
          onTogglePrayed={togglePrayed}
          onAddNote={addNote}
          onEditNote={editNote}
          onDeleteNote={deleteNote}
          onArchive={archiveItem}
          onEdit={() => { setEditItem(item); setShowAddForm(true) }}
          onDelete={deleteItem}
        />
      ))}

      {showAddForm ? (
        <IntentionForm
          user={user}
          editData={editItem}
          personId={person.id}
          onClose={() => { setShowAddForm(false); setEditItem(null) }}
        />
      ) : (
        <button className="btn-add-habit" onClick={() => { setEditItem(null); setShowAddForm(true) }}>
          + Dodaj prośbę modlitewną
        </button>
      )}

      {ended.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button className="todo-done-toggle" onClick={() => setShowEnded(v => !v)}>
            {showEnded ? '▾' : '▸'} Zarchiwizowane ({ended.length})
          </button>
          {showEnded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {ended.map(item => (
                <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', opacity: 0.65, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{item.title}</p>
                    {item.endedNote && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{item.endedNote}"</p>}
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
                      🙏 ×{item.prayedDates?.length || 0}
                      {item.autoArchived && ' · auto-zarchiwizowana'}
                    </p>
                  </div>
                  <button className="t-btn delete" onClick={() => deleteItem(item.id)}><IconTrash size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── RequestCard ────────────────────────────────────────────────────────── */
function RequestCard({ item, user, carMode, onTogglePrayed, onAddNote, onEditNote, onDeleteNote, onArchive, onEdit, onDelete, showPerson, person, viewDate }) {
  const [showNotes, setShowNotes]     = useState(false)
  const [addingNote, setAddingNote]   = useState(false)
  const [noteText, setNoteText]       = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editNoteText, setEditNoteText]   = useState('')

  const prio       = findPrio(item.priority || 3)
  const date       = viewDate || TODAY()
  const prayedToday = item.prayedDates?.includes(date)
  const days       = daysSince(item.prayedDates)
  const neglect    = getNeglect(prayedToday ? 0 : days)
  const isNeglected = !prayedToday && neglect.level >= 4

  const submitNote = () => {
    if (!noteText.trim()) return
    onAddNote(item.id, noteText.trim())
    setNoteText('')
    setAddingNote(false)
    setShowNotes(true)
  }

  const submitEditNote = (note) => {
    if (!editNoteText.trim()) return
    onEditNote(item, note, editNoteText.trim())
    setEditingNoteId(null)
  }

  const fs = carMode ? { title: 18, sub: 14, badge: 12, action: 15, note: 14 } : { title: 14, sub: 12, badge: 10, action: 12, note: 12 }
  const pad = carMode ? '16px 18px' : '12px 14px'

  return (
    <div style={{
      background: isNeglected ? neglect.color + '08' : 'var(--surface)',
      border: `1px solid ${isNeglected ? neglect.color + '44' : 'var(--border)'}`,
      borderLeft: `3px solid ${prio.color}`,
      borderRadius: 12, padding: pad
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: fs.title, fontWeight: 600 }}>{item.title}</p>
            <span style={{ fontSize: fs.badge, padding: '1px 5px', borderRadius: 4, background: prio.color + '22', color: prio.color, fontWeight: 700 }}>P{item.priority || 3}</span>
            {isNeglected && (
              <span style={{ fontSize: fs.badge, padding: '1px 5px', borderRadius: 4, background: neglect.color + '18', color: neglect.color, fontWeight: 600 }}>
                L{neglect.level} · {neglect.label}
              </span>
            )}
          </div>
          {showPerson && person && (
            <p style={{ margin: '2px 0 0', fontSize: fs.sub, color: '#8b5cf6' }}>
              <CatIcon categoryId={null} emoji={person.icon || 'IcUsers'} size={fs.sub} /> {person.name}
            </p>
          )}
          {item.note && <p style={{ margin: '3px 0 0', fontSize: fs.sub, color: 'var(--text-muted)' }}>{item.note}</p>}
          {item.dateTo && (
            <p style={{ margin: '2px 0 0', fontSize: fs.badge, color: 'var(--text-muted)' }}>
              📅 do {item.dateTo}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {item.prayedDates?.length > 0 && (
              <span style={{ fontSize: fs.badge, color: 'var(--text-muted)' }}>
                🙏 ×{item.prayedDates.length}
                {days === 0 && ' · dziś'}
                {days !== null && days > 0 && ` · ${days} dni temu`}
              </span>
            )}
            {item.notes?.length > 0 && (
              <button type="button" onClick={() => setShowNotes(v => !v)} style={{ fontSize: fs.badge, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                📝 {item.notes.length} {item.notes.length === 1 ? 'notatka' : 'notatki'}
              </button>
            )}
          </div>
        </div>
        {!carMode && (
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            <button className="t-btn" onClick={onEdit}><IconEdit size={13} /></button>
            <button className="t-btn delete" onClick={() => onDelete(item.id)}><IconTrash size={13} /></button>
          </div>
        )}
      </div>

      {showNotes && item.notes?.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...item.notes].sort((a, b) => b.date.localeCompare(a.date)).map(n => (
            <div key={n.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '7px 10px' }}>
              {editingNoteId === n.id ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <textarea
                    className="form-input"
                    value={editNoteText}
                    onChange={e => setEditNoteText(e.target.value)}
                    rows={2}
                    style={{ flex: 1, margin: 0, fontSize: fs.note, resize: 'vertical' }}
                   
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button className="btn-save" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => submitEditNote(n)}>Zapisz</button>
                    <button onClick={() => setEditingNoteId(null)} style={{ padding: '4px 10px', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-muted)' }}>Anuluj</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: fs.note }}>{n.text}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{n.date}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button className="t-btn" onClick={() => { setEditingNoteId(n.id); setEditNoteText(n.text) }}><IconEdit size={12} /></button>
                    <button className="t-btn delete" onClick={() => onDeleteNote(item, n)}><IconTrash size={12} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button type="button" onClick={() => onTogglePrayed(item, viewDate)} style={{
          flex: 1, padding: carMode ? '13px' : '8px', borderRadius: 8, fontSize: fs.action, cursor: 'pointer', fontWeight: 600,
          border: `1px solid ${prayedToday ? '#27AE60' : 'var(--border)'}`,
          background: prayedToday ? 'rgba(39,174,96,0.15)' : 'transparent',
          color: prayedToday ? '#27AE60' : 'var(--text-muted)'
        }}>
          {prayedToday ? <><IconCheck size={carMode ? 16 : 12} /> Modlono</> : <><IconPrayer size={carMode ? 16 : 12} /> Módl się</>}
        </button>
        <button type="button" onClick={() => setAddingNote(v => !v)} style={{
          padding: carMode ? '13px 16px' : '8px 11px', borderRadius: 8, fontSize: carMode ? 18 : 13, cursor: 'pointer',
          border: `1px solid ${addingNote ? 'var(--primary)' : 'var(--border)'}`,
          background: addingNote ? 'rgba(201,75,40,0.1)' : 'transparent',
          color: addingNote ? 'var(--primary)' : 'var(--text-muted)'
        }}>📝</button>
        {!carMode && (
          <button type="button" onClick={() => onArchive(item)} style={{
            padding: '8px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)'
          }}>Archiwizuj</button>
        )}
      </div>

      {addingNote && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <textarea
            className="form-input"
            placeholder="Notatka z modlitwy..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitNote()}
            rows={2}
            style={{ flex: 1, margin: 0, fontSize: fs.note, resize: 'vertical' }}
           
          />
          <button className="btn-save" style={{ padding: '0 14px', fontSize: 13, alignSelf: 'flex-end' }} onClick={submitNote}>
            Dodaj
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── TodayView ──────────────────────────────────────────────────────────── */
function TodayView({ user, intentions, people, carMode }) {
  const [viewDate, setViewDate] = useState(TODAY())

  const activeIntentions   = intentions.filter(i => i.status === 'active' || !i.status)
  const archivedPrayedOnDate = useMemo(
    () => intentions.filter(i => i.status === 'ended' && i.prayedDates?.includes(viewDate)),
    [intentions, viewDate]
  )

  const togglePrayed = async (item, date) => {
    const d = date || viewDate
    const prayed = item.prayedDates?.includes(d)
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      prayedDates: prayed ? arrayRemove(d) : arrayUnion(d)
    })
  }

  const addNote = async (itemId, text) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', itemId), {
      notes: arrayUnion({ text, date: viewDate, id: Date.now().toString() })
    })
  }

  const editNote = async (item, note, newText) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), { notes: arrayRemove(note) })
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), { notes: arrayUnion({ ...note, text: newText }) })
  }

  const deleteNote = async (item, note) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), { notes: arrayRemove(note) })
  }

  const sorted = [...activeIntentions].sort((a, b) => {
    if ((a.priority || 3) === 5 && (b.priority || 3) !== 5) return -1
    if ((a.priority || 3) !== 5 && (b.priority || 3) === 5) return 1
    const ap = a.prayedDates?.includes(viewDate)
    const bp = b.prayedDates?.includes(viewDate)
    if (ap && !bp) return 1
    if (!ap && bp) return -1
    return (b.priority || 3) - (a.priority || 3)
  })

  const prayedCount = activeIntentions.filter(i => i.prayedDates?.includes(viewDate)).length
  const isToday     = viewDate === TODAY()
  const dateLabel   = isToday ? 'Dziś' : format(parseISO(viewDate), 'EEEE, d MMMM', { locale: pl })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
        <button className="icon-btn" onClick={() => setViewDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))}><IconChevronLeft size={16} /></button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{dateLabel}</p>
          {!isToday && <button onClick={() => setViewDate(TODAY())} style={{ fontSize: 10, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>wróć do dziś</button>}
        </div>
        <button className="icon-btn" onClick={() => setViewDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'))}><IconChevronRight size={16} /></button>
      </div>

      {activeIntentions.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: carMode ? '18px' : '14px 16px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: carMode ? 36 : 28, fontWeight: 700 }}>{prayedCount}<span style={{ fontSize: carMode ? 24 : 18, color: 'var(--text-muted)' }}>/{activeIntentions.length}</span></p>
          <p style={{ margin: '2px 0 0', fontSize: carMode ? 14 : 12, color: 'var(--text-muted)' }}>modlono {isToday ? 'dziś' : dateLabel.toLowerCase()}</p>
          {prayedCount > 0 && prayedCount === activeIntentions.length && (
            <p style={{ margin: '6px 0 0', fontSize: carMode ? 15 : 13, color: '#27AE60', fontWeight: 600 }}>🙌 Wszystkie prośby modlone!</p>
          )}
        </div>
      )}

      {sorted.map(item => {
        const person = people.find(p => p.id === item.personId)
        return (
          <RequestCard
            key={item.id}
            item={item}
            user={user}
            carMode={carMode}
            viewDate={viewDate}
            onTogglePrayed={togglePrayed}
            onAddNote={addNote}
            onEditNote={editNote}
            onDeleteNote={deleteNote}
            onArchive={async (item) => updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), { status: 'ended', endedAt: Timestamp.now() })}
            onEdit={() => {}}
            onDelete={async (id) => { const _ok = await confirmDialog({ title: 'Usunąć prośbę?' })
              if (_ok) await deleteDoc(doc(db, 'users', user.uid, 'prayerIntentions', id)) }}
            showPerson
            person={person}
          />
        )
      })}

      {/* Archived intentions that were prayed on this date */}
      {archivedPrayedOnDate.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 8, paddingLeft: 2 }}>
            Zarchiwizowane · modlono {isToday ? 'dziś' : 'tego dnia'}
          </div>
          {archivedPrayedOnDate.map(item => {
            const person = people.find(p => p.id === item.personId)
            const prio = findPrio(item.priority || 3)
            return (
              <div key={item.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${prio.color}55`,
                borderRadius: 12, padding: '10px 14px', opacity: 0.5,
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                pointerEvents: 'none',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{item.title}</p>
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--surface3)', color: 'var(--text-muted)' }}>archiwum</span>
                  </div>
                  {person && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{person.name}</p>}
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>🙏 ×{item.prayedDates?.length || 0} łącznie</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeIntentions.length === 0 && archivedPrayedOnDate.length === 0 && (
        <div className="list-empty">
          <p>Brak aktywnych próśb</p>
          <p className="list-empty-hint">Przejdź do zakładki Osoby i dodaj prośby modlitewne</p>
        </div>
      )}
    </div>
  )
}

/* ─── StatsView ──────────────────────────────────────────────────────────── */
function StatsView({ intentions, people, allPrayedDates, streak }) {
  const today    = TODAY()

  // Build heatmap data for 9 weeks
  const WEEKS = 9
  const heatData = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const d = format(subDays(new Date(), WEEKS * 7 - 1 - i), 'yyyy-MM-dd')
    return allPrayedDates.has(d) ? 4 : 0
  })

  const personStats = useMemo(() => people.map(p => {
    const allMine  = intentions.filter(i => i.personId === p.id)
    const active   = allMine.filter(i => i.status === 'active' || !i.status)
    const allDates = allMine.flatMap(i => i.prayedDates || [])
    const lastDate = allDates.length ? [...allDates].sort().reverse()[0] : null
    const days     = lastDate ? differenceInDays(new Date(), parseISO(lastDate)) : null
    return {
      ...p,
      totalPrays:   allDates.length,
      totalIntentions: allMine.length,
      activeCount:  active.length,
      days,
      prayedToday:  allDates.includes(today),
    }
  }).sort((a, b) => {
    if (a.prayedToday && !b.prayedToday) return 1
    if (!a.prayedToday && b.prayedToday) return -1
    return (b.days ?? 999) - (a.days ?? 999)
  }), [people, intentions, today])

  // Regularność %
  const totalDays = 30
  const prayedDays = Array.from({ length: totalDays }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'))
    .filter(d => allPrayedDates.has(d)).length
  const regularPct = Math.round((prayedDays / totalDays) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Intencje — lista */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          {kicker('Intencje')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {personStats.slice(0, 4).map(p => {
              const neglect = getNeglect(p.activeCount > 0 && !p.prayedToday ? p.days : -1)
              const isNeglected = p.activeCount > 0 && !p.prayedToday && neglect.level >= 4
              const isAtRisk    = p.activeCount > 0 && !p.prayedToday && neglect.level === 3
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  borderRadius: 10, cursor: 'pointer',
                  background: isNeglected ? neglect.color + '08' : 'var(--surface2)',
                  border: `1px solid ${isNeglected ? neglect.color + '40' : isAtRisk ? neglect.color + '30' : 'var(--border)'}`,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
                    <CatIcon categoryId={null} emoji={p.icon || 'IcUsers'} size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      ↳ {p.totalPrays}× · {p.days === 0 ? 'dziś' : p.days !== null ? `${p.days} dni temu` : 'brak'}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>›</span>
                </div>
              )
            })}
            {personStats.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Brak osób</div>
            )}
          </div>
        </div>

        {/* Heatmap + stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
            {kicker('Aktywność modlitwy')}
            <Heatmap weeks={WEEKS} accentHex="#C9A24A" data={heatData} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#C9A24A' }}>{regularPct}%</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>regularność</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{streak}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>seria dni</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Person stats full list */}
      {personStats.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          {kicker('Osoby — jak często się modliłam')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {personStats.map(p => {
              const neglect = getNeglect(p.activeCount > 0 && !p.prayedToday ? p.days : -1)
              const isNeglected     = p.activeCount > 0 && !p.prayedToday && neglect.level >= 4
              const isAtRisk        = p.activeCount > 0 && !p.prayedToday && neglect.level === 3
              return (
                <div key={p.id} style={{
                  background: isNeglected ? neglect.color + '08' : 'var(--surface2)',
                  border: `1px solid ${isNeglected ? neglect.color + '44' : isAtRisk ? neglect.color + '33' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                    <CatIcon categoryId={null} emoji={p.icon || 'IcUsers'} size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{p.name}</p>
                      {p.prayedToday && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(39,174,96,0.15)', color: '#27AE60' }}>✓ dziś</span>}
                      {(isNeglected || isAtRisk) && (
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: neglect.color + '20', color: neglect.color, fontWeight: 700 }}>
                          L{neglect.level} · {neglect.label}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      🙏 ×{p.totalPrays} · {p.totalIntentions} {p.totalIntentions === 1 ? 'prośba' : 'próśb'}
                      {p.days === 0 && ' · modlono dziś'}
                      {p.days !== null && p.days > 0 && ` · ${p.days} dni temu`}
                      {p.days === null && p.activeCount > 0 && ' · jeszcze nie modlono'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── ArchiveView ────────────────────────────────────────────────────────── */
function ArchiveView({ user, intentions, people }) {
  const [search, setSearch]       = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const ended = intentions.filter(i => i.status === 'ended')

  const filtered = search.trim()
    ? ended.filter(i => i.title.toLowerCase().includes(search.toLowerCase()))
    : ended

  const byPerson = useMemo(() => {
    const map = {}
    filtered.forEach(i => {
      const key = i.personId || '__none__'
      if (!map[key]) map[key] = []
      map[key].push(i)
    })
    return map
  }, [filtered])

  const restoreItem = async (item) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      status: 'active', endedAt: null, autoArchived: null
    })
  }

  const deleteItem = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć trwale?', message: 'Prośba zostanie usunięta z archiwum.' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'prayerIntentions', id))
  }

  const totalPrays = ended.reduce((s, i) => s + (i.prayedDates?.length || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1 }}>{ended.length}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>Zarchiwizowanych</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#C9A24A', lineHeight: 1 }}>{totalPrays}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>Łącznie modlono</div>
        </div>
      </div>

      {ended.length === 0 ? (
        <div className="list-empty">
          <p>Brak zarchiwizowanych próśb</p>
          <p className="list-empty-hint">Zarchiwizowane prośby będą tutaj widoczne</p>
        </div>
      ) : (
        <>
          <input
            type="text"
            className="form-input"
            placeholder="Szukaj w archiwum..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ margin: 0 }}
          />

          {filtered.length === 0 && (
            <div className="list-empty"><p>Brak wyników</p></div>
          )}

          {Object.entries(byPerson).map(([personId, items]) => {
            const person = personId === '__none__' ? null : people.find(p => p.id === personId)
            const groupPrays = items.reduce((s, i) => s + (i.prayedDates?.length || 0), 0)
            return (
              <div key={personId}>
                {/* Person header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {person && (
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
                      <CatIcon categoryId={null} emoji={person.icon || 'IcUsers'} size={14} />
                    </div>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    {person ? person.name : 'Bez osoby'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {items.length} {items.length === 1 ? 'prośba' : 'próśb'} · 🙏×{groupPrays}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {items.map(item => (
                    <div key={item.id} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: '10px 14px', opacity: 0.75,
                      display: 'flex', alignItems: 'flex-start', gap: 10
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{item.title}</p>
                          {item.autoArchived && (
                            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--surface3)', color: 'var(--text-muted)' }}>auto</span>
                          )}
                          {findPrio(item.priority || 3) && (
                            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: findPrio(item.priority || 3).color + '22', color: findPrio(item.priority || 3).color }}>
                              P{item.priority || 3}
                            </span>
                          )}
                        </div>
                        {item.note && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{item.note}</p>
                        )}
                        {item.endedNote && (
                          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>„{item.endedNote}"</p>
                        )}
                        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🙏 ×{item.prayedDates?.length || 0}</span>
                          {item.endedAt && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              Zarchiwizowano: {format(item.endedAt.toDate?.() || new Date(item.endedAt), 'd.MM.yyyy', { locale: pl })}
                            </span>
                          )}
                        </div>
                        {expandedId === item.id && item.prayedDates?.length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Historia modlitw</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {[...item.prayedDates].sort().reverse().slice(0, 20).map(d => (
                                <span key={d} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface3)', color: 'var(--text-muted)' }}>
                                  {format(parseISO(d), 'd.MM.yy')}
                                </span>
                              ))}
                              {item.prayedDates.length > 20 && (
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{item.prayedDates.length - 20} więcej</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                        {item.prayedDates?.length > 0 && (
                          <button className="t-btn" title="Historia" onClick={() => setExpandedId(v => v === item.id ? null : item.id)} style={{ fontSize: 11 }}>
                            📅
                          </button>
                        )}
                        <button className="t-btn" title="Przywróć" onClick={() => restoreItem(item)} style={{ fontSize: 11 }}>
                          ↩
                        </button>
                        <button className="t-btn delete" title="Usuń" onClick={() => deleteItem(item.id)}>
                          <IconTrash size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

/* ─── IntentionForm ──────────────────────────────────────────────────────── */
function IntentionForm({ user, editData, personId, onClose }) {
  const [title, setTitle]       = useState(editData?.title || '')
  const [note, setNote]         = useState(editData?.note || '')
  const [priority, setPriority] = useState(editData?.priority || 3)
  const [dateTo, setDateTo]     = useState(editData?.dateTo || '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Wpisz treść prośby'); return }
    setSaving(true)
    const data = {
      title: title.trim(), note: note.trim(),
      personId: personId || editData?.personId || null,
      priority, dateTo: dateTo || null,
      updatedAt: Timestamp.now()
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'prayerIntentions'), {
          ...data, status: 'active', prayedDates: [], notes: [], createdAt: Timestamp.now()
        })
      }
      onClose()
    } catch { setError('Błąd zapisu'); setSaving(false) }
  }

  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--primary)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
        {editData ? 'Edytuj prośbę' : 'Nowa prośba modlitewna'}
      </p>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Prośba</label>
        <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)}
          maxLength={150} placeholder="O co się modlisz?" />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
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

      <div className="form-group" style={{ margin: 0 }}>
        <label>Opis (opcjonalnie)</label>
        <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)}
          maxLength={300} placeholder="Szczegóły..." />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Auto-archiwizuj po dacie (opcjonalnie)</label>
        <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {dateTo && <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Prośba zarchiwizuje się automatycznie po {dateTo}</p>}
      </div>

      {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-save" onClick={handleSubmit} disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Zapisywanie...' : editData ? 'Zapisz' : 'Dodaj prośbę'}
        </button>
        <button type="button" onClick={onClose} style={{
          flex: 1, background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-muted)', borderRadius: 'var(--radius)', padding: 12, cursor: 'pointer', fontSize: 14
        }}>Anuluj</button>
      </div>
    </div>
  )
}

/* ─── PersonForm ─────────────────────────────────────────────────────────── */
const PERSON_ICON_GROUPS = [
  { label: 'Ludzie', keys: ['IcUsers','IcUser','IcHeart','IcStar','IcChild','IcFamily'] },
  { label: 'Wiara', keys: ['IcPrayer','IcCross','IcChurch','IcBible','IcDove','IcCandle'] },
  { label: 'Emocje', keys: ['IcSmile','IcSad','IcStrong','IcHug','IcPeace'] },
  { label: 'Zdrowie', keys: ['IcHealth','IcPill','IcHospital','IcRun','IcMedal'] },
  { label: 'Praca', keys: ['IcWork','IcSchool','IcBook','IcGrad','IcBriefcase'] },
]

const ALL_PERSON_ICON_KEYS = ICON_CATALOG.map(ic => ic.key)
const PERSON_ICON_CATALOG  = ICON_CATALOG

function PersonForm({ user, editData, onClose }) {
  const [name, setName]         = useState(editData?.name || '')
  const [note, setNote]         = useState(editData?.note || '')
  const [iconKey, setIconKey]   = useState(editData?.icon || 'IcUsers')
  const [iconSearch, setIconSearch] = useState('')
  const [saving, setSaving]     = useState(false)

  const filtered = iconSearch.trim()
    ? ICON_CATALOG.filter(ic => ic.label.toLowerCase().includes(iconSearch.toLowerCase()) || ic.group.toLowerCase().includes(iconSearch.toLowerCase()))
    : PERSON_ICON_CATALOG

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const data = { name: name.trim(), note: note.trim(), icon: iconKey, updatedAt: Timestamp.now() }
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
              maxLength={60} placeholder="np. Mama, Zuzia, Przyjaciel Paweł..." />
          </div>

          <div className="form-group">
            <label>Ikona</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', border: '2px solid #8b5cf6' }}>
                <CatIcon categoryId={null} emoji={iconKey} size={24} />
              </div>
              <input type="text" className="form-input" value={iconSearch} onChange={e => setIconSearch(e.target.value)}
                placeholder="Szukaj ikony..." style={{ margin: 0, flex: 1 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
              {filtered.map(ic => (
                <button key={ic.key} type="button"
                  onClick={() => setIconKey(ic.key)}
                  title={ic.label}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    border: `2px solid ${iconKey === ic.key ? '#8b5cf6' : 'var(--border)'}`,
                    background: iconKey === ic.key ? 'rgba(139,92,246,0.15)' : 'transparent',
                    color: iconKey === ic.key ? '#8b5cf6' : 'var(--text-muted)',
                    padding: 0
                  }}>
                  <CatIcon categoryId={null} emoji={ic.key} size={18} />
                </button>
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
