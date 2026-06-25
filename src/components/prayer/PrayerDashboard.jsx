import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, subDays, addDays, parseISO, differenceInDays, isBefore, startOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { ICON_CATALOG, CatIcon, IconEdit, IconTrash, IconClose, IconPrayer, IconUsers, IconChart, IconFlame, IconCheck, IconChevronLeft, IconChevronRight, IconChevronDown, IconCalendar, IconRepeat, IconArchive, IconRestore, IcCar } from '../Icons'
import { Heatmap } from '../ChartPrimitives'
import StatSummary from '../StatSummary'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'
import { setPersonHidden, purgePerson } from '../../utils/people'

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

// Wspólna paleta kolorów osób (ta sama co w Kalendarzu) — osoba jest współdzielona między modułami.
const PERSON_COLORS = [
  '#E74C3C','#E91E63','#9C27B0','#8B5CF6','#3F51B5','#2196F3',
  '#00BCD4','#009688','#4CAF50','#F59E0B','#FF9800','#FF5722',
  '#EC4899','#14B8A6','#84CC16','#6366F1',
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
  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 2, background: 'var(--accent)', opacity: 0.6 }} />
    {t}
  </div>
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
    // Wspólna baza osób z Kalendarzem — ta sama kolekcja `calendarPeople`.
    const q = query(collection(db, 'users', user.uid, 'calendarPeople'), orderBy('createdAt', 'asc'))
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
  // Osoby ukryte w modlitwie — ich prośby nie liczą się w aktywnym widoku/licznikach
  const hiddenPersonIds  = useMemo(() => new Set(people.filter(p => p.hiddenInPrayer).map(p => p.id)), [people])
  const liveIntentions   = intentions.filter(i => !(i.personId && hiddenPersonIds.has(i.personId)))
  const activeIntentions = liveIntentions.filter(i => i.status === 'active' || !i.status)
  // Na dziś = prośby bez okna (codzienne) + te, których okno obejmuje dzisiaj
  const dueToday         = activeIntentions.filter(i => {
    if (!i.scheduleFrom && !i.scheduleTo) return true
    return today >= (i.scheduleFrom || '0000-01-01') && today <= (i.scheduleTo || '9999-12-31')
  })
  const prayedToday      = dueToday.filter(i => i.prayedDates?.includes(today)).length

  const allPrayedDates = useMemo(() => new Set(liveIntentions.flatMap(i => i.prayedDates || [])), [liveIntentions])
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
            onClick={() => setCarMode(m => !m)}
            style={{
              width: 'auto', height: 32, padding: '0 12px', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              border: `1px solid ${carMode ? 'var(--accent)' : 'var(--border)'}`,
              background: carMode ? 'var(--accent)' : 'var(--surface)',
              color: carMode ? '#fff' : 'var(--text-sub)',
            }}
            title="Tryb auto (większe przyciski do prowadzenia)"
          ><IcCar size={15} /> Auto</button>
          <div className="prayer-stat-tile" style={{ padding: '4px 10px', gap: 6 }}>
            <IconFlame size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{streak}</span>
          </div>
          <div className="prayer-stat-tile" style={{ padding: '4px 10px', gap: 6 }}>
            <IconPrayer size={14} style={{ color: 'var(--warn)' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{prayedToday}/{dueToday.length}</span>
          </div>
        </div>
      </div>

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
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{streak}</div>
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
  const [showArchive, setShowArchive] = useState(false)
  const today = TODAY()

  const archivedPeople = people.filter(p => p.hiddenInPrayer)

  const withStats = useMemo(() => people.filter(p => !p.hiddenInPrayer).map(p => {
    const active = intentions.filter(i => i.personId === p.id && (i.status === 'active' || !i.status))
    const all    = intentions.filter(i => i.personId === p.id)
    const allDates = all.flatMap(i => i.prayedDates || [])
    const lastDate = allDates.length ? [...allDates].sort().reverse()[0] : null
    const days = lastDate ? differenceInDays(new Date(), parseISO(lastDate)) : null
    const prayedToday = allDates.includes(today)
    return { ...p, activeCount: active.length, totalPrays: allDates.length, days, prayedToday }
  }).sort((a, b) => {
    // Osoby bez aktywnych próśb na samym dole
    const aHas = a.activeCount > 0, bHas = b.activeCount > 0
    if (aHas !== bHas) return aHas ? -1 : 1
    // Reszta wg liczby modlitw (najwięcej u góry)
    if (b.totalPrays !== a.totalPrays) return b.totalPrays - a.totalPrays
    return a.name.localeCompare(b.name)
  }), [people, intentions, today])

  // Podpowiedź: najbardziej zaniedbana osoba z aktywną prośbą, jeszcze nie dziś
  const suggestion = useMemo(() => {
    const cand = withStats.filter(p => p.activeCount > 0 && !p.prayedToday)
    if (!cand.length) return null
    return [...cand].sort((a, b) => (b.days ?? 99999) - (a.days ?? 99999))[0]
  }, [withStats])

  const archivePersonH = async (id, e) => { e.stopPropagation(); await setPersonHidden(user.uid, id, 'prayer', true) }
  const restorePersonH = async (id, e) => { e.stopPropagation(); await setPersonHidden(user.uid, id, 'prayer', false) }
  const handleDeletePerson = async (id, e) => {
    e.stopPropagation()
    const ok = await confirmDialog({
      title: 'Usunąć osobę trwale?',
      message: 'Usunie też WSZYSTKIE jej prośby modlitewne i wydarzenia w Kalendarzu. Tego nie da się cofnąć. (Aby tylko ukryć w modlitwie — użyj Ukryj.)'
    })
    if (!ok) return
    await purgePerson(user.uid, id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button className="btn-add-habit" onClick={() => { setEditPerson(null); setShowForm(true) }}>
        + Dodaj osobę
      </button>

      {!carMode && suggestion && (
        <button onClick={() => onSelect(suggestion)} style={{
          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--surface), color-mix(in oklab, var(--accent) 12%, var(--surface)))',
          border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--border))',
          borderRadius: 12, padding: '11px 14px',
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'color-mix(in oklab, var(--accent) 16%, transparent)', color: 'var(--accent)' }}>
            <IconPrayer size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent)' }}>Pomódl się dziś za</div>
            <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {suggestion.name}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                {suggestion.days === null ? ' · jeszcze nie modlono' : ` · ${suggestion.days} dni temu`}
              </span>
            </div>
          </div>
          <IconChevronRight size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        </button>
      )}

      {withStats.length === 0 && archivedPeople.length === 0 && (
        <div className="list-empty">
          <p>Brak osób</p>
          <p className="list-empty-hint">Dodaj osoby za które chcesz się modlić</p>
        </div>
      )}

      {withStats.map(p => {
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
                  {p.prayedToday && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(39,174,96,0.15)', color: '#27AE60', display: 'inline-flex', alignItems: 'center', gap: 2 }}><IconCheck size={9} /> dziś</span>}
                  {(isNeglected || isAtRisk) && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: neglect.color + '22', color: neglect.color, fontWeight: 700 }}>
                      L{neglect.level} · {neglect.label}
                    </span>
                  )}
                </div>
                <p style={{ margin: '3px 0 0', fontSize: carMode ? 13 : 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span>{p.activeCount} {p.activeCount === 1 ? 'prośba' : p.activeCount < 5 ? 'prośby' : 'próśb'}</span>
                  {p.totalPrays > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      · <IconPrayer size={11} style={{ color: 'var(--accent)' }} /> ×{p.totalPrays}
                    </span>
                  )}
                  {p.days === 0 && <span>· modlono dziś</span>}
                  {p.days !== null && p.days > 0 && <span>· {p.days} dni temu</span>}
                  {p.days === null && p.activeCount > 0 && <span>· jeszcze nie modlono</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button className="t-btn" title="Edytuj" onClick={e => { e.stopPropagation(); setEditPerson(p); setShowForm(true) }}><IconEdit size={13} /></button>
                <button className="t-btn" title="Ukryj w modlitwie (zostaje w bazie Osób)" onClick={e => archivePersonH(p.id, e)}><IconArchive size={13} /></button>
                <button className="t-btn delete" title="Usuń trwale (z prośbami i wydarzeniami)" onClick={e => handleDeletePerson(p.id, e)}><IconTrash size={13} /></button>
              </div>
              <IconChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </div>
          )
        })}

      {archivedPeople.length > 0 && (
        <div>
          <button onClick={() => setShowArchive(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 12px', cursor: 'pointer',
            background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10,
            color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', marginTop: 4,
          }}>
            <IconArchive size={13} />
            <span style={{ flex: 1, textAlign: 'left' }}>Ukryte w modlitwie ({archivedPeople.length})</span>
            {showArchive ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </button>
          {showArchive && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {archivedPeople.map(p => {
                const all = intentions.filter(i => i.personId === p.id)
                const prays = all.flatMap(i => i.prayedDates || []).length
                return (
                  <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.75 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8b5cf6' }}>
                      <CatIcon categoryId={null} emoji={p.icon || 'IcUsers'} size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.name}
                        <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: 'var(--surface3)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Ukr.</span>
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        {all.length} {all.length === 1 ? 'prośba' : 'próśb'} · <IconPrayer size={10} /> ×{prays}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="t-btn" title="Pokaż w modlitwie" onClick={e => restorePersonH(p.id, e)}><IconRestore size={13} /></button>
                      <button className="t-btn delete" title="Usuń trwale" onClick={e => handleDeletePerson(p.id, e)}><IconTrash size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
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
        <button className="t-btn" onClick={onBack} style={{ padding: '4px 8px' }}><IconChevronLeft size={18} /></button>
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
          <button className="todo-done-toggle" onClick={() => setShowEnded(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {showEnded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />} Zarchiwizowane ({ended.length})
          </button>
          {showEnded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {ended.map(item => (
                <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', opacity: 0.65, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <IconCheck size={16} style={{ flexShrink: 0, color: '#27AE60', marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{item.title}</p>
                    {item.endedNote && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{item.endedNote}"</p>}
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <IconPrayer size={10} /> ×{item.prayedDates?.length || 0}
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
          {item.eventId ? (
            <p style={{ margin: '2px 0 0', fontSize: fs.badge, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 3 }}>
              <IconCalendar size={10} /> z kalendarza{item.eventDate ? ` · ${item.eventDate}` : ''}
              {item.scheduleFrom && ` · modlitwa ${item.scheduleFrom}–${item.scheduleTo}`}
            </p>
          ) : item.dateTo && (
            <p style={{ margin: '2px 0 0', fontSize: fs.badge, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <IconCalendar size={10} /> do {item.dateTo}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {item.prayedDates?.length > 0 && (
              <span style={{ fontSize: fs.badge, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <IconPrayer size={10} /> ×{item.prayedDates.length}
                {days === 0 && ' · dziś'}
                {days !== null && days > 0 && ` · ${days} dni temu`}
              </span>
            )}
            {item.notes?.length > 0 && (
              <button type="button" onClick={() => setShowNotes(v => !v)} style={{ fontSize: fs.badge, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <IconEdit size={10} /> {item.notes.length} {item.notes.length === 1 ? 'notatka' : 'notatki'}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    className="form-input"
                    value={editNoteText}
                    onChange={e => setEditNoteText(e.target.value)}
                    rows={3}
                    autoFocus
                    style={{ width: '100%', margin: 0, fontSize: fs.note, resize: 'vertical', minHeight: 72, lineHeight: 1.5, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingNoteId(null)} style={{ padding: '7px 14px', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)' }}>Anuluj</button>
                    <button className="btn-save" style={{ width: 'auto', margin: 0, padding: '7px 16px', fontSize: 12 }} onClick={() => submitEditNote(n)}>Zapisz</button>
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
          border: `1px solid ${addingNote ? 'var(--accent)' : 'var(--border)'}`,
          background: addingNote ? 'rgba(201,75,40,0.1)' : 'transparent',
          color: addingNote ? 'var(--accent)' : 'var(--text-muted)'
        }}><IconEdit size={carMode ? 18 : 13} /></button>
        {!carMode && (
          <button type="button" onClick={() => onArchive(item)} style={{
            padding: '8px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)'
          }}>Archiwizuj</button>
        )}
      </div>

      {addingNote && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            className="form-input"
            placeholder="Notatka z modlitwy..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && submitNote()}
            rows={3}
            autoFocus
            style={{ width: '100%', margin: 0, fontSize: fs.note, resize: 'vertical', minHeight: 80, lineHeight: 1.5, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setAddingNote(false); setNoteText('') }} style={{ padding: '8px 14px', fontSize: 13, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer' }}>
              Anuluj
            </button>
            <button className="btn-save" style={{ width: 'auto', margin: 0, padding: '8px 18px', fontSize: 13 }} onClick={submitNote}>
              Dodaj notatkę
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── TodayView ──────────────────────────────────────────────────────────── */
function TodayView({ user, intentions, people, carMode }) {
  const [viewDate, setViewDate] = useState(TODAY())
  const [editItem, setEditItem] = useState(null)

  const hiddenIds          = useMemo(() => new Set(people.filter(p => p.hiddenInPrayer).map(p => p.id)), [people])
  const activeIntentions   = intentions.filter(i => (i.status === 'active' || !i.status) && !(i.personId && hiddenIds.has(i.personId)))
  // Prośby z oknem czasowym (np. z wydarzenia) pokazują się tylko w swoich dniach; bez okna — codziennie.
  const visibleIntentions  = activeIntentions.filter(i => {
    if (!i.scheduleFrom && !i.scheduleTo) return true
    const from = i.scheduleFrom || '0000-01-01'
    const to   = i.scheduleTo   || '9999-12-31'
    return viewDate >= from && viewDate <= to
  })
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

  const sorted = [...visibleIntentions].sort((a, b) => {
    if ((a.priority || 3) === 5 && (b.priority || 3) !== 5) return -1
    if ((a.priority || 3) !== 5 && (b.priority || 3) === 5) return 1
    const ap = a.prayedDates?.includes(viewDate)
    const bp = b.prayedDates?.includes(viewDate)
    if (ap && !bp) return 1
    if (!ap && bp) return -1
    return (b.priority || 3) - (a.priority || 3)
  })

  const prayedCount = visibleIntentions.filter(i => i.prayedDates?.includes(viewDate)).length
  const isToday     = viewDate === TODAY()
  const dateLabel   = isToday ? 'Dziś' : format(parseISO(viewDate), 'EEEE, d MMMM', { locale: pl })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
        <button className="icon-btn" onClick={() => setViewDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))}><IconChevronLeft size={16} /></button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{dateLabel}</p>
          {!isToday && <button onClick={() => setViewDate(TODAY())} style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>wróć do dziś</button>}
        </div>
        <button className="icon-btn" onClick={() => setViewDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'))}><IconChevronRight size={16} /></button>
      </div>

      {visibleIntentions.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: carMode ? '18px' : '14px 16px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: carMode ? 36 : 28, fontWeight: 700 }}>{prayedCount}<span style={{ fontSize: carMode ? 24 : 18, color: 'var(--text-muted)' }}>/{visibleIntentions.length}</span></p>
          <p style={{ margin: '2px 0 0', fontSize: carMode ? 14 : 12, color: 'var(--text-muted)' }}>modlono {isToday ? 'dziś' : dateLabel.toLowerCase()}</p>
          {prayedCount > 0 && prayedCount === visibleIntentions.length && (
            <p style={{ margin: '6px 0 0', fontSize: carMode ? 15 : 13, color: '#27AE60', fontWeight: 600 }}>Wszystkie prośby modlone!</p>
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
            onEdit={() => setEditItem(item)}
            onDelete={async (id) => { const _ok = await confirmDialog({ title: 'Usunąć prośbę?' })
              if (_ok) await deleteDoc(doc(db, 'users', user.uid, 'prayerIntentions', id)) }}
            showPerson
            person={person}
          />
        )
      })}

      {editItem && (
        <IntentionForm user={user} editData={editItem} personId={editItem.personId} onClose={() => setEditItem(null)} />
      )}

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
                <IconCheck size={16} style={{ flexShrink: 0, color: '#27AE60', marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{item.title}</p>
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--surface3)', color: 'var(--text-muted)' }}>archiwum</span>
                  </div>
                  {person && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{person.name}</p>}
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><IconPrayer size={10} /> ×{item.prayedDates?.length || 0} łącznie</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {visibleIntentions.length === 0 && archivedPrayedOnDate.length === 0 && (
        <div className="list-empty">
          <p>Brak próśb na ten dzień</p>
          <p className="list-empty-hint">{isToday ? 'Dodaj prośby w zakładce Osoby lub przy wydarzeniu w Kalendarzu' : 'Tego dnia nic nie zaplanowano'}</p>
        </div>
      )}
    </div>
  )
}

/* ─── StatsView ──────────────────────────────────────────────────────────── */
function StatsView({ intentions, people, allPrayedDates, streak }) {
  const today    = TODAY()

  // „W liczbach" — miesiąc / rok
  const summary = useMemo(() => {
    const ym = format(new Date(), 'yyyy-MM'), yy = format(new Date(), 'yyyy')
    const allDates = intentions.flatMap(i => i.prayedDates || [])
    const active = intentions.filter(i => i.status === 'active' || !i.status).length
    const build = (pref) => {
      const inP = allDates.filter(d => d.startsWith(pref))
      const peopleSet = new Set(intentions.filter(i => (i.prayedDates || []).some(d => d.startsWith(pref))).map(i => i.personId))
      return [
        { label: 'Dni modlitwy', value: new Set(inP).size },
        { label: 'Modlitw', value: inP.length },
        { label: 'Za osoby', value: peopleSet.size },
        { label: 'Aktywne', value: active },
      ]
    }
    return { month: build(ym), year: build(yy) }
  }, [intentions])

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
      <StatSummary title="Modlitwa w liczbach" month={summary.month} year={summary.year} />

      {/* Aktywność modlitwy */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
        {kicker('Aktywność modlitwy')}
        <Heatmap weeks={WEEKS} accentHex="#C9A24A" data={heatData} />
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#C9A24A' }}>{regularPct}%</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>regularność</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{streak}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>seria dni</div>
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
                      {p.prayedToday && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(39,174,96,0.15)', color: '#27AE60' }}><IconCheck size={9} /> dziś</span>}
                      {(isNeglected || isAtRisk) && (
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: neglect.color + '20', color: neglect.color, fontWeight: 700 }}>
                          L{neglect.level} · {neglect.label}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <IconPrayer size={10} /> ×{p.totalPrays} · {p.totalIntentions} {p.totalIntentions === 1 ? 'prośba' : 'próśb'}
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
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                    {items.length} {items.length === 1 ? 'prośba' : 'próśb'} · <IconPrayer size={10} />×{groupPrays}
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
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><IconPrayer size={10} /> ×{item.prayedDates?.length || 0}</span>
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
                          <button className="t-btn" title="Historia" onClick={() => setExpandedId(v => v === item.id ? null : item.id)}>
                            <IconCalendar size={11} />
                          </button>
                        )}
                        <button className="t-btn" title="Przywróć" onClick={() => restoreItem(item)}>
                          <IconRepeat size={11} />
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
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj prośbę' : 'Nowa prośba modlitewna'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

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
  const [color, setColor]       = useState(editData?.color || PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)])
  const [iconSearch, setIconSearch] = useState('')
  const [saving, setSaving]     = useState(false)

  const filtered = iconSearch.trim()
    ? ICON_CATALOG.filter(ic => ic.label.toLowerCase().includes(iconSearch.toLowerCase()) || ic.group.toLowerCase().includes(iconSearch.toLowerCase()))
    : PERSON_ICON_CATALOG

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    // Osoba jest współdzielona z Kalendarzem → zapis do `calendarPeople`. Kolor używa Kalendarz, ikona/notatka — Modlitwa.
    const data = { name: name.trim(), note: note.trim(), icon: iconKey, color, updatedAt: Timestamp.now() }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'calendarPeople', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'calendarPeople'), { ...data, createdAt: Timestamp.now() })
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

          <div className="form-group">
            <label>Kolor (w Kalendarzu)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PERSON_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer', border: 'none',
                  boxShadow: color === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : 'none',
                  transition: 'box-shadow .15s',
                }} />
              ))}
            </div>
          </div>
          <button type="submit" className="btn-save" disabled={saving || !name.trim()}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz' : 'Dodaj osobę'}
          </button>
        </form>
      </div>
    </div>
  )
}
