import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, startOfMonth, getDaysInMonth, addDays, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid,
} from 'recharts'
import { IconTrash, IconChevronLeft, IconChevronRight } from '../Icons'
import { confirmDialog } from '../ConfirmModal'
import { ALL_EMOTIONS } from './EmotionWheel'

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

// Emocje do wyboru (pigułki) — prosty, czytelny zestaw zamiast koła Plutchika
const PILL_EMOTIONS = [
  { id: 'spokój',      label: 'spokój',      color: '#5FBF98' },
  { id: 'wdzięczność', label: 'wdzięczność', color: '#9B7CF0' },
  { id: 'radość',      label: 'radość',      color: '#E6C04A' },
  { id: 'ciekawość',   label: 'ciekawość',   color: '#3B82F6' },
  { id: 'miłość',      label: 'miłość',      color: '#E8607A' },
  { id: 'nadzieja',    label: 'nadzieja',    color: '#14B8A6' },
  { id: 'duma',        label: 'duma',        color: '#F97316' },
  { id: 'ulga',        label: 'ulga',        color: '#84CC16' },
  { id: 'zmęczenie',   label: 'zmęczenie',   color: '#06B6D4' },
  { id: 'frustracja',  label: 'frustracja',  color: '#E0673E' },
  { id: 'lęk',         label: 'lęk',         color: '#8B5CF6' },
  { id: 'smutek',      label: 'smutek',      color: '#6E89DE' },
  { id: 'złość',       label: 'złość',       color: '#E66A4E' },
  { id: 'samotność',   label: 'samotność',   color: '#9FB2EC' },
  { id: 'stres',       label: 'stres',       color: '#D98B5F' },
]
// Stare chipy — fallback dla wpisów sprzed pigułek
const LEGACY_EMOTIONS = [
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
  return PILL_EMOTIONS.find(e => e.id === id)
    || ALL_EMOTIONS.find(e => e.id === id)
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

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'moodLogs'), orderBy('createdAt', 'desc'))
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
      <MoodPage user={user} logs={logs} onDelete={handleDelete} />
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

      {/* Emocje — wybierz kilka */}
      <div>
        {kicker('Emocje · wybierz kilka', { marginBottom: 12 })}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PILL_EMOTIONS.map(em => {
            const on = emotions.has(em.id)
            return (
              <button key={em.id} onClick={() => toggleEmotion(em.id)} style={{
                padding: '7px 14px', borderRadius: 99, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: on ? 700 : 500,
                background: on ? em.color + '26' : 'var(--surface2)',
                border: `1px solid ${on ? em.color : 'var(--border)'}`,
                color: on ? em.color : 'var(--text-sub)', transition: 'all .15s',
              }}>{em.label}</button>
            )
          })}
        </div>
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
   JEDEN WIDOK — wykres + średnia + emocje + wpis + kalendarz
   ============================================================ */
function MoodPage({ user, logs, onDelete }) {
  const [month, setMonth]     = useState(new Date())
  const [selDate, setSelDate] = useState(TODAY())
  const today = TODAY()

  const monthStr = format(month, 'yyyy-MM')
  const monthLbl = (() => { const l = format(month, 'LLLL', { locale: pl }); return l.charAt(0).toUpperCase() + l.slice(1) })()
  const mStart = startOfMonth(month)
  const daysCount = getDaysInMonth(month)
  const monthLogs = useMemo(() => logs.filter(l => l.date.startsWith(monthStr)), [logs, monthStr])

  // Średnia + zmiana m/m
  const valid = monthLogs.filter(l => l.moodValue)
  const monthAvg = valid.length ? valid.reduce((s, l) => s + l.moodValue, 0) / valid.length : 0
  const prevStr = format(subMonths(month, 1), 'yyyy-MM')
  const prevValid = logs.filter(l => l.date.startsWith(prevStr) && l.moodValue)
  const prevAvg = prevValid.length ? prevValid.reduce((s, l) => s + l.moodValue, 0) / prevValid.length : 0
  const diff = prevAvg > 0 && monthAvg > 0 ? monthAvg - prevAvg : null
  const fmtAvg = v => v.toFixed(1).replace('.', ',')

  // Wykres dzienny
  const chartData = useMemo(() => Array.from({ length: daysCount }, (_, i) => {
    const d = format(addDays(mStart, i), 'yyyy-MM-dd')
    const dl = logs.filter(l => l.date === d)
    const a = dl.length ? dl.reduce((s, l) => s + (l.moodValue || 0), 0) / dl.length : null
    return { day: String(i + 1), value: a }
  }).filter(d => d.value !== null), [logs, monthStr]) // eslint-disable-line

  // Najczęstsze emocje
  const topEms = useMemo(() => {
    const c = {}
    monthLogs.forEach(l => (l.emotions || []).forEach(id => { c[id] = (c[id] || 0) + 1 }))
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ ...findEmotion(id), count: n }))
  }, [monthLogs])
  const maxEm = topEms[0]?.count || 1

  // Kalendarz
  const firstDow = (mStart.getDay() + 6) % 7
  const calDays = Array.from({ length: daysCount }, (_, i) => {
    const d = format(addDays(mStart, i), 'yyyy-MM-dd')
    const dl = logs.filter(l => l.date === d)
    const avgV = dl.length ? dl.reduce((s, l) => s + (l.moodValue || 0), 0) / dl.length : null
    const mObj = avgV ? MOODS.reduce((p, c) => Math.abs(c.value - avgV) < Math.abs(p.value - avgV) ? c : p) : null
    return { date: d, dayNum: format(addDays(mStart, i), 'd'), count: dl.length, color: mObj?.color }
  })

  const dayLogs = logs.filter(l => l.date === selDate).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  const canAdd = selDate <= today
  const selLabel = format(new Date(selDate + 'T12:00:00'), 'd MMMM yyyy', { locale: pl })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* GÓRA: wykres + średnia/emocje */}
      <div className="mood-top">
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            {kicker('Nastrój w czasie')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="month-btn" style={{ width: 26, height: 26 }} onClick={() => setMonth(m => subMonths(m, 1))}><IconChevronLeft size={12} /></button>
              <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--surface2)', border: '1px solid var(--border-strong)' }}>{monthLbl}</span>
              <button className="month-btn" style={{ width: 26, height: 26 }} onClick={() => setMonth(m => addMonths(m, 1))}><IconChevronRight size={12} /></button>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                <defs><linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                  formatter={v => [MOODS.find(m => Math.abs(m.value - v) < 0.5)?.label || v.toFixed(1), 'nastrój']} labelFormatter={d => `${d} ${monthLbl.toLowerCase()}`} />
                <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} fill="url(#moodGrad)"
                  dot={{ r: 3, fill: 'var(--bg)', stroke: 'var(--accent)', strokeWidth: 2 }} activeDot={{ r: 5, fill: 'var(--accent)' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '30px 0' }}>Brak wpisów w tym miesiącu</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
            {kicker(`Średnia · ${monthLbl}`, { marginBottom: 8 })}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 40, fontWeight: 400, lineHeight: 1, fontFamily: 'Georgia, serif' }}>{monthAvg > 0 ? fmtAvg(monthAvg) : '—'}</span>
              {monthAvg > 0 && <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/ 5</span>}
            </div>
            {diff !== null && Math.abs(diff) > 0.01 && (
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: diff > 0 ? '#5FBF98' : '#E05A2B' }}>
                {diff > 0 ? '↑' : '↓'} {fmtAvg(Math.abs(diff))} vs poprzedni
              </div>
            )}
          </div>
          {topEms.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, flex: 1 }}>
              {kicker('Najczęstsze emocje', { marginBottom: 12 })}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {topEms.map(em => (
                  <div key={em.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-sub)', width: 90, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{em.label}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'var(--surface3)', overflow: 'hidden' }}>
                      <AnimBar pct={(em.count / maxEm) * 100} color={em.color} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 20, textAlign: 'right' }}>{em.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ŚRODEK: wpis nastroju (dla wybranego dnia) */}
      {canAdd && <MoodEntryForm key={selDate} user={user} date={selDate} />}

      {/* Wpisy wybranego dnia */}
      {dayLogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {kicker(selDate === today ? 'Wpisy dziś' : `Wpisy · ${selLabel}`)}
          {dayLogs.map(log => <LogEntry key={log.id} log={log} onDelete={() => onDelete(log.id)} />)}
        </div>
      )}

      {/* DÓŁ: kalendarz miesiąca (klik = wybór dnia powyżej) */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button className="month-btn" onClick={() => setMonth(m => subMonths(m, 1))}><IconChevronLeft size={14} /></button>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Miesiąc · {monthLbl}</span>
          <button className="month-btn" onClick={() => setMonth(m => addMonths(m, 1))}><IconChevronRight size={14} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
          {['P', 'W', 'Ś', 'C', 'P', 'S', 'N'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: firstDow }, (_, i) => <div key={'e' + i} />)}
          {calDays.map(({ date, dayNum, count, color }) => {
            const isSel = date === selDate
            const isToday = date === today
            return (
              <button key={date} onClick={() => setSelDate(date)} style={{
                height: 46, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 4px 4px', background: color ? color + '28' : 'var(--surface2)',
                border: `1.5px solid ${isSel ? (color || 'var(--accent)') : isToday ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer', transition: 'all .15s',
              }}>
                <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>{dayNum}</span>
                <div style={{ width: '60%', height: 3, borderRadius: 2, background: count > 0 ? (color || 'var(--accent)') : 'transparent' }} />
              </button>
            )
          })}
        </div>
        {!canAdd && <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Wybrany dzień jest w przyszłości — nie można dodać wpisu.</p>}
      </div>
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


function AnimBar({ pct, color }) {
  const [w, setW] = useState(0)
  useEffect(() => { const id = setTimeout(() => setW(pct), 80); return () => clearTimeout(id) }, [pct])
  return <div style={{ height: '100%', borderRadius: 99, background: color, width: `${w}%`, transition: 'width .7s ease' }} />
}
