import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  CatIcon, IconMoon, IconEdit, IconTrash, IconClose, IconChevronLeft, IconChevronRight,
  IconUsers, IconCheck, IconCalendar,
} from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import {
  DREAM_EMOTIONS, DREAM_CATEGORIES, getEmotion, getCategory, parseMentions, dreamPeopleIds,
} from '../../utils/dreams'

const TODAY = () => format(new Date(), 'yyyy-MM-dd')
const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtDate = (d, withYear = true) => {
  try { return format(parseISO(d), withYear ? 'd MMM yyyy' : 'd MMM', { locale: pl }) }
  catch { return d }
}

function Bubble({ person, size = 30 }) {
  const color = person?.color || '#8b5cf6'
  return (
    <div title={person?.name} style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color + '28', border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      fontSize: size * 0.34, fontWeight: 700,
    }}>
      {person?.icon ? <CatIcon categoryId={null} emoji={person.icon} size={size * 0.5} /> : initials(person?.name)}
    </div>
  )
}

const Chip = ({ color, children, onClick, active }) => (
  <span onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
    padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
    border: `1px solid ${active ? color : color + '44'}`,
    background: active ? color + '22' : color + '12', color,
    cursor: onClick ? 'pointer' : 'default',
  }}>{children}</span>
)

/* Treść snu z podświetlonymi @wzmiankami */
function DreamText({ text, peopleById }) {
  if (!text) return null
  const names = Object.values(peopleById).map(p => p.name).filter(Boolean)
    .sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = names.length
    ? text.split(new RegExp(`(@(?:${names.join('|')}))`, 'gu'))
    : [text]
  return (
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
      {parts.map((seg, i) => {
        if (seg?.startsWith('@')) {
          const name = seg.slice(1)
          const person = Object.values(peopleById).find(p => p.name === name)
          return <span key={i} style={{ color: person?.color || 'var(--accent)', fontWeight: 600 }}>{seg}</span>
        }
        return <span key={i}>{seg}</span>
      })}
    </p>
  )
}

export default function DreamDashboard({ user, focusId, onFocusConsumed }) {
  const [dreams, setDreams]   = useState([])
  const [people, setPeople]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [editDream, setEditDream]   = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'dreams'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => { setDreams(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) })
  }, [user.uid])
  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'calendarPeople'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  // Wejście z innego modułu (np. z karty osoby w „Osoby")
  useEffect(() => {
    if (focusId) { setSelectedId(focusId); onFocusConsumed?.() }
  }, [focusId])

  const peopleById = useMemo(() => Object.fromEntries(people.map(p => [p.id, p])), [people])

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const selected = dreams.find(d => d.id === selectedId)

  const deleteDream = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć ten sen?', message: 'Tego nie da się cofnąć.' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'dreams', id))
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="dream-dashboard">
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Sen</div>
          <div className="mod-header-title">{selected ? (selected.title || 'Sen') : 'Dziennik snów'}</div>
        </div>
        <div className="mod-header-right">
          <div className="prayer-stat-tile" style={{ padding: '4px 10px', gap: 6 }}>
            <IconMoon size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{dreams.length}</span>
          </div>
        </div>
      </div>

      {selected ? (
        <DreamDetail
          dream={selected}
          peopleById={peopleById}
          onBack={() => setSelectedId(null)}
          onEdit={() => { setEditDream(selected); setShowForm(true) }}
          onDelete={() => deleteDream(selected.id)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn-add-habit" onClick={() => { setEditDream(null); setShowForm(true) }}>
            + Zapisz sen
          </button>

          {dreams.length === 0 ? (
            <div className="list-empty">
              <p>Brak zapisanych snów</p>
              <p className="list-empty-hint">Zapisz, co Ci się śniło — emocje, kategorię i osoby, które się pojawiły</p>
            </div>
          ) : dreams.map(d => {
            const cat = getCategory(d.category)
            const linked = dreamPeopleIds(d).map(id => peopleById[id]).filter(Boolean)
            return (
              <div key={d.id} onClick={() => setSelectedId(d.id)} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${cat?.color || 'var(--accent)'}`,
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{d.title || 'Sen bez tytułu'}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconCalendar size={11} /> {fmtDate(d.date)}
                    </p>
                  </div>
                  {cat && <Chip color={cat.color}>{cat.label}</Chip>}
                  <IconChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 4 }} />
                </div>
                {d.text && (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {d.text}
                  </p>
                )}
                {(d.emotions?.length > 0 || linked.length > 0) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {d.emotions?.slice(0, 4).map(eid => {
                      const e = getEmotion(eid); if (!e) return null
                      return <Chip key={eid} color={e.color}>{e.label}</Chip>
                    })}
                    {d.emotions?.length > 4 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{d.emotions.length - 4}</span>}
                    {linked.length > 0 && (
                      <div style={{ display: 'flex', marginLeft: 'auto' }}>
                        {linked.slice(0, 5).map((p, i) => (
                          <div key={p.id} style={{ marginLeft: i ? -8 : 0 }}><Bubble person={p} size={24} /></div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <DreamForm
          user={user}
          people={people}
          editData={editDream}
          onClose={() => { setShowForm(false); setEditDream(null) }}
        />
      )}
    </div>
  )
}

/* ─── Szczegóły snu ───────────────────────────────────────────────────────── */
function DreamDetail({ dream, peopleById, onBack, onEdit, onDelete }) {
  const cat = getCategory(dream.category)
  const participants = (dream.peopleIds || []).map(id => peopleById[id]).filter(Boolean)
  const mentioned = (dream.mentionIds || []).filter(id => !(dream.peopleIds || []).includes(id))
    .map(id => peopleById[id]).filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="t-btn" onClick={onBack} style={{ padding: '4px 8px' }}><IconChevronLeft size={18} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{dream.title || 'Sen bez tytułu'}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconCalendar size={12} /> {fmtDate(dream.date)}
          </p>
        </div>
        <button className="t-btn" title="Edytuj" onClick={onEdit}><IconEdit size={15} /></button>
        <button className="t-btn delete" title="Usuń" onClick={onDelete}><IconTrash size={15} /></button>
      </div>

      {(cat || dream.emotions?.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {cat && <Chip color={cat.color} active>{cat.label}</Chip>}
          {dream.emotions?.map(eid => {
            const e = getEmotion(eid); if (!e) return null
            return <Chip key={eid} color={e.color} active>{e.label}</Chip>
          })}
        </div>
      )}

      {dream.text && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          <DreamText text={dream.text} peopleById={peopleById} />
        </div>
      )}

      {(participants.length > 0 || mentioned.length > 0) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconUsers size={12} /> Osoby w śnie
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {participants.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bubble person={p} size={30} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>uczestnik</span>
              </div>
            ))}
            {mentioned.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.8 }}>
                <Bubble person={p} size={30} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>wspomniana</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Formularz snu ───────────────────────────────────────────────────────── */
function DreamForm({ user, people, editData, onClose }) {
  const [title, setTitle]       = useState(editData?.title || '')
  const [date, setDate]         = useState(editData?.date || TODAY())
  const [text, setText]         = useState(editData?.text || '')
  const [category, setCategory] = useState(editData?.category || '')
  const [emotions, setEmotions] = useState(editData?.emotions || [])
  const [peopleIds, setPeopleIds] = useState(editData?.peopleIds || [])
  const [saving, setSaving]     = useState(false)

  const textRef = useRef(null)
  // Autouzupełnianie @wzmianek
  const [mention, setMention] = useState(null) // { query, start } | null
  const [caretPos, setCaretPos] = useState(null)

  const toggle = (arr, setArr, id) =>
    setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id])

  const onTextChange = (e) => {
    const val = e.target.value
    setText(val)
    const caret = e.target.selectionStart
    const before = val.slice(0, caret)
    const m = before.match(/@([\p{L}\p{N}]*)$/u)
    setMention(m ? { query: m[1], start: caret - m[1].length - 1 } : null)
  }

  const mentionMatches = useMemo(() => {
    if (!mention) return []
    const q = mention.query.toLowerCase()
    return people.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 6)
  }, [mention, people])

  const insertMention = (person) => {
    const ta = textRef.current
    const caret = ta ? ta.selectionStart : text.length
    const insert = '@' + person.name + ' '
    const next = text.slice(0, mention.start) + insert + text.slice(caret)
    setText(next)
    if (!peopleIds.includes(person.id)) setPeopleIds([...peopleIds, person.id])
    setMention(null)
    setCaretPos(mention.start + insert.length)
  }

  // Przywróć kursor po wstawieniu wzmianki
  useLayoutEffect(() => {
    if (caretPos != null && textRef.current) {
      textRef.current.focus()
      textRef.current.setSelectionRange(caretPos, caretPos)
      setCaretPos(null)
    }
  }, [caretPos, text])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() && !text.trim()) return
    setSaving(true)
    const mentionIds = parseMentions(text, people)
    const data = {
      title: title.trim(),
      date,
      text: text.trim(),
      category: category || null,
      emotions,
      peopleIds,
      mentionIds,
      updatedAt: Timestamp.now(),
    }
    try {
      if (editData) {
        await updateDoc(doc(db, 'users', user.uid, 'dreams', editData.id), data)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'dreams'), { ...data, createdAt: Timestamp.now() })
      }
      onClose()
    } catch { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{editData ? 'Edytuj sen' : 'Nowy sen'}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Tytuł snu</label>
            <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)}
              maxLength={120} placeholder="np. Lot nad miastem, Spotkanie z babcią..." autoFocus />
          </div>

          <div className="form-group">
            <label>Data</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} max={TODAY()} />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label>Treść snu <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— wpisz @ aby wspomnieć osobę</span></label>
            <textarea ref={textRef} className="form-input" value={text} onChange={onTextChange}
              rows={6} placeholder="Opisz, co Ci się śniło... Wpisz @ i imię, aby oznaczyć osobę."
              style={{ resize: 'vertical', minHeight: 130, lineHeight: 1.6 }} />
            {mention && mentionMatches.length > 0 && (
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20, marginTop: -6,
                background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)', overflow: 'hidden',
              }}>
                {mentionMatches.map(p => (
                  <button type="button" key={p.id} onClick={() => insertMention(p)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px',
                    background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                    <Bubble person={p} size={26} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</span>
                    {p.note && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.note}</span>}
                  </button>
                ))}
              </div>
            )}
            {mention && mentionMatches.length === 0 && people.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Brak osób w bazie — dodaj je w module „Osoby".
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Kategoria snu</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DREAM_CATEGORIES.map(c => (
                <Chip key={c.id} color={c.color} active={category === c.id}
                  onClick={() => setCategory(category === c.id ? '' : c.id)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Emocje po obudzeniu <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— można wybrać kilka</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DREAM_EMOTIONS.map(em => (
                <Chip key={em.id} color={em.color} active={emotions.includes(em.id)}
                  onClick={() => toggle(emotions, setEmotions, em.id)}>
                  {em.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Osoby, które brały udział w śnie</label>
            {people.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Brak osób — dodaj je w module „Osoby", a pojawią się tutaj i po wpisaniu @.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {people.map(p => {
                  const on = peopleIds.includes(p.id)
                  return (
                    <button type="button" key={p.id} onClick={() => toggle(peopleIds, setPeopleIds, p.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 5px', borderRadius: 999,
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                      border: `1px solid ${on ? (p.color || 'var(--accent)') : 'var(--border)'}`,
                      background: on ? (p.color || 'var(--accent)') + '1e' : 'var(--surface2)',
                      color: on ? (p.color || 'var(--accent)') : 'var(--text-sub)',
                    }}>
                      <Bubble person={p} size={24} />
                      {p.name}
                      {on && <IconCheck size={13} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button type="submit" className="btn-save" disabled={saving || (!title.trim() && !text.trim())}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Zapisz sen'}
          </button>
        </form>
      </div>
    </div>
  )
}
