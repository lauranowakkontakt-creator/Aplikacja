import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, subDays, startOfMonth, getDaysInMonth, addDays, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import { IconTrash, IconChevronLeft, IconChevronRight } from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import { toast } from '../Toast'
import EmotionWheel, { ALL_EMOTIONS } from './EmotionWheel'

// ── 5-level mood scale ────────────────────────────────────────────────────────
const MOODS = [
  { id: 'awful',   label: 'okropny',  value: 1, color: '#E05A2B' },
  { id: 'bad',     label: 'źle',      value: 2, color: '#F59E0B' },
  { id: 'ok',      label: 'ok',       value: 3, color: '#94A3B8' },
  { id: 'good',    label: 'dobrze',   value: 4, color: '#5FBF98' },
  { id: 'great',   label: 'świetnie', value: 5, color: '#3B82F6' },
]

// ── Emotion chip definitions ───────────────────────────────────────────────────
const EMOTION_CHIPS = [
  { id: 'spokój',      label: 'spokój',      color: '#5FBF98' },
  { id: 'wdzięczność', label: 'wdzięczność', color: '#9B7CF0' },
  { id: 'radość',      label: 'radość',      color: '#F59E0B' },
  { id: 'ciekawość',   label: 'ciekawość',   color: '#3B82F6' },
  { id: 'miłość',      label: 'miłość',      color: '#EC4899' },
  { id: 'zmęczenie',   label: 'zmęczenie',   color: '#06B6D4' },
  { id: 'frustracja',  label: 'frustracja',  color: '#E0673E' },
  { id: 'lęk',         label: 'lęk',         color: '#8B5CF6' },
  { id: 'smutek',      label: 'smutek',      color: '#6366F1' },
  { id: 'duma',        label: 'duma',        color: '#F97316' },
  { id: 'ulga',        label: 'ulga',        color: '#84CC16' },
  { id: 'nadzieja',    label: 'nadzieja',    color: '#14B8A6' },
]

// Face SVG for mood
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
    || EMOTION_CHIPS.find(e => e.id === id)
    || { id, label: id, color: 'var(--text-muted)' }
}

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
      <div style={{ display: 'flex', gap: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
        {[['today','Dziś'],['calendar','Kalendarz'],['trends','Statystyki']].map(([id, lbl]) => (
          <button key={id} onClick={() => setView(id)} style={{
            flex: 1, padding: '7px 4px', borderRadius: 10, fontSize: 13,
            fontWeight: view === id ? 700 : 400,
            background: view === id ? 'var(--surface3)' : 'transparent',
            color: view === id ? 'var(--text)' : 'var(--text-muted)',
            border: view === id ? '1px solid var(--border-strong)' : '1px solid transparent',
            cursor: 'pointer', transition: 'all .18s',
          }}>{lbl}</button>
        ))}
      </div>

      {view === 'today'    && <TodayView    user={user} logs={logs} today={TODAY()} />}
      {view === 'calendar' && <CalendarView logs={logs} calMonth={calMonth} setCalMonth={setCalMonth} today={TODAY()} />}
      {view === 'trends'   && <TrendsView   logs={logs} />}
    </div>
  )
}

/* ============================================================
   TODAY VIEW
   ============================================================ */
function TodayView({ user, logs, today }) {
  const [mood, setMood]           = useState(null)
  const [emotions, setEmotions]   = useState(new Set())
  const [note, setNote]           = useState('')
  const [saving, setSaving]       = useState(false)

  const dayLogs = useMemo(() =>
    logs.filter(l => l.date === today)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  , [logs, today])

  const handleSave = async () => {
    if (!mood) return
    setSaving(true)
    const mObj = MOODS.find(m => m.id === mood)
    try {
      await addDoc(collection(db, 'users', user.uid, 'moodLogs'), {
        date: today,
        time: format(new Date(), 'HH:mm'),
        mood,
        moodValue: mObj.value,
        moodLabel: mObj.label,
        moodColor: mObj.color,
        emotions: Array.from(emotions),
        note: note.trim(),
        createdAt: Timestamp.now(),
      })
      setMood(null); setEmotions(new Set()); setNote('')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: 'Usunąć wpis nastroju?' })
    if (!ok) return
    await deleteDoc(doc(db, 'users', user.uid, 'moodLogs', id))
  }

  const toggleEmotion = (id) => {
    setEmotions(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Mood entry card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Mood selector */}
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 14 }}>
            Jak się masz teraz?
          </div>
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

        {/* Emotion wheel */}
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            Emocje · kliknij na kole
          </div>
          <EmotionWheel
            selected={emotions}
            onToggle={(id) => {
              if (id === null) { setEmotions(new Set()); return }
              toggleEmotion(id)
            }}
          />
          {emotions.size > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {Array.from(emotions).map(id => {
                const em = findEmotion(id)
                return (
                  <span key={id} style={{
                    padding: '3px 10px', borderRadius: 99, fontSize: 12,
                    background: em.color + '22', color: em.color,
                    border: `1px solid ${em.color}44`, fontWeight: 600,
                  }}>{em.label}</span>
                )
              })}
            </div>
          )}
        </div>

        {/* Note */}
        <textarea
          className="form-input"
          placeholder="Jak minął dzień? Co czujesz?…"
          value={note} onChange={e => setNote(e.target.value)}
          rows={3} maxLength={400}
          style={{ margin: 0, resize: 'none', fontSize: 14 }}
        />

        {/* Save button */}
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={saving || !mood}
          style={{ opacity: !mood ? 0.4 : 1, margin: 0 }}>
          {saving ? 'Zapisywanie…' : !mood ? 'Wybierz nastrój' : 'Zapisz nastrój'}
        </button>
      </div>

      {/* Today's entries */}
      {dayLogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase' }}>Wpisy dziś</div>
          {dayLogs.map(log => <LogEntry key={log.id} log={log} onDelete={() => handleDelete(log.id)} />)}
        </div>
      )}
    </div>
  )
}

function LogEntry({ log, onDelete }) {
  const moodObj = log.mood ? MOODS.find(m => m.id === log.mood) : null
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
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.time}</span>
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
      {log.note && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-sub)', fontStyle: 'italic', lineHeight: 1.5 }}>„{log.note}"</p>}
    </div>
  )
}

/* ============================================================
   CALENDAR VIEW
   ============================================================ */
function CalendarView({ logs, calMonth, setCalMonth, today }) {
  const [selected, setSelected] = useState(null)

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
    return { date: d, dayNum: format(addDays(start, i), 'd'), count: dayLogs.length, moodColor: moodObj?.color, moodObj }
  })

  const selectedLogs = selected
    ? logs.filter(l => l.date === selected).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
    : []

  const monthLabel = format(calMonth, 'LLLL', { locale: pl }).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Calendar card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 14px' }}>
        {/* Header with arrows */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button className="month-btn" onClick={() => setCalMonth(m => subMonths(m, 1))}><IconChevronLeft size={14} /></button>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Miesiąc · {monthLabel}
          </span>
          <button className="month-btn" onClick={() => setCalMonth(m => addMonths(m, 1))}><IconChevronRight size={14} /></button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
          {['P','W','Ś','C','P','S','N'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.06em', paddingBottom: 2 }}>{d}</div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: firstDow }, (_, i) => <div key={'e'+i} />)}
          {monthDays.map(({ date, dayNum, count, moodColor }) => {
            const isSel   = date === selected
            const isToday = date === today
            const bg      = moodColor ? moodColor + '28' : 'var(--surface2)'
            return (
              <button key={date} onClick={() => setSelected(date === selected ? null : date)} style={{
                aspectRatio: '1', borderRadius: 10, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 4px 4px',
                background: bg,
                border: `1.5px solid ${isToday ? 'var(--violet)' : isSel ? (moodColor || 'var(--border-strong)') : 'transparent'}`,
                cursor: 'pointer', transition: 'all .15s',
              }}>
                <span style={{
                  fontSize: 12, fontWeight: isToday ? 700 : 500,
                  color: isToday ? 'var(--violet)' : 'var(--text)',
                  lineHeight: 1,
                }}>{dayNum}</span>
                <div style={{
                  width: '60%', height: 3, borderRadius: 2,
                  background: count > 0 ? (moodColor || 'var(--primary)') : 'transparent',
                }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            {format(new Date(selected + 'T12:00:00'), 'd MMMM yyyy', { locale: pl })}
            {selectedLogs.length === 0 && ' · brak wpisów'}
          </div>
          {selectedLogs.map(log => <LogEntry key={log.id} log={log} onDelete={() => {}} />)}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   TRENDS VIEW
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
  const diff     = prevAvg > 0 ? monthAvg - prevAvg : null

  // Chart data — one point per day of month
  const daysCount = getDaysInMonth(viewMonth)
  const start     = startOfMonth(viewMonth)
  const chartData = Array.from({ length: daysCount }, (_, i) => {
    const d       = format(addDays(start, i), 'yyyy-MM-dd')
    const dayLogs = logs.filter(l => l.date === d)
    const dayAvg  = dayLogs.length > 0
      ? dayLogs.reduce((s, l) => s + (l.moodValue || 0), 0) / dayLogs.length
      : null
    const moodObj = dayAvg
      ? MOODS.reduce((p, c) => Math.abs(c.value - dayAvg) < Math.abs(p.value - dayAvg) ? c : p)
      : null
    return { day: String(i + 1), value: dayAvg, color: moodObj?.color }
  }).filter(d => d.value !== null)

  // Emotion frequency
  const emCount = {}
  monthLogs.forEach(l => (l.emotions || []).forEach(id => { emCount[id] = (emCount[id] || 0) + 1 }))
  const topEms  = Object.entries(emCount).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([id, count]) => ({ ...findEmotion(id), count }))
  const maxEm   = topEms[0]?.count || 1

  if (monthLogs.length === 0 && prevLogs.length === 0) return (
    <div className="list-empty"><p>Brak wpisów</p><p className="list-empty-hint">Zacznij od zakładki Dziś</p></div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="month-btn" onClick={() => setViewMonth(m => subMonths(m, 1))}><IconChevronLeft size={14} /></button>
        <button style={{
          padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
          background: 'var(--surface)', border: '1px solid var(--border-strong)',
          color: 'var(--text)', cursor: 'pointer',
        }}>{monthCapital}</button>
        <button className="month-btn" onClick={() => setViewMonth(m => addMonths(m, 1))}><IconChevronRight size={14} /></button>
      </div>

      {/* Line chart — Nastrój w czasie */}
      {chartData.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 14 }}>
            Nastrój w czasie
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9B7CF0" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#9B7CF0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0.5, 5.5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                formatter={v => [MOODS.find(m => Math.abs(m.value - v) < 0.5)?.label || v.toFixed(1), 'nastrój']}
              />
              <Area type="monotone" dataKey="value" stroke="#9B7CF0" strokeWidth={2}
                fill="url(#moodGrad)"
                dot={{ r: 3, fill: '#9B7CF0', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#9B7CF0' }}
              />
            </AreaChart>
          </ResponsiveContainer>
          {/* Color legend */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            {MOODS.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
                {m.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Average score */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 20 }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>
          Średnia · {monthCapital}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {monthAvg > 0 ? monthAvg.toFixed(1).replace('.', ',') : '—'}
          </span>
          {monthAvg > 0 && <span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 400 }}>/5</span>}
        </div>
        {diff !== null && Math.abs(diff) > 0.01 && (
          <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: diff > 0 ? '#5FBF98' : '#E05A2B', display: 'flex', alignItems: 'center', gap: 4 }}>
            {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1).replace('.', ',')} vs {format(subMonths(viewMonth, 1), 'LLLL', { locale: pl })}
          </div>
        )}
      </div>

      {/* Most frequent emotions */}
      {topEms.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 14 }}>
            Najczęstsze emocje
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topEms.map(em => (
              <div key={em.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-sub)', width: 90, flexShrink: 0 }}>{em.label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'var(--surface3)', overflow: 'hidden' }}>
                  <AnimBar pct={(em.count / maxEm) * 100} color={em.color} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AnimBar({ pct, color }) {
  const [w, setW] = useState(0)
  useEffect(() => { const id = setTimeout(() => setW(pct), 80); return () => clearTimeout(id) }, [pct])
  return <div style={{ height: '100%', borderRadius: 99, background: color, width: `${w}%`, transition: 'width .7s ease' }} />
}
