import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  ICON_CATALOG, CatIcon, IconEdit, IconTrash, IconClose, IconCalendar, IconPrayer,
  IconChevronRight, IconChevronLeft, IconUsers, IconEye, IconEyeOff, IconCheck, IconMoon
} from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import { setPersonHidden, purgePerson } from '../../utils/people'
import { getCategory, dreamPeopleIds } from '../../utils/dreams'

const PERSON_COLORS = [
  '#E74C3C','#E91E63','#9C27B0','#8B5CF6','#3F51B5','#2196F3',
  '#00BCD4','#009688','#4CAF50','#F59E0B','#FF9800','#FF5722',
  '#EC4899','#14B8A6','#84CC16','#6366F1',
]
const TODAY = () => format(new Date(), 'yyyy-MM-dd')
const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

function Bubble({ person, size = 44 }) {
  const color = person.color || '#8b5cf6'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color + '28', border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      fontSize: size * 0.36, fontWeight: 700, letterSpacing: '-0.02em',
    }}>
      {person.icon ? <CatIcon categoryId={null} emoji={person.icon} size={size * 0.5} /> : initials(person.name)}
    </div>
  )
}

export default function PeopleHub({ user, onOpenDream }) {
  const [people, setPeople]         = useState([])
  const [events, setEvents]         = useState([])
  const [intentions, setIntentions] = useState([])
  const [dreams, setDreams]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [editPerson, setEditPerson] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'calendarPeople'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => { setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) })
  }, [user.uid])
  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'calendarEvents'), orderBy('date', 'asc'))
    return onSnapshot(q, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])
  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'prayerIntentions'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setIntentions(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])
  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'dreams'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => setDreams(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  const stats = useMemo(() => {
    const m = {}
    people.forEach(p => { m[p.id] = { events: 0, intentions: 0, dreams: 0 } })
    events.forEach(e => { if (e.personId && m[e.personId]) m[e.personId].events++ })
    intentions.forEach(i => { if (i.personId && m[i.personId]) m[i.personId].intentions++ })
    dreams.forEach(d => { dreamPeopleIds(d).forEach(pid => { if (m[pid]) m[pid].dreams++ }) })
    return m
  }, [people, events, intentions, dreams])

  const toggleHidden = async (person, module) => {
    const field = module === 'calendar' ? 'hiddenInCalendar' : 'hiddenInPrayer'
    await setPersonHidden(user.uid, person.id, module, !person[field])
  }
  const deletePersonH = async (id) => {
    const ok = await confirmDialog({
      title: 'Usunąć osobę trwale?',
      message: 'Usunie też WSZYSTKIE jej wydarzenia i prośby modlitewne. Tego nie da się cofnąć.'
    })
    if (!ok) return
    await purgePerson(user.uid, id)
    if (selectedId === id) setSelectedId(null)
  }

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const selected = people.find(p => p.id === selectedId)

  return (
    <div className="people-hub">
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Osoby</div>
          <div className="mod-header-title">{selected ? selected.name : 'Baza osób'}</div>
        </div>
        <div className="mod-header-right">
          <div className="prayer-stat-tile" style={{ padding: '4px 10px', gap: 6 }}>
            <IconUsers size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{people.length}</span>
          </div>
        </div>
      </div>

      {selected ? (
        <PersonDetail
          uid={user.uid}
          person={selected}
          events={events.filter(e => e.personId === selected.id)}
          intentions={intentions.filter(i => i.personId === selected.id)}
          dreams={dreams.filter(d => dreamPeopleIds(d).includes(selected.id))}
          onOpenDream={onOpenDream}
          onBack={() => setSelectedId(null)}
          onToggleHidden={toggleHidden}
          onEdit={() => { setEditPerson(selected); setShowForm(true) }}
          onDelete={() => deletePersonH(selected.id)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn-add-habit" onClick={() => { setEditPerson(null); setShowForm(true) }}>
            + Dodaj osobę
          </button>

          {people.length === 0 ? (
            <div className="list-empty">
              <p>Brak osób</p>
              <p className="list-empty-hint">Osoby dodane tutaj, w Kalendarzu lub w Modlitwie trafiają do wspólnej bazy</p>
            </div>
          ) : people.map(p => {
            const s = stats[p.id] || { events: 0, intentions: 0 }
            return (
              <div key={p.id} onClick={() => setSelectedId(p.id)} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${p.color || '#8b5cf6'}`,
                borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'
              }}>
                <Bubble person={p} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{p.name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconCalendar size={11} /> {s.events}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconPrayer size={11} /> {s.intentions}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconMoon size={11} /> {s.dreams}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <VisToggle active={!p.hiddenInCalendar} label="Kalendarz" Icon={IconCalendar} onClick={() => toggleHidden(p, 'calendar')} />
                  <VisToggle active={!p.hiddenInPrayer} label="Modlitwa" Icon={IconPrayer} onClick={() => toggleHidden(p, 'prayer')} />
                </div>
                <IconChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <PersonForm user={user} editData={editPerson} onClose={() => { setShowForm(false); setEditPerson(null) }} />
      )}
    </div>
  )
}

/* Mały przełącznik widoczności w module */
function VisToggle({ active, label, Icon, onClick }) {
  return (
    <button title={`${label}: ${active ? 'widoczna' : 'ukryta'}`} onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 7px', borderRadius: 8, cursor: 'pointer',
      fontSize: 10, fontWeight: 600, fontFamily: 'inherit',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      background: active ? 'var(--accent-soft)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
    }}>
      <Icon size={12} />
      {active ? <IconEye size={11} /> : <IconEyeOff size={11} />}
    </button>
  )
}

/* ─── PersonDetail ─────────────────────────────────────────────────────── */
function PersonDetail({ uid, person, events, intentions, dreams = [], onOpenDream, onBack, onToggleHidden, onEdit, onDelete }) {
  const today = TODAY()
  const personDreams = [...dreams].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const upcoming = events.filter(e => (e.dateEnd || e.date) >= today).sort((a, b) => a.date.localeCompare(b.date))
  const past     = events.filter(e => (e.dateEnd || e.date) < today).sort((a, b) => b.date.localeCompare(a.date))
  const activeInt = intentions.filter(i => i.status === 'active' || !i.status)
  const endedInt  = intentions.filter(i => i.status === 'ended')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Nagłówek osoby */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="t-btn" onClick={onBack} style={{ padding: '4px 8px' }}><IconChevronLeft size={18} /></button>
        <Bubble person={person} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{person.name}</p>
          {person.note && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{person.note}</p>}
        </div>
        <button className="t-btn" title="Edytuj" onClick={onEdit}><IconEdit size={15} /></button>
        <button className="t-btn delete" title="Usuń trwale" onClick={onDelete}><IconTrash size={15} /></button>
      </div>

      {/* Widoczność w modułach */}
      <div style={{ display: 'flex', gap: 8 }}>
        <ModuleSwitch active={!person.hiddenInCalendar} label="Kalendarz" Icon={IconCalendar} onClick={() => onToggleHidden(person, 'calendar')} />
        <ModuleSwitch active={!person.hiddenInPrayer} label="Modlitwa" Icon={IconPrayer} onClick={() => onToggleHidden(person, 'prayer')} />
      </div>

      {/* Ważne informacje */}
      <InfoNotes uid={uid} person={person} />

      {/* Prośby modlitewne */}
      <Section title="Prośby modlitewne" icon={<IconPrayer size={13} />}>
        {activeInt.length === 0 && endedInt.length === 0 ? (
          <Empty>Brak próśb modlitewnych</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeInt.map(i => (
              <Row key={i.id} color="#C9A24A">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{i.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <IconPrayer size={10} /> ×{i.prayedDates?.length || 0}
                    {i.eventId && <span style={{ color: '#a78bfa' }}>· z kalendarza</span>}
                  </div>
                </div>
              </Row>
            ))}
            {endedInt.map(i => (
              <Row key={i.id} color="var(--border)" muted>
                <IconCheck size={14} style={{ color: '#27AE60', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{i.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>zakończona · <IconPrayer size={9} /> ×{i.prayedDates?.length || 0}</div>
                </div>
              </Row>
            ))}
          </div>
        )}
      </Section>

      {/* Sny */}
      <Section title="Sny" icon={<IconMoon size={13} />}>
        {personDreams.length === 0 ? (
          <Empty>Brak snów z tą osobą</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {personDreams.map(d => {
              const cat = getCategory(d.category)
              return (
                <div key={d.id} onClick={() => onOpenDream?.(d.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  background: 'var(--surface2)', borderLeft: `3px solid ${cat?.color || '#6366F1'}`,
                  borderRadius: 8, padding: '8px 10px',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {(() => { try { return format(parseISO(d.date), 'd MMM yy', { locale: pl }) } catch { return d.date } })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.title || 'Sen bez tytułu'}
                    </div>
                    {cat && <div style={{ fontSize: 10, color: cat.color }}>{cat.label}</div>}
                  </div>
                  <IconChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Wydarzenia / wyjazdy */}
      <Section title="Wydarzenia i wyjazdy" icon={<IconCalendar size={13} />}>
        {upcoming.length === 0 && past.length === 0 ? (
          <Empty>Brak wydarzeń</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcoming.map(e => (
              <Row key={e.id} color={person.color || '#5FBF98'}>
                <div style={{ fontSize: 11, color: person.color || '#5FBF98', fontWeight: 700, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {format(parseISO(e.date), 'd MMM', { locale: pl })}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</div>
                  {e.note && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{e.note}</div>}
                </div>
                {e.prayer?.enabled && <IconPrayer size={12} style={{ color: '#a78bfa', flexShrink: 0 }} />}
              </Row>
            ))}
            {past.length > 0 && (
              <details>
                <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, listStyle: 'none', padding: '4px 0' }}>
                  <IconChevronRight size={11} style={{ verticalAlign: 'middle' }} /> Minione ({past.length})
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {past.map(e => (
                    <Row key={e.id} color={person.color || '#5FBF98'} muted>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {format(parseISO(e.date), 'd MMM yy', { locale: pl })}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{e.title}</div>
                    </Row>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}

function ModuleSwitch({ active, label, Icon, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, cursor: 'pointer',
      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      background: active ? 'var(--accent-soft)' : 'var(--surface2)',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
    }}>
      <Icon size={14} /> {label} {active ? <IconEye size={13} /> : <IconEyeOff size={13} />}
    </button>
  )
}

/* Ważne informacje — edytowalna notatka per osoba */
function InfoNotes({ uid, person }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(person.info || '')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setText(person.info || ''); setEditing(false) }, [person.id])

  const save = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', uid, 'calendarPeople', person.id), { info: text.trim() })
      setEditing(false)
    } finally { setSaving(false) }
  }

  return (
    <Section title="Ważne informacje" icon={<IconEdit size={12} />}>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea className="form-input" value={text} onChange={e => setText(e.target.value)} rows={4} autoFocus
            placeholder="Co warto pamiętać o tej osobie..."
            style={{ width: '100%', margin: 0, fontSize: 13, resize: 'vertical', minHeight: 90, lineHeight: 1.5, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setText(person.info || ''); setEditing(false) }} style={{ padding: '7px 14px', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)' }}>Anuluj</button>
            <button className="btn-save" style={{ width: 'auto', margin: 0, padding: '7px 16px', fontSize: 12 }} disabled={saving} onClick={save}>{saving ? '...' : 'Zapisz'}</button>
          </div>
        </div>
      ) : person.info ? (
        <div onClick={() => setEditing(true)} style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', cursor: 'text', lineHeight: 1.5 }}>{person.info}</div>
      ) : (
        <button onClick={() => setEditing(true)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Dodaj informacje</button>
      )}
    </Section>
  )
}

/* drobne helpery wizualne */
function Section({ title, icon, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon} {title}
      </div>
      {children}
    </div>
  )
}
function Row({ color, muted, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '8px 10px', opacity: muted ? 0.6 : 1 }}>
      {children}
    </div>
  )
}
function Empty({ children }) {
  return <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{children}</div>
}

/* ─── PersonForm ───────────────────────────────────────────────────────── */
function PersonForm({ user, editData, onClose }) {
  const [name, setName]     = useState(editData?.name || '')
  const [note, setNote]     = useState(editData?.note || '')
  const [info, setInfo]     = useState(editData?.info || '')
  const [icon, setIcon]     = useState(editData?.icon || 'IcUsers')
  const [color, setColor]   = useState(editData?.color || PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)])
  const [iconSearch, setIconSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = iconSearch.trim()
    ? ICON_CATALOG.filter(ic => ic.label.toLowerCase().includes(iconSearch.toLowerCase()) || ic.group.toLowerCase().includes(iconSearch.toLowerCase()))
    : ICON_CATALOG

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const data = { name: name.trim(), note: note.trim(), info: info.trim(), icon, color, updatedAt: Timestamp.now() }
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
            <label>Kolor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PERSON_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer', border: 'none',
                  boxShadow: color === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : 'none',
                }} />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Ikona</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Bubble person={{ name, color, icon }} size={42} />
              <input type="text" className="form-input" value={iconSearch} onChange={e => setIconSearch(e.target.value)}
                placeholder="Szukaj ikony..." style={{ margin: 0, flex: 1 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
              {filtered.map(ic => (
                <button key={ic.key} type="button" title={ic.label} onClick={() => setIcon(ic.key)} style={{
                  width: '100%', aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                  border: `2px solid ${icon === ic.key ? color : 'var(--border)'}`,
                  background: icon === ic.key ? color + '22' : 'transparent',
                  color: icon === ic.key ? color : 'var(--text-muted)',
                }}>
                  <CatIcon categoryId={null} emoji={ic.key} size={17} />
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Krótki opis (opcjonalnie)</label>
            <input type="text" className="form-input" value={note} onChange={e => setNote(e.target.value)}
              maxLength={120} placeholder="np. siostra, kolega z pracy..." />
          </div>

          <div className="form-group">
            <label>Ważne informacje (opcjonalnie)</label>
            <textarea className="form-input" value={info} onChange={e => setInfo(e.target.value)}
              rows={3} maxLength={1000} placeholder="Co warto pamiętać..." style={{ resize: 'vertical', minHeight: 70, lineHeight: 1.5 }} />
          </div>

          <button type="submit" className="btn-save" disabled={saving || !name.trim()}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz' : 'Dodaj osobę'}
          </button>
        </form>
      </div>
    </div>
  )
}
