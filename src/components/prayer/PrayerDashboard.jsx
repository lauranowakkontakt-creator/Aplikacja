import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, subDays, parseISO, differenceInDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { IconEdit, IconTrash, IconClose, IconPrayer, IconUsers, IconChart, IconFlame, IconCheck } from '../Icons'

const PRIORITY_CFG = [
  { v: 5, label: 'Pilna',   color: '#ef4444' },
  { v: 4, label: 'Wysoka',  color: '#f97316' },
  { v: 3, label: 'Średnia', color: '#f59e0b' },
  { v: 2, label: 'Niska',   color: '#3b82f6' },
  { v: 1, label: 'Mała',    color: '#9E9E9E' },
]
const PERSON_ICONS = [
  '👤','👨','👩','👴','👵','👦','👧','🧑','👶','💑',
  '👨‍👩‍👧','🧑‍💼','🧑‍🏫','🧑‍⚕️','🙋','🫂','❤️','🌟','🕊️','😊',
  '😢','🤒','💪','🙏','✝️','📿','⛪','🌹','🕯️','👼',
  '😇','🤝','👮','🎓','💍','🌺','🦋','⭐','🫶','🤗',
]

const TODAY = () => format(new Date(), 'yyyy-MM-dd')
const findPrio = (v) => PRIORITY_CFG.find(p => p.v === v) || PRIORITY_CFG[2]

function daysSinceLastPrayed(prayedDates) {
  if (!prayedDates?.length) return null
  const last = [...prayedDates].sort().reverse()[0]
  return differenceInDays(new Date(), parseISO(last))
}

function personLastPrayed(intentions, personId) {
  const all = intentions
    .filter(i => i.personId === personId && (i.status === 'active' || !i.status))
    .flatMap(i => i.prayedDates || [])
  if (!all.length) return null
  return [...all].sort().reverse()[0]
}

export default function PrayerDashboard({ user }) {
  const [intentions, setIntentions] = useState([])
  const [people, setPeople]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('people')
  const [selectedPerson, setSelectedPerson] = useState(null)

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

  const today = TODAY()
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
    <div className="prayer-dashboard">
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Modlitwa</div>
          <div className="mod-header-title">
            {tab === 'people' ? (selectedPerson ? selectedPerson.name : 'Osoby') : tab === 'today' ? 'Dziś' : 'Statystyki'}
          </div>
        </div>
        <div className="mod-header-right">
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

      <div className="prayer-verse-card">
        <div className="prayer-verse-kicker">Werset dnia · {format(new Date(), 'd.MM', { locale: pl })}</div>
        <p className="prayer-verse-text">"Bądź cicho przed Panem<br />i czekaj cierpliwie na Niego."</p>
        <div className="prayer-verse-ref">— Psalm 37,7</div>
      </div>

      <div className="habit-view-tabs">
        <button className={`habit-view-tab ${tab === 'people' ? 'active' : ''}`} onClick={() => switchTab('people')}>
          <IconUsers size={14} /> Osoby
        </button>
        <button className={`habit-view-tab ${tab === 'today' ? 'active' : ''}`} onClick={() => switchTab('today')}>
          <IconPrayer size={14} /> Dziś
        </button>
        <button className={`habit-view-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => switchTab('stats')}>
          <IconChart size={14} /> Statystyki
        </button>
      </div>

      {tab === 'people' && (
        selectedPerson
          ? <PersonDetailView
              user={user}
              person={selectedPerson}
              intentions={intentions}
              onBack={() => setSelectedPerson(null)}
            />
          : <PeopleView
              user={user}
              people={people}
              intentions={intentions}
              onSelect={setSelectedPerson}
            />
      )}
      {tab === 'today' && (
        <TodayView user={user} intentions={activeIntentions} people={people} />
      )}
      {tab === 'stats' && (
        <StatsView intentions={intentions} people={people} allPrayedDates={allPrayedDates} streak={streak} />
      )}
    </div>
  )
}

/* ─── PeopleView ─────────────────────────────────────────────────────────── */
function PeopleView({ user, people, intentions, onSelect }) {
  const [showForm, setShowForm] = useState(false)
  const [editPerson, setEditPerson] = useState(null)
  const today = TODAY()

  const withStats = useMemo(() => people.map(p => {
    const mine = intentions.filter(i => i.personId === p.id && (i.status === 'active' || !i.status))
    const allDates = mine.flatMap(i => i.prayedDates || [])
    const lastDate = allDates.length ? [...allDates].sort().reverse()[0] : null
    const days = lastDate ? differenceInDays(new Date(), parseISO(lastDate)) : null
    const prayedToday = allDates.includes(today)
    return { ...p, activeCount: mine.length, days, prayedToday }
  }).sort((a, b) => {
    if (a.prayedToday && !b.prayedToday) return 1
    if (!a.prayedToday && b.prayedToday) return -1
    return (b.days ?? 999) - (a.days ?? 999)
  }), [people, intentions, today])

  const handleDeletePerson = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Usunąć osobę i wszystkie jej prośby?')) return
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
          const forgotten = p.activeCount > 0 && !p.prayedToday && (p.days === null || p.days > 7)
          const almostForgotten = p.activeCount > 0 && !p.prayedToday && p.days !== null && p.days >= 3 && p.days <= 7
          return (
            <div key={p.id} onClick={() => onSelect(p)} style={{
              background: forgotten ? 'rgba(239,68,68,0.06)' : 'var(--surface)',
              border: `1px solid ${forgotten ? 'rgba(239,68,68,0.35)' : almostForgotten ? 'rgba(249,115,22,0.3)' : 'var(--border)'}`,
              borderLeft: `3px solid ${forgotten ? '#ef4444' : almostForgotten ? '#f97316' : p.prayedToday ? '#27AE60' : 'transparent'}`,
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                {p.icon || '👤'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{p.name}</p>
                  {p.prayedToday && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(39,174,96,0.15)', color: '#27AE60' }}>✓ dziś</span>}
                  {forgotten && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>zapomniana</span>}
                  {almostForgotten && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>dawno</span>}
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
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
function PersonDetailView({ user, person, intentions, onBack }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [showEnded, setShowEnded]     = useState(false)

  const mine    = intentions.filter(i => i.personId === person.id)
  const active  = mine.filter(i => i.status === 'active' || !i.status).sort((a, b) => (b.priority || 3) - (a.priority || 3))
  const ended   = mine.filter(i => i.status === 'ended')

  const togglePrayed = async (item) => {
    const t = TODAY()
    const prayed = item.prayedDates?.includes(t)
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      prayedDates: prayed ? arrayRemove(t) : arrayUnion(t)
    })
  }

  const addNote = async (itemId, text) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', itemId), {
      notes: arrayUnion({ text, date: TODAY(), id: Date.now().toString() })
    })
  }

  const archiveItem = async (item) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      status: 'ended', endedAt: Timestamp.now()
    })
  }

  const deleteItem = async (id) => {
    if (!confirm('Usunąć prośbę?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'prayerIntentions', id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="t-btn" onClick={onBack} style={{ fontSize: 20, padding: '4px 8px' }}>←</button>
        <span style={{ fontSize: 26 }}>{person.icon || '👤'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{person.name}</p>
          {person.note && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{person.note}</p>}
        </div>
        <span style={{ fontSize: 12, color: '#8b5cf6', flexShrink: 0 }}>
          {active.length} aktywnych
        </span>
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
          onTogglePrayed={togglePrayed}
          onAddNote={addNote}
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
                <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{item.title}</p>
                    {item.endedNote && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{item.endedNote}"</p>}
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>🙏 ×{item.prayedDates?.length || 0}</p>
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
function RequestCard({ item, user, onTogglePrayed, onAddNote, onArchive, onEdit, onDelete, showPerson, person }) {
  const [showNotes, setShowNotes]   = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [noteText, setNoteText]     = useState('')

  const prio       = findPrio(item.priority || 3)
  const today      = TODAY()
  const prayedToday = item.prayedDates?.includes(today)
  const days       = daysSinceLastPrayed(item.prayedDates)
  const forgotten  = !prayedToday && (days === null || days > 7)

  const submitNote = () => {
    if (!noteText.trim()) return
    onAddNote(item.id, noteText.trim())
    setNoteText('')
    setAddingNote(false)
    setShowNotes(true)
  }

  return (
    <div style={{
      background: forgotten ? 'rgba(239,68,68,0.04)' : 'var(--surface)',
      border: `1px solid ${forgotten ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
      borderLeft: `3px solid ${prio.color}`,
      borderRadius: 12, padding: '12px 14px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{item.title}</p>
            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: prio.color + '22', color: prio.color, fontWeight: 700 }}>P{item.priority || 3}</span>
            {forgotten && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>⚠ zapomniana</span>}
          </div>
          {showPerson && person && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#8b5cf6' }}>{person.icon || '👤'} {person.name}</p>
          )}
          {item.note && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{item.note}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {item.prayedDates?.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                🙏 ×{item.prayedDates.length}
                {days === 0 && ' · dziś'}
                {days !== null && days > 0 && ` · ${days} dni temu`}
              </span>
            )}
            {item.notes?.length > 0 && (
              <button type="button" onClick={() => setShowNotes(v => !v)} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                📝 {item.notes.length} {item.notes.length === 1 ? 'notatka' : 'notatki'}
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button className="t-btn" onClick={onEdit}><IconEdit size={13} /></button>
          <button className="t-btn delete" onClick={() => onDelete(item.id)}><IconTrash size={13} /></button>
        </div>
      </div>

      {showNotes && item.notes?.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[...item.notes].sort((a, b) => b.date.localeCompare(a.date)).map(n => (
            <div key={n.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '6px 10px' }}>
              <p style={{ margin: 0, fontSize: 12 }}>{n.text}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{n.date}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button type="button" onClick={() => onTogglePrayed(item)} style={{
          flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600,
          border: `1px solid ${prayedToday ? '#27AE60' : 'var(--border)'}`,
          background: prayedToday ? 'rgba(39,174,96,0.15)' : 'transparent',
          color: prayedToday ? '#27AE60' : 'var(--text-muted)'
        }}>
          {prayedToday ? <><IconCheck size={12} /> Modlono dziś</> : <><IconPrayer size={12} /> Módl się</>}
        </button>
        <button type="button" onClick={() => setAddingNote(v => !v)} style={{
          padding: '8px 11px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
          border: `1px solid ${addingNote ? 'var(--primary)' : 'var(--border)'}`,
          background: addingNote ? 'rgba(201,75,40,0.1)' : 'transparent',
          color: addingNote ? 'var(--primary)' : 'var(--text-muted)'
        }}>📝</button>
        <button type="button" onClick={() => onArchive(item)} style={{
          padding: '8px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
          border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)'
        }}>Archiwizuj</button>
      </div>

      {addingNote && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Notatka z modlitwy..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitNote()}
            style={{ flex: 1, margin: 0, fontSize: 13 }}
            autoFocus
          />
          <button className="btn-save" style={{ padding: '0 14px', fontSize: 13 }} onClick={submitNote}>
            Dodaj
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── TodayView ──────────────────────────────────────────────────────────── */
function TodayView({ user, intentions, people }) {
  const today = TODAY()

  const togglePrayed = async (item) => {
    const prayed = item.prayedDates?.includes(today)
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), {
      prayedDates: prayed ? arrayRemove(today) : arrayUnion(today)
    })
  }

  const addNote = async (itemId, text) => {
    await updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', itemId), {
      notes: arrayUnion({ text, date: today, id: Date.now().toString() })
    })
  }

  const sorted = [...intentions].sort((a, b) => {
    const ap = a.prayedDates?.includes(today)
    const bp = b.prayedDates?.includes(today)
    if (ap && !bp) return 1
    if (!ap && bp) return -1
    return (b.priority || 3) - (a.priority || 3)
  })

  const prayedCount = intentions.filter(i => i.prayedDates?.includes(today)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {intentions.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{prayedCount}<span style={{ fontSize: 18, color: 'var(--text-muted)' }}>/{intentions.length}</span></p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>modlono dziś</p>
          {prayedCount > 0 && prayedCount === intentions.length && (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#27AE60', fontWeight: 600 }}>🙌 Wszystkie prośby modlone!</p>
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
            onTogglePrayed={togglePrayed}
            onAddNote={addNote}
            onArchive={async (item) => updateDoc(doc(db, 'users', user.uid, 'prayerIntentions', item.id), { status: 'ended', endedAt: Timestamp.now() })}
            onEdit={() => {}}
            onDelete={async (id) => { if (confirm('Usunąć?')) await deleteDoc(doc(db, 'users', user.uid, 'prayerIntentions', id)) }}
            showPerson
            person={person}
          />
        )
      })}

      {intentions.length === 0 && (
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
  const heatDates = Array.from({ length: 35 }, (_, i) => format(subDays(new Date(), 34 - i), 'yyyy-MM-dd'))

  const personStats = useMemo(() => people.map(p => {
    const mine = intentions.filter(i => i.personId === p.id && (i.status === 'active' || !i.status))
    const allDates = mine.flatMap(i => i.prayedDates || [])
    const lastDate = allDates.length ? [...allDates].sort().reverse()[0] : null
    const days = lastDate ? differenceInDays(new Date(), parseISO(lastDate)) : null
    return {
      ...p,
      totalPrays: allDates.length,
      days,
      prayedToday: allDates.includes(today),
      activeCount: mine.length
    }
  }).sort((a, b) => {
    if (a.prayedToday && !b.prayedToday) return 1
    if (!a.prayedToday && b.prayedToday) return -1
    return (b.days ?? 999) - (a.days ?? 999)
  }), [people, intentions, today])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
        <IconFlame size={36} style={{ color: 'var(--warn)' }} />
        <p style={{ margin: '6px 0 2px', fontSize: 28, fontWeight: 700 }}>{streak}</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>dni z rzędu</p>
      </div>

      <div className="chart-section">
        <h3 className="chart-title">Ostatnie 5 tygodni</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-muted)', paddingBottom: 4 }}>{d}</div>
          ))}
          {heatDates.map(d => (
            <div key={d} style={{ height: 24, borderRadius: 5, background: allPrayedDates.has(d) ? '#8b5cf6' : 'var(--surface)', border: `1px solid ${allPrayedDates.has(d) ? '#8b5cf6' : 'var(--border)'}` }} />
          ))}
        </div>
      </div>

      {personStats.length > 0 && (
        <div className="chart-section">
          <h3 className="chart-title">Osoby — jak często się modliłam</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {personStats.map(p => {
              const forgotten      = p.activeCount > 0 && !p.prayedToday && (p.days === null || p.days > 7)
              const almostForgotten = p.activeCount > 0 && !p.prayedToday && p.days !== null && p.days >= 3 && p.days <= 7
              return (
                <div key={p.id} style={{
                  background: forgotten ? 'rgba(239,68,68,0.05)' : almostForgotten ? 'rgba(249,115,22,0.05)' : 'var(--surface)',
                  border: `1px solid ${forgotten ? 'rgba(239,68,68,0.35)' : almostForgotten ? 'rgba(249,115,22,0.25)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <span style={{ fontSize: 20 }}>{p.icon || '👤'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{p.name}</p>
                      {p.prayedToday && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(39,174,96,0.15)', color: '#27AE60' }}>✓ dziś</span>}
                      {forgotten && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>zapomniana</span>}
                      {almostForgotten && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>dawno</span>}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      🙏 ×{p.totalPrays}
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

/* ─── IntentionForm ──────────────────────────────────────────────────────── */
function IntentionForm({ user, editData, personId, onClose }) {
  const [title, setTitle]       = useState(editData?.title || '')
  const [note, setNote]         = useState(editData?.note || '')
  const [priority, setPriority] = useState(editData?.priority || 3)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Wpisz treść prośby'); return }
    setSaving(true)
    const data = {
      title: title.trim(), note: note.trim(),
      personId: personId || editData?.personId || null,
      priority, updatedAt: Timestamp.now()
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
          autoFocus maxLength={150} placeholder="O co się modlisz?" />
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
function PersonForm({ user, editData, onClose }) {
  const [name, setName]     = useState(editData?.name || '')
  const [note, setNote]     = useState(editData?.note || '')
  const [icon, setIcon]     = useState(editData?.icon || '👤')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

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
              autoFocus maxLength={60} placeholder="np. Mama, Zuzia, Przyjaciel Paweł..." />
          </div>
          <div className="form-group">
            <label>Ikona</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{icon}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>lub wybierz:</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(expanded ? PERSON_ICONS : PERSON_ICONS.slice(0, 15)).map(i => (
                <button key={i} type="button" onClick={() => setIcon(i)} style={{
                  width: 36, height: 36, borderRadius: 8, fontSize: 20, cursor: 'pointer',
                  border: `2px solid ${icon === i ? 'var(--primary)' : 'var(--border)'}`,
                  background: icon === i ? 'rgba(201,75,40,0.1)' : 'transparent'
                }}>{i}</button>
              ))}
            </div>
            <button type="button" onClick={() => setExpanded(v => !v)}
              style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
              {expanded ? '▲ Mniej' : `▼ Więcej (${PERSON_ICONS.length - 15})`}
            </button>
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
