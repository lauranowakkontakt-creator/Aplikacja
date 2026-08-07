import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import useFallbackTimeout from '../../utils/useFallbackTimeout'
import { format, parseISO, startOfMonth, getDaysInMonth, addDays, addMonths, subMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  CatIcon, IconMoon, IconEdit, IconTrash, IconClose, IconChevronLeft, IconChevronRight,
  IconUsers, IconCheck, IconCalendar, IconTag, IconPlus,
} from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import DreamMenu from './DreamMenu'
import { toast } from '../Toast'
import {
  DREAM_EMOTIONS, DREAM_CATEGORIES, SYMBOL_COLORS, getEmotion, getCategory,
  parseMentions, dreamPeopleIds, scrubSymbolFromDreams, personForms, nameStem,
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

// Pigułka symbolu — z prefiksem #
const SymbolChip = ({ symbol, onClick }) => (
  <Chip color={symbol.color || '#5BB6D9'} onClick={onClick}>
    <span style={{ opacity: 0.65 }}>#</span>{symbol.name}
  </Chip>
)

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const WORD_RE = /^[\p{L}\p{N}]+$/u

/* Treść snu: osoby jako @Imię (dokładne, pewne podświetlenie), symbole jako słowo.
   Bez lookbehind, żeby działało też na starszym Safari/iOS. */
function DreamText({ text, highlightPeople = [], highlightSymbols = [] }) {
  if (!text) return null
  const baseStyle = { margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }

  // Każda osoba może być oznaczona wieloma formami (imię, ksywka…). Najdłuższa forma wygrywa.
  const formToPerson = {}
  for (const p of highlightPeople) for (const f of personForms(p)) if (!(f in formToPerson)) formToPerson[f] = p
  const pNames = [...new Set(Object.keys(formToPerson))].sort((a, b) => b.length - a.length)
  const syms = highlightSymbols.filter(s => s.name?.trim()).map(s => ({ sym: s, low: s.name.toLowerCase() }))

  // Podświetl symbole w zwykłym fragmencie tekstu (dopasowanie po nazwie/prefiksie)
  const renderSymbols = (str, keyBase) => {
    if (!syms.length || !str) return str
    return str.split(/([\p{L}\p{N}]+)/u).map((seg, i) => {
      if (seg && WORD_RE.test(seg)) {
        const low = seg.toLowerCase()
        const m = syms.find(s => low === s.low || (s.low.length >= 4 && low.startsWith(s.low)))
        if (m) return <span key={`${keyBase}-${i}`} style={{ color: m.sym.color || '#5BB6D9', fontWeight: 600 }}>{seg}</span>
      }
      return <span key={`${keyBase}-${i}`}>{seg}</span>
    })
  }

  // Najpierw rozdziel po @Imię, resztę przepuść przez podświetlanie symboli
  const personRe = pNames.length ? new RegExp(`(@(?:${pNames.map(escRe).join('|')}))`, 'gu') : null
  const chunks = personRe ? text.split(personRe) : [text]

  return (
    <p style={baseStyle}>
      {chunks.map((chunk, ci) => {
        if (chunk && chunk.startsWith('@') && formToPerson[chunk.slice(1)]) {
          const person = formToPerson[chunk.slice(1)]
          const form = chunk.slice(1) // dokładnie ta forma, którą wybrano przy pisaniu (imię/ksywka/pełne)
          return (
            <span key={ci} title={person.name} style={{
              color: person.color || 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap',
            }}>{form}</span>
          )
        }
        return <span key={ci}>{renderSymbols(chunk || '', `c${ci}`)}</span>
      })}
    </p>
  )
}

export default function DreamDashboard({ user, focusId, onFocusConsumed, setHeaderExtras }) {
  const [dreams, setDreams]   = useState([])
  const [people, setPeople]   = useState([])
  const [symbols, setSymbols] = useState([])
  const [loading, setLoading] = useState(true)
  useFallbackTimeout(() => setLoading(false))
  const [tab, setTab]         = useState('dreams') // 'dreams' | 'symbols'
  const [selectedId, setSelectedId] = useState(null)
  const [selectedSymbolId, setSelectedSymbolId] = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [editDream, setEditDream]   = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'dreams'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => { setDreams(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) },
      err => { console.error('dreams subscription error:', err); setLoading(false) })
  }, [user.uid])
  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'calendarPeople'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])
  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'dreamSymbols'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setSymbols(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  // Wejście z innego modułu (np. z karty osoby w „Osoby")
  useEffect(() => {
    if (focusId) { setSelectedId(focusId); setTab('dreams'); onFocusConsumed?.() }
  }, [focusId])

  const peopleById  = useMemo(() => Object.fromEntries(people.map(p => [p.id, p])), [people])
  const symbolsById = useMemo(() => Object.fromEntries(symbols.map(s => [s.id, s])), [symbols])

  // Liczba snów per symbol
  const symbolCounts = useMemo(() => {
    const m = {}
    symbols.forEach(s => { m[s.id] = 0 })
    dreams.forEach(d => (d.symbolIds || []).forEach(sid => { if (m[sid] != null) m[sid]++ }))
    return m
  }, [symbols, dreams])

  // Górna belka („Mój Świat"): [＋ Zapisz sen][⋮ Symbole / Statystyki].
  // Hook przed early-returnem (zasady hooków).
  useEffect(() => {
    setHeaderExtras?.(
      <>
        <DreamMenu onAction={(id) => { setSelectedId(null); setSelectedSymbolId(null); setTab(id) }} />
        <button className="hdr-btn accent" title="Zapisz sen" onClick={() => { setEditDream(null); setShowForm(true) }}><IconPlus size={17} /></button>
      </>
    )
    return () => setHeaderExtras?.(null)
  }, [])

  if (loading) return <div className="list-loading">Ładowanie...</div>

  const selected = dreams.find(d => d.id === selectedId)

  const deleteDream = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć ten sen?', message: 'Tego nie da się cofnąć.' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'dreams', id))
    if (selectedId === id) setSelectedId(null)
  }

  const createSymbol = async (name) => {
    const color = SYMBOL_COLORS[Math.floor(Math.random() * SYMBOL_COLORS.length)]
    const ref = await addDoc(collection(db, 'users', user.uid, 'dreamSymbols'), {
      name: name.trim(), color, createdAt: Timestamp.now(),
    })
    return { id: ref.id, name: name.trim(), color }
  }

  const openSymbol = (id) => { setSelectedId(null); setTab('symbols'); setSelectedSymbolId(id) }

  return (
    <div className="dream-dashboard">
      {/* Podstrona Symbole / Statystyki — pasek ze strzałką wstecz do dziennika */}
      {!selected && (tab === 'symbols' || tab === 'stats') && (
        <div className="rev-subhead">
          <button className="rev-back" onClick={() => { setTab('dreams'); setSelectedSymbolId(null) }} title="Wróć"><IconChevronLeft size={18} /></button>
          <div className="rev-subhead-title">{tab === 'symbols' ? 'Symbole' : 'Statystyki'}</div>
        </div>
      )}

      {selected ? (
        <DreamDetail
          dream={selected}
          peopleById={peopleById}
          symbolsById={symbolsById}
          onBack={() => setSelectedId(null)}
          onOpenSymbol={openSymbol}
          onEdit={() => { setEditDream(selected); setShowForm(true) }}
          onDelete={() => deleteDream(selected.id)}
        />
      ) : tab === 'stats' ? (
        <DreamStats dreams={dreams} />
      ) : tab === 'symbols' ? (
        <SymbolsView
          user={user}
          symbols={symbols}
          dreams={dreams}
          counts={symbolCounts}
          peopleById={peopleById}
          symbolsById={symbolsById}
          selectedSymbolId={selectedSymbolId}
          onSelectSymbol={setSelectedSymbolId}
          onOpenDream={(id) => setSelectedId(id)}
          onCreateSymbol={createSymbol}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dreams.length === 0 ? (
            <div className="list-empty">
              <p>Brak zapisanych snów</p>
              <p className="list-empty-hint">Zapisz, co Ci się śniło — emocje, kategorię, osoby (@) i symbole (#)</p>
            </div>
          ) : dreams.map(d => (
            <DreamCard key={d.id} dream={d} peopleById={peopleById} symbolsById={symbolsById} onClick={() => setSelectedId(d.id)} />
          ))}
        </div>
      )}

      {showForm && (
        <DreamForm
          user={user}
          people={people}
          symbols={symbols}
          onCreateSymbol={createSymbol}
          editData={editDream}
          onClose={() => { setShowForm(false); setEditDream(null) }}
        />
      )}
    </div>
  )
}

/* ─── Kafelek snu na liście ──────────────────────────────────────────────── */
function DreamCard({ dream: d, peopleById, symbolsById, onClick }) {
  const cat = getCategory(d.category)
  const linked = dreamPeopleIds(d).map(id => peopleById[id]).filter(Boolean)
  const syms = (d.symbolIds || []).map(id => symbolsById[id]).filter(Boolean)
  return (
    <div onClick={onClick} style={{
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
      {(d.emotions?.length > 0 || syms.length > 0 || linked.length > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {d.emotions?.slice(0, 3).map(eid => {
            const e = getEmotion(eid); if (!e) return null
            return <Chip key={eid} color={e.color}>{e.label}</Chip>
          })}
          {syms.slice(0, 3).map(s => <SymbolChip key={s.id} symbol={s} />)}
          {linked.length > 0 && (
            <div style={{ display: 'flex', marginLeft: 'auto', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {linked.slice(0, 4).map(p => (
                <Bubble key={p.id} person={p} size={24} />
              ))}
              {linked.length > 4 && (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--surface3)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                }}>+{linked.length - 4}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Widok Symbole (katalog + sny danego symbolu) ───────────────────────── */
function SymbolsView({ user, symbols, dreams, counts, peopleById, symbolsById, selectedSymbolId, onSelectSymbol, onOpenDream, onCreateSymbol }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const selected = symbols.find(s => s.id === selectedSymbolId)

  const sorted = useMemo(
    () => [...symbols].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.name.localeCompare(b.name)),
    [symbols, counts]
  )

  const add = async () => {
    const n = name.trim()
    if (!n) return
    if (!symbols.some(s => s.name.toLowerCase() === n.toLowerCase())) await onCreateSymbol(n)
    setName(''); setAdding(false)
  }

  const remove = async (s) => {
    const ok = await confirmDialog({
      title: `Usunąć symbol „${s.name}"?`,
      message: 'Zniknie ze spisu i zostanie odpięty od snów (same sny zostają).',
    })
    if (!ok) return
    try {
      // Najpierw kasujemy sam symbol (główna akcja) — nawet gdyby odpinanie od snów zawiodło.
      await deleteDoc(doc(db, 'users', user.uid, 'dreamSymbols', s.id))
      if (selectedSymbolId === s.id) onSelectSymbol(null)
      // Odpięcie od snów jest poboczne — błąd tutaj nie może blokować usunięcia symbolu.
      try { await scrubSymbolFromDreams(user.uid, s.id) } catch {}
      toast.success('Symbol usunięty')
    } catch (err) {
      toast.error('Nie udało się usunąć symbolu: ' + (err?.message || 'błąd'))
    }
  }

  // Widok pojedynczego symbolu — jego sny
  if (selected) {
    const its = dreams.filter(d => (d.symbolIds || []).includes(selected.id))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="t-btn" onClick={() => onSelectSymbol(null)} style={{ padding: '4px 8px' }}><IconChevronLeft size={18} /></button>
          <SymbolChip symbol={selected} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>w {its.length} {its.length === 1 ? 'śnie' : 'snach'}</span>
          <button className="t-btn delete" title="Usuń symbol" onClick={() => remove(selected)} style={{ marginLeft: 'auto' }}><IconTrash size={14} /></button>
        </div>
        {its.length === 0 ? (
          <div className="list-empty"><p>Brak snów z tym symbolem</p></div>
        ) : its.map(d => (
          <DreamCard key={d.id} dream={d} peopleById={peopleById} symbolsById={symbolsById} onClick={() => onOpenDream(d.id)} />
        ))}
      </div>
    )
  }

  // Katalog symboli
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {adding ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" value={name} autoFocus placeholder="np. drzewo, dom, woda..."
            maxLength={40} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') { setAdding(false); setName('') } }}
            style={{ flex: 1, minWidth: 0 }} />
          <button className="btn-save" style={{ width: 'auto', margin: 0, padding: '0 16px' }} onClick={add}>Dodaj</button>
        </div>
      ) : (
        <button className="btn-add-account" onClick={() => setAdding(true)}>+ Dodaj symbol</button>
      )}

      {symbols.length === 0 ? (
        <div className="list-empty">
          <p>Brak symboli</p>
          <p className="list-empty-hint">Dodaj symbol tutaj lub wpisz # w treści snu (np. #drzewo)</p>
        </div>
      ) : sorted.map(s => {
        const c = counts[s.id] || 0
        return (
          <div key={s.id} onClick={() => onSelectSymbol(s.id)} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${s.color || '#5BB6D9'}`,
            borderRadius: 12, padding: '11px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center',
              background: (s.color || '#5BB6D9') + '22', color: s.color || '#5BB6D9',
            }}>
              <IconTag size={17} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                <span style={{ opacity: 0.5 }}>#</span>{s.name}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                {c === 0 ? 'jeszcze w żadnym śnie' : `w ${c} ${c === 1 ? 'śnie' : c < 5 ? 'snach' : 'snach'}`}
              </p>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: s.color || '#5BB6D9', flexShrink: 0 }}>{c}</span>
            <button className="t-btn delete" title="Usuń" onClick={e => { e.stopPropagation(); remove(s) }}><IconTrash size={13} /></button>
            <IconChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        )
      })}
    </div>
  )
}

/* ─── Szczegóły snu ───────────────────────────────────────────────────────── */
function DreamDetail({ dream, peopleById, symbolsById, onBack, onOpenSymbol, onEdit, onDelete }) {
  const cat = getCategory(dream.category)
  const participants = (dream.peopleIds || []).map(id => peopleById[id]).filter(Boolean)
  const mentioned = (dream.mentionIds || []).filter(id => !(dream.peopleIds || []).includes(id))
    .map(id => peopleById[id]).filter(Boolean)
  const linkedPeople = [...new Set([...(dream.peopleIds || []), ...(dream.mentionIds || [])])]
    .map(id => peopleById[id]).filter(Boolean)
  const syms = (dream.symbolIds || []).map(id => symbolsById[id]).filter(Boolean)

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
          <DreamText text={dream.text} highlightPeople={linkedPeople} highlightSymbols={syms} />
        </div>
      )}

      {dream.interpretation && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--r)', padding: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconMoon size={12} /> Interpretacja
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-sub)' }}>{dream.interpretation}</p>
        </div>
      )}

      {syms.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconTag size={12} /> Symbole
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {syms.map(s => <SymbolChip key={s.id} symbol={s} onClick={() => onOpenSymbol(s.id)} />)}
          </div>
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
function DreamForm({ user, people, symbols, onCreateSymbol, editData, onClose }) {
  const [title, setTitle]       = useState(editData?.title || '')
  const [date, setDate]         = useState(editData?.date || TODAY())
  const [text, setText]         = useState(editData?.text || '')
  const [category, setCategory] = useState(editData?.category || '')
  const [emotions, setEmotions] = useState(editData?.emotions || [])
  const [interpretation, setInterpretation] = useState(editData?.interpretation || '')
  const [peopleIds, setPeopleIds] = useState(editData?.peopleIds || [])
  const [symbolIds, setSymbolIds] = useState(editData?.symbolIds || [])
  const [localSymbols, setLocalSymbols] = useState([]) // symbole utworzone w tej sesji
  const [saving, setSaving]     = useState(false)

  const textRef = useRef(null)
  const [trigger, setTrigger]   = useState(null) // { type:'person'|'symbol', query, start }
  const [caretPos, setCaretPos] = useState(null)

  // Pełny katalog symboli widoczny w formularzu (z bazy + utworzone teraz)
  const allSymbols = useMemo(() => {
    const m = {}
    ;[...symbols, ...localSymbols].forEach(s => { m[s.id] = s })
    return Object.values(m)
  }, [symbols, localSymbols])

  const toggle = (arr, setArr, id) =>
    setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id])

  const onTextChange = (e) => {
    const val = e.target.value
    setText(val)
    const caret = e.target.selectionStart
    const before = val.slice(0, caret)
    const m = before.match(/([@#])([\p{L}\p{N}]*)$/u)
    setTrigger(m ? { type: m[1] === '#' ? 'symbol' : 'person', query: m[2], start: caret - m[2].length - 1 } : null)
  }

  const personMatches = useMemo(() => {
    if (trigger?.type !== 'person') return []
    const q = trigger.query.toLowerCase()
    // Dopasuj też odmiany: „@Manueli" trafia w osobę „Manuela" (przez rdzeń imienia).
    return people.filter(p => personForms(p).some(f => {
      const fl = f.toLowerCase()
      if (!q) return true
      return fl.startsWith(q) || q.startsWith(fl) || q.startsWith(nameStem(fl).toLowerCase()) || fl.includes(q)
    })).slice(0, 6)
  }, [trigger, people])

  const symbolMatches = useMemo(() => {
    if (trigger?.type !== 'symbol') return []
    const q = trigger.query.toLowerCase()
    return allSymbols.filter(s => s.name?.toLowerCase().includes(q)).slice(0, 6)
  }, [trigger, allSymbols])

  const canCreateSymbol = trigger?.type === 'symbol' && trigger.query.trim() &&
    !allSymbols.some(s => s.name.toLowerCase() === trigger.query.trim().toLowerCase())

  const insertToken = (prefix, name) => {
    const ta = textRef.current
    const caret = ta ? ta.selectionStart : text.length
    const insert = prefix + name + ' '
    const next = text.slice(0, trigger.start) + insert + text.slice(caret)
    setText(next)
    setTrigger(null)
    setCaretPos(trigger.start + insert.length)
  }

  // Klik osoby: użyj formy dokładnie tak, jak ją wpisano (np. odmienioną „Manueli").
  // Jeśli to nowa forma — zapisz ją na stałe jako ksywkę osoby, by następnym razem od razu pasowała.
  const pickPerson = (p) => {
    const typed = (trigger?.query || '').trim()
    const form = typed || (p.name || '').trim().split(/\s+/)[0] || p.name
    if (!peopleIds.includes(p.id)) setPeopleIds([...peopleIds, p.id])
    if (typed && !personForms(p).some(f => f.toLowerCase() === typed.toLowerCase())) {
      updateDoc(doc(db, 'users', user.uid, 'calendarPeople', p.id), { aliases: arrayUnion(typed) }).catch(() => {})
    }
    insertToken('@', form)
  }
  // # tylko wybiera symbol — wstawiamy samo słowo (bez #); powiązanie trzyma lista symbolIds.
  const pickSymbol = (s) => { if (!symbolIds.includes(s.id)) setSymbolIds([...symbolIds, s.id]); insertToken('', s.name) }
  const createAndPick = async () => {
    const n = trigger.query.trim()
    const sym = await onCreateSymbol(n)
    setLocalSymbols(prev => [...prev, sym])
    setSymbolIds(prev => prev.includes(sym.id) ? prev : [...prev, sym.id])
    insertToken('', sym.name)
  }

  // Przywróć kursor po wstawieniu
  useLayoutEffect(() => {
    if (caretPos != null && textRef.current) {
      textRef.current.focus()
      textRef.current.setSelectionRange(caretPos, caretPos)
      setCaretPos(null)
    }
  }, [caretPos, text])

  // Symbole przypięte do snu (jawnie, niezależnie od treści) — klik usuwa
  const usedSymbols = useMemo(
    () => symbolIds.map(id => allSymbols.find(s => s.id === id)).filter(Boolean),
    [symbolIds, allSymbols]
  )

  const showDrop = trigger && (
    (trigger.type === 'person' && personMatches.length > 0) ||
    (trigger.type === 'symbol' && (symbolMatches.length > 0 || canCreateSymbol))
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() && !text.trim()) return
    setSaving(true)
    const mentionIds = parseMentions(text, people)
    const data = {
      title: title.trim(), date, text: text.trim(),
      interpretation: interpretation.trim(),
      category: category || null, emotions, peopleIds, mentionIds, symbolIds,
      updatedAt: Timestamp.now(),
    }
    try {
      if (editData) await updateDoc(doc(db, 'users', user.uid, 'dreams', editData.id), data)
      else await addDoc(collection(db, 'users', user.uid, 'dreams'), { ...data, createdAt: Timestamp.now() })
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
            <label>Treść snu <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— @ osoba, # symbol</span></label>
            <textarea ref={textRef} className="form-input" value={text} onChange={onTextChange}
              rows={6} placeholder={'Opisz, co Ci się śniło... Wpisz @ aby oznaczyć osobę (np. @Kasia), # aby oznaczyć symbol (np. #drzewo).'}
              style={{ resize: 'vertical', minHeight: 130, lineHeight: 1.6 }} />

            {showDrop && (
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20, marginTop: -6,
                background: 'var(--popover-bg)', border: '1px solid var(--border-strong)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)', overflow: 'hidden',
              }}>
                {trigger.type === 'person' && personMatches.map(p => {
                  const typed = (trigger.query || '').trim()
                  const known = !typed || personForms(p).some(f => f.toLowerCase() === typed.toLowerCase())
                  return (
                    <button type="button" key={p.id} onClick={() => pickPerson(p)} style={dropItemStyle}>
                      <Bubble person={p} size={26} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</span>
                      {!known && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <IconPlus size={10} /> zapisz „{typed}"
                        </span>
                      )}
                    </button>
                  )
                })}
                {trigger.type === 'symbol' && symbolMatches.map(s => (
                  <button type="button" key={s.id} onClick={() => pickSymbol(s)} style={dropItemStyle}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', background: (s.color || '#5BB6D9') + '22', color: s.color || '#5BB6D9', flexShrink: 0 }}>
                      <IconTag size={14} />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>#{s.name}</span>
                  </button>
                ))}
                {trigger.type === 'symbol' && canCreateSymbol && (
                  <button type="button" onClick={createAndPick} style={{ ...dropItemStyle, color: 'var(--accent)' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent)', flexShrink: 0 }}>
                      <IconPlus size={14} />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Utwórz symbol „{trigger.query.trim()}"</span>
                  </button>
                )}
              </div>
            )}
            {trigger?.type === 'person' && personMatches.length === 0 && people.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Brak osób w bazie — dodaj je w module „Osoby".
              </div>
            )}

            {usedSymbols.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Symbole:</span>
                {usedSymbols.map(s => (
                  <Chip key={s.id} color={s.color || '#5BB6D9'} onClick={() => setSymbolIds(symbolIds.filter(id => id !== s.id))}>
                    {s.name} <IconClose size={11} />
                  </Chip>
                ))}
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

          <div className="form-group">
            <label>Interpretacja <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— opcjonalnie</span></label>
            <textarea className="form-input" value={interpretation} onChange={e => setInterpretation(e.target.value)}
              rows={4} placeholder="Co ten sen może oznaczać? Twoje przemyślenia, skojarzenia..."
              style={{ resize: 'vertical', minHeight: 90, lineHeight: 1.6 }} />
          </div>

          <button type="submit" className="btn-save" disabled={saving || (!title.trim() && !text.trim())}>
            {saving ? 'Zapisywanie...' : editData ? 'Zapisz zmiany' : 'Zapisz sen'}
          </button>
        </form>
      </div>
    </div>
  )
}

const dropItemStyle = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px',
  background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
}

/* ─── DreamStats — kalendarz-heatmapa dni ze snami (ciemniej = więcej snów) ─── */
const DREAM_WD = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N']
function DreamStats({ dreams }) {
  const [month, setMonth] = useState(new Date())

  // Liczba snów na dzień (klucz yyyy-MM-dd)
  const counts = useMemo(() => {
    const m = {}
    dreams.forEach(d => { if (d.date) m[d.date] = (m[d.date] || 0) + 1 })
    return m
  }, [dreams])

  const mStart = startOfMonth(month)
  const lead   = (mStart.getDay() + 6) % 7
  const total  = getDaysInMonth(month)
  const cells  = [...Array.from({ length: lead }, () => null),
                  ...Array.from({ length: total }, (_, i) => format(addDays(mStart, i), 'yyyy-MM-dd'))]
  const monthKey     = format(month, 'yyyy-MM')
  const monthDreams  = dreams.filter(d => d.date?.startsWith(monthKey)).length
  const daysWithDream = Object.keys(counts).filter(k => k.startsWith(monthKey)).length
  const todayStr     = format(new Date(), 'yyyy-MM-dd')
  const shade = (lvl) => lvl === 0 ? 'var(--surface2)' : `color-mix(in oklab, var(--accent) ${28 + lvl * 22}%, var(--surface2))`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Podsumowanie miesiąca */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card card-pad" style={{ padding: 14 }}>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Sny w miesiącu</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{monthDreams}</div>
        </div>
        <div className="card card-pad" style={{ padding: 14 }}>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Dni ze snem</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{daysWithDream}</div>
        </div>
      </div>

      {/* Kalendarz-heatmapa */}
      <div className="card card-pad" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button className="icon-btn" onClick={() => setMonth(m => subMonths(m, 1))} title="Poprzedni miesiąc"><IconChevronLeft size={16} /></button>
          <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>{format(month, 'LLLL yyyy', { locale: pl })}</div>
          <button className="icon-btn" onClick={() => setMonth(m => addMonths(m, 1))} title="Następny miesiąc"><IconChevronRight size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
          {DREAM_WD.map((l, i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>{l}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {cells.map((c, idx) => {
            if (!c) return <div key={'b' + idx} />
            const n = counts[c] || 0
            const lvl = Math.min(n, 3)
            const isToday = c === todayStr
            return (
              <div key={c}
                title={`${format(parseISO(c), 'd MMM', { locale: pl })}${n ? ` • ${n} ${n === 1 ? 'sen' : 'sny'}` : ''}`}
                style={{
                  aspectRatio: '1', borderRadius: 6, background: shade(lvl),
                  boxShadow: isToday ? '0 0 0 1.5px var(--accent)' : 'none',
                  display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 600, color: n >= 2 ? '#fff' : 'var(--text-muted)',
                }}>
                {format(parseISO(c), 'd')}
              </div>
            )
          })}
        </div>

        {/* Legenda intensywności */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 12, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>mniej</span>
          {[0, 1, 2, 3].map(lvl => <div key={lvl} style={{ width: 11, height: 11, borderRadius: 3, background: shade(lvl) }} />)}
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>więcej</span>
        </div>
      </div>
    </div>
  )
}
