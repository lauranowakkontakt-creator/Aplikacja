import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, subDays, startOfMonth, getDaysInMonth, addDays, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid,
} from 'recharts'
import { IconTrash, IconChevronLeft, IconChevronRight, IconClose } from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import EmotionWheel, { ALL_EMOTIONS } from './EmotionWheel'

// ── 5-stopniowa skala nastroju ────────────────────────────────────────────────
const MOODS = [
  { id: 'awful',   label: 'okropny',  value: 1, color: '#E05A2B' },
  { id: 'bad',     label: 'źle',      value: 2, color: '#F59E0B' },
  { id: 'ok',      label: 'ok',       value: 3, color: '#94A3B8' },
  { id: 'good',    label: 'dobrze',   value: 4, color: '#5FBF98' },
  { id: 'great',   label: 'świetnie', value: 5, color: '#3B82F6' },
]

// ── Oceny dnia 1–5 w kategoriach ──────────────────────────────────────────────
export const RATING_CATS = [
  { id: 'sen',     label: 'Sen',     color: '#7C8AF0' },
  { id: 'energia', label: 'Energia', color: '#E0B15A' },
  { id: 'spokój',  label: 'Spokój',  color: '#5FBF98' },
  { id: 'relacje', label: 'Relacje', color: '#EC4899' },
]

// Stare chipy emocji — tylko fallback dla wpisów sprzed nowego koła
const LEGACY_EMOTIONS = [
  { id: 'spokój',      label: 'spokój',      color: '#5FBF98' },
  { id: 'wdzięczność', label: 'wdzięczność', color: '#9B7CF0' },
  { id: 'ciekawość',   label: 'ciekawość',   color: '#3B82F6' },
  { id: 'zmęczenie',   label: 'zmęczenie',   color: '#06B6D4' },
  { id: 'frustracja',  label: 'frustracja',  color: '#E0673E' },
  { id: 'lęk',         label: 'lęk',         color: '#8B5CF6' },
  { id: 'duma',        label: 'duma',        color: '#F97316' },
  { id: 'ulga',        label: 'ulga',        color: '#84CC16' },
  { id: 'nadzieja',    label: 'nadzieja',    color: '#14B8A6' },
  { id: 'przerażenie', label: 'przerażenie', color: '#339666' },
]

function MoodFace({ mood, size = 30, active }) {
  const col = active ? mood.color : 'var(--text-muted)'
  const mouths = {
    awful:   'M9,17 Q16,11 23,17',
    bad:     'M9,17 Q16,13 23,17',
    ok:      'M9,15 L23,15',
    good:    'M9,15 Q16,18 23,15',
    great:   'M9,14 Q16,20 23,14',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
      stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11.5" cy="11.5" r="1.5" fill={col} stroke="none" />
      <circle cx="20.5" cy="11.5" r="1.5" fill={col} stroke="none" />
      <path d={mouths[mood.id] || mouths.ok} />
    </svg>
  )
}

const TODAY = () => format(new Date(), 'yyyy-MM-dd')

function findEmotion(id) {
  return ALL_EMOTIONS.find(e => e.id === id)
    || LEGACY_EMOTIONS.find(e => e.id === id)
    || { id, label: id, color: '#9A9DB5' }
}

const kicker = (t, extra) => (
  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, ...extra }}>
    <span style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 2, background: 'var(--accent)', opacity: 0.6 }} />
    {t}
  </div>
)

// ── Root component ────────────────────────────────────────────────────────────
export default function MoodDashboard({ user }) {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState('today')
  const [calMonth, setCalMonth] = useState(new Date())

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'moodLogs'),
      orderBy('createdAt', 'desc')
    )
    return onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user.uid])

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć wpis nastroju?' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'moodLogs', id))
  }

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Nastrój</div>
          <div className="mod-header-title">{format(new Date(), 'EEEE, d MMMM', { locale: pl })}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="view-tabs" style={{ marginBottom: 0 }}>
        {[['today','Dziś'],['calendar','Kalendarz'],['trends','Statystyki']].map(([id, lbl]) => (
          <button key={id} className={`tab-btn${view === id ? ' active' : ''}`} onClick={() => setView(id)}>{lbl}</button>
        ))}
      </div>

      {view === 'today'    && <EntryView    user={user} logs={logs} onDelete={handleDelete} />}
      {view === 'calendar' && <CalendarView user={user} logs={logs} calMonth={calMonth} setCalMonth={setCalMonth} today={TODAY()} onDelete={handleDelete} />}
      {view === 'trends'   && <TrendsView   logs={logs} />}
    </div>
  )
}

/* ============================================================
   FORMULARZ WPISU — wielokrotnego użytku (Dziś + Kalendarz)
   ============================================================ */
function MoodEntryForm({ user, date, onSaved }) {
  const [mood, setMood]         = useState(null)
  const [emotions, setEmotions] = useState(new Set())
  const [ratings, setRatings]   = useState({})
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)

  const isToday = date === TODAY()

  const handleSave = async () => {
    if (!mood) return
    setSaving(true)
    const mObj = MOODS.find(m => m.id === mood)
    const cleanRatings = Object.fromEntries(Object.entries(ratings).filter(([, v]) => v > 0))
    try {
      await addDoc(collection(db, 'users', user.uid, 'moodLogs'), {
        date,
        time: isToday ? format(new Date(), 'HH:mm') : null,
        mood,
        moodValue: mObj.value,
        moodLabel: mObj.label,
        moodColor: mObj.color,
        emotions: Array.from(emotions),
        ratings: cleanRatings,
        note: note.trim(),
        createdAt: Timestamp.now(),
      })
      setMood(null); setEmotions(new Set()); setRatings({}); setNote('')
      onSaved?.()
    } finally { setSaving(false) }
  }

  const toggleEmotion = (id) => {
    if (id === null) { setEmotions(new Set()); return }
    setEmotions(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const dateLabel = format(new Date(date + 'T12:00:00'), 'd MMM', { locale: pl })

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Nastrój */}
      <div>
        {kicker(isToday ? 'Jak się masz teraz?' : `Jak się miałaś · ${dateLabel}?`, { marginBottom: 14 })}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {MOODS.map(m => {
            const active = mood === m.id
            return (
              <button key={m.id} onClick={() => setMood(active ? null : m.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 4px', borderRadius: 14, cursor: 'pointer',
                background: active ? m.color + '22' : 'transparent',
                border: `2px solid ${active ? m.color : 'var(--border)'}`,
                transform: active ? 'translateY(-2px)' : 'none',
                transition: 'all .2s cubic-bezier(.34,1.4,.64,1)',
              }}>
                <MoodFace mood={m} size={28} active={active} />
                <span style={{
                  fontSize: 11, fontWeight: active ? 700 : 400,
                  color: active ? m.color : 'var(--text-muted)',
                  letterSpacing: '.01em',
                }}>{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Koło emocji */}
      <div>
        {kicker('Emocje · kliknij na kole', { marginBottom: 12 })}
        <EmotionWheel selected={emotions} onToggle={toggleEmotion} />
        {emotions.size > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {Array.from(emotions).map(id => {
              const em = findEmotion(id)
              return (
                <button key={id} onClick={() => toggleEmotion(id)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                  background: em.color + '22', color: em.color,
                  border: `1px solid ${em.color}44`, fontWeight: 600,
                }}>{em.label} <IconClose size={11} /></button>
              )
            })}
          </div>
        )}
      </div>

      {/* Oceny dnia 1–5 */}
      <div>
        {kicker('Oceń dzień · 1–5', { marginBottom: 12 })}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RATING_CATS.map(cat => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: cat.color, display: 'inline-block' }} />
                {cat.label}
              </span>
              <div style={{ display: 'flex', gap: 5 }}>
                {[1,2,3,4,5].map(v => {
                  const cur = ratings[cat.id] || 0
                  const on = v <= cur
                  return (
                    <button key={v}
                      onClick={() => setRatings(r => ({ ...r, [cat.id]: v === cur ? 0 : v }))}
                      style={{
                        width: 28, height: 28, borderRadius: 99, cursor: 'pointer',
                        border: `1.5px solid ${on ? cat.color : 'var(--border)'}`,
                        background: on ? cat.color + '2E' : 'transparent',
                        color: on ? cat.color : 'var(--text-muted)',
                        fontSize: 11, fontWeight: 700, transition: 'all .15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{v}</button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notatka */}
      <textarea
        className="form-input"
        placeholder="Jak minął dzień? Co czujesz?…"
        value={note} onChange={e => setNote(e.target.value)}
        rows={3} maxLength={400}
        style={{ margin: 0, resize: 'none', fontSize: 14 }}
      />

      {/* Zapis */}
      <button
        className="btn-save"
        onClick={handleSave}
        disabled={saving || !mood}
        style={{ opacity: !mood ? 0.4 : 1, margin: 0 }}>
        {saving ? 'Zapisywanie…' : !mood ? 'Wybierz nastrój' : isToday ? 'Zapisz nastrój' : `Zapisz wpis · ${dateLabel}`}
      </button>
    </div>
  )
}

/* ============================================================
   WIDOK „DZIŚ" — z wyborem daty (także wstecz)
   ============================================================ */
function EntryView({ user, logs, onDelete }) {
  const [selDate, setSelDate] = useState(TODAY())

  // Pasek ostatnich 7 dni
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return {
      date: format(d, 'yyyy-MM-dd'),
      lbl: format(d, 'EEE', { locale: pl }),
      num: format(d, 'd'),
    }
  })

  const dayLogs = useMemo(() =>
    logs.filter(l => l.date === selDate)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  , [logs, selDate])

  const isToday = selDate === TODAY()
  const selLabel = format(new Date(selDate + 'T12:00:00'), 'd MMMM yyyy', { locale: pl })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Wybór dnia */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 12px 10px' }}>
        <div className="day-strip">
          {days.map(d => {
            const hasEntry = logs.some(l => l.date === d.date)
            return (
              <button key={d.date}
                className={`day-strip-item${selDate === d.date ? ' active' : ''}`}
                onClick={() => setSelDate(d.date)}>
                <span className="day-strip-lbl">{d.lbl}</span>
                <span className="day-strip-num">{d.num}</span>
                <span style={{
                  width: 4, height: 4, borderRadius: 99,
                  background: hasEntry ? (selDate === d.date ? 'var(--bg)' : 'var(--accent)') : 'transparent',
                }} />
              </button>
            )
          })}
        </div>
        {/* Dowolna data wstecz */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Inna data:</span>
          <input type="date" className="form-input" value={selDate} max={TODAY()}
            onChange={e => e.target.value && setSelDate(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 13, width: 'auto', flex: 1, maxWidth: 180 }} />
          {!isToday && (
            <button onClick={() => setSelDate(TODAY())} style={{
              fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)',
              border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', flexShrink: 0,
            }}>Dziś</button>
          )}
        </div>
      </div>

      <MoodEntryForm user={user} date={selDate} />

      {/* Wpisy wybranego dnia */}
      {dayLogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {kicker(isToday ? 'Wpisy dziś' : `Wpisy · ${selLabel}`)}
          {dayLogs.map(log => <LogEntry key={log.id} log={log} onDelete={() => onDelete(log.id)} />)}
        </div>
      )}
    </div>
  )
}

function LogEntry({ log, onDelete }) {
  const moodObj = log.mood ? MOODS.find(m => m.id === log.mood) : null
  const ratingEntries = RATING_CATS.filter(c => log.ratings?.[c.id] > 0)
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${moodObj ? moodObj.color + '44' : 'var(--border)'}`,
      borderLeft: `3px solid ${moodObj?.color || 'var(--border)'}`,
      borderRadius: 'var(--r)', padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {moodObj && <MoodFace mood={moodObj} size={20} active />}
          <span style={{ fontSize: 13, fontWeight: 600, color: moodObj?.color || 'var(--text)' }}>{log.moodLabel}</span>
          {log.time && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.time}</span>}
        </div>
        <button onClick={onDelete} className="t-btn delete"><IconTrash size={12} /></button>
      </div>
      {log.emotions?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {log.emotions.map(id => {
            const em = findEmotion(id)
            return (
              <span key={id} style={{
                padding: '2px 8px', borderRadius: 99, fontSize: 11,
                background: em.color + '22', color: em.color, border: `1px solid ${em.color}44`, fontWeight: 600,
              }}>{em.label}</span>
            )
          })}
        </div>
      )}
      {ratingEntries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ratingEntries.map(c => (
            <span key={c.id} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {c.label} <strong style={{ color: c.color }}>{log.ratings[c.id]}/5</strong>
            </span>
          ))}
        </div>
      )}
      {log.note && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-sub)', fontStyle: 'italic', lineHeight: 1.5 }}>„{log.note}"</p>}
    </div>
  )
}

/* ============================================================
   KALENDARZ — podgląd, dodawanie i usuwanie wpisów wstecz
   ============================================================ */
function CalendarView({ user, logs, calMonth, setCalMonth, today, onDelete }) {
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const start     = startOfMonth(calMonth)
  const firstDow  = (start.getDay() + 6) % 7
  const daysCount = getDaysInMonth(calMonth)

  const monthDays = Array.from({ length: daysCount }, (_, i) => {
    const d       = format(addDays(start, i), 'yyyy-MM-dd')
    const dayLogs = logs.filter(l => l.date === d)
    const avgVal  = dayLogs.length > 0
      ? dayLogs.reduce((s, l) => s + (l.moodValue || 0), 0) / dayLogs.length
      : null
    const moodObj = avgVal
      ? MOODS.reduce((p, c) => Math.abs(c.value - avgVal) < Math.abs(p.value - avgVal) ? c : p)
      : null
    return { date: d, dayNum: format(addDays(start, i), 'd'), count: dayLogs.length, moodColor: moodObj?.color }
  })

  const selectedLogs = selected
    ? logs.filter(l => l.date === selected).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
    : []

  const monthLabel = format(calMonth, 'LLLL', { locale: pl }).toUpperCase()
  const canAdd = selected && selected <= today

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Karta kalendarza */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button className="month-btn" onClick={() => setCalMonth(m => subMonths(m, 1))}><IconChevronLeft size={14} /></button>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Miesiąc · {monthLabel}
          </span>
          <button className="month-btn" onClick={() => setCalMonth(m => addMonths(m, 1))}><IconChevronRight size={14} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
          {['P','W','Ś','C','P','S','N'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.06em', paddingBottom: 2 }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: firstDow }, (_, i) => <div key={'e'+i} />)}
          {monthDays.map(({ date, dayNum, count, moodColor }) => {
            const isSel   = date === selected
            const isToday = date === today
            const bg      = moodColor ? moodColor + '28' : 'var(--surface2)'
            return (
              <button key={date} onClick={() => { setSelected(date === selected ? null : date); setShowForm(false) }} style={{
                aspectRatio: '1', borderRadius: 10, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 4px 4px',
                background: bg,
                border: `1.5px solid ${isToday ? 'var(--accent)' : isSel ? (moodColor || 'var(--border-strong)') : 'transparent'}`,
                cursor: 'pointer', transition: 'all .15s',
              }}>
                <span style={{
                  fontSize: 12, fontWeight: isToday ? 700 : 500,
                  color: isToday ? 'var(--accent)' : 'var(--text)',
                  lineHeight: 1,
                }}>{dayNum}</span>
                <div style={{
                  width: '60%', height: 3, borderRadius: 2,
                  background: count > 0 ? (moodColor || 'var(--accent)') : 'transparent',
                }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Szczegóły wybranego dnia */}
      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {kicker(format(new Date(selected + 'T12:00:00'), 'd MMMM yyyy', { locale: pl }) + (selectedLogs.length === 0 ? ' · brak wpisów' : ''))}
            {canAdd && !showForm && (
              <button onClick={() => setShowForm(true)} style={{
                fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)',
                border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              }}>+ Dodaj wpis</button>
            )}
          </div>
          {selectedLogs.map(log => <LogEntry key={log.id} log={log} onDelete={() => onDelete(log.id)} />)}
          {showForm && canAdd && (
            <MoodEntryForm user={user} date={selected} onSaved={() => setShowForm(false)} />
          )}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   STATYSTYKI
   ============================================================ */
function TrendsView({ logs }) {
  const [viewMonth, setViewMonth] = useState(new Date())

  const monthStr    = format(viewMonth, 'yyyy-MM')
  const prevStr     = format(subMonths(viewMonth, 1), 'yyyy-MM')
  const monthLabel  = format(viewMonth, 'LLLL', { locale: pl })
  const monthCapital = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  const monthLogs = logs.filter(l => l.date.startsWith(monthStr))
  const prevLogs  = logs.filter(l => l.date.startsWith(prevStr))

  const avg = (arr) => {
    const valid = arr.filter(l => l.moodValue)
    return valid.length ? valid.reduce((s, l) => s + l.moodValue, 0) / valid.length : 0
  }
  const monthAvg = avg(monthLogs)
  const prevAvg  = avg(prevLogs)
  const diff     = prevAvg > 0 && monthAvg > 0 ? monthAvg - prevAvg : null

  // Dane wykresu — jeden punkt na dzień
  const daysCount = getDaysInMonth(viewMonth)
  const start     = startOfMonth(viewMonth)
  const chartData = Array.from({ length: daysCount }, (_, i) => {
    const d       = format(addDays(start, i), 'yyyy-MM-dd')
    const dayLogs = logs.filter(l => l.date === d)
    const dayAvg  = dayLogs.length > 0
      ? dayLogs.reduce((s, l) => s + (l.moodValue || 0), 0) / dayLogs.length
      : null
    return { day: String(i + 1), value: dayAvg }
  }).filter(d => d.value !== null)

  // Najczęstsze emocje
  const emCount = {}
  monthLogs.forEach(l => (l.emotions || []).forEach(id => { emCount[id] = (emCount[id] || 0) + 1 }))
  const topEms  = Object.entries(emCount).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([id, count]) => ({ ...findEmotion(id), count }))
  const maxEm   = topEms[0]?.count || 1

  // Średnie ocen dnia per kategoria
  const ratingAvgs = RATING_CATS.map(c => {
    const vals = monthLogs.map(l => l.ratings?.[c.id]).filter(v => v > 0)
    return { ...c, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, n: vals.length }
  }).filter(c => c.avg !== null)

  const fmtAvg = (v) => v.toFixed(1).replace('.', ',')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Wykres — nastrój w czasie */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {kicker('Nastrój w czasie')}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="month-btn" style={{ width: 28, height: 28 }} onClick={() => setViewMonth(m => subMonths(m, 1))}><IconChevronLeft size={12} /></button>
            <span style={{
              padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              background: 'var(--surface2)', border: '1px solid var(--border-strong)', color: 'var(--text)',
            }}>{monthCapital}</span>
            <button className="month-btn" style={{ width: 28, height: 28 }} onClick={() => setViewMonth(m => addMonths(m, 1))}><IconChevronRight size={12} /></button>
          </div>
        </div>

        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0.5, 5.5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                  formatter={v => [MOODS.find(m => Math.abs(m.value - v) < 0.5)?.label || v.toFixed(1), 'nastrój']}
                  labelFormatter={d => `${d} ${monthLabel}`}
                />
                <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5}
                  fill="url(#moodGrad)"
                  dot={{ r: 3.5, fill: 'var(--bg)', stroke: 'var(--accent)', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: 'var(--accent)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              {MOODS.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
                  {m.label}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>
            Brak wpisów w tym miesiącu
          </div>
        )}
      </div>

      {/* Średnia */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 20 }}>
        {kicker(`Średnia · ${monthCapital}`, { marginBottom: 10 })}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 52, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {monthAvg > 0 ? fmtAvg(monthAvg) : '—'}
          </span>
          {monthAvg > 0 && <span style={{ fontSize: 20, color: 'var(--text-muted)', fontWeight: 400 }}>/ 5</span>}
        </div>
        {diff !== null && Math.abs(diff) > 0.01 && (
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: diff > 0 ? '#5FBF98' : '#E05A2B', display: 'flex', alignItems: 'center', gap: 4 }}>
            {diff > 0 ? '↑' : '↓'} {fmtAvg(Math.abs(diff))} vs. {format(subMonths(viewMonth, 1), 'LLLL', { locale: pl })}
          </div>
        )}
      </div>

      {/* Oceny dnia — średnie */}
      {ratingAvgs.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          {kicker('Oceny dnia · średnie', { marginBottom: 14 })}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ratingAvgs.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-sub)', width: 70, flexShrink: 0 }}>{c.label}</span>
                <div style={{ flex: 1, height: 10, borderRadius: 99, background: 'var(--surface3)', overflow: 'hidden' }}>
                  <AnimBar pct={(c.avg / 5) * 100} color={c.color} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.color, width: 34, textAlign: 'right', flexShrink: 0 }}>{fmtAvg(c.avg)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Najczęstsze emocje */}
      {topEms.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          {kicker('Najczęstsze emocje', { marginBottom: 14 })}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {topEms.map(em => (
              <div key={em.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-sub)', width: 100, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{em.label}</span>
                <div style={{ flex: 1, height: 10, borderRadius: 99, background: 'var(--surface3)', overflow: 'hidden' }}>
                  <AnimBar pct={(em.count / maxEm) * 100} color={em.color} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 22, textAlign: 'right', flexShrink: 0 }}>{em.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {monthLogs.length === 0 && prevLogs.length === 0 && chartData.length === 0 && (
        <div className="list-empty"><p>Brak wpisów</p><p className="list-empty-hint">Zacznij od zakładki Dziś</p></div>
      )}
    </div>
  )
}

function AnimBar({ pct, color }) {
  const [w, setW] = useState(0)
  useEffect(() => { const id = setTimeout(() => setW(pct), 80); return () => clearTimeout(id) }, [pct])
  return <div style={{ height: '100%', borderRadius: 99, background: color, width: `${w}%`, transition: 'width .7s ease' }} />
}
