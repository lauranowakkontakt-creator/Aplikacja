import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, subDays, startOfMonth, getDaysInMonth, addDays, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import { IconTrash, IconCalendar, IconFlame } from '../Icons'
import EmotionWheel, { ALL_EMOTIONS } from './EmotionWheel'

// ── 7-level mood scale ────────────────────────────────────────────────────────
const MOODS = [
  { id: 'awful',     label: 'Fatalnie',  value: 1, color: '#C0392B' },
  { id: 'bad',       label: 'Źle',       value: 2, color: '#8E44AD' },
  { id: 'poor',      label: 'Słabo',     value: 3, color: '#2980B9' },
  { id: 'neutral',   label: 'Tak sobie', value: 4, color: '#7F8C8D' },
  { id: 'good',      label: 'Dobrze',    value: 5, color: '#D35400' },
  { id: 'great',     label: 'Świetnie',  value: 6, color: '#27AE60' },
  { id: 'excellent', label: 'Doskonale', value: 7, color: '#F39C12' },
]

// Abstract SVG face for each mood level
function MoodMark({ mood, size = 32, active }) {
  const col  = active ? mood.color : 'var(--border-strong)'
  const fill = active ? mood.color : 'var(--text-muted)'
  const mouths = {
    awful:    'M9,17 Q16,11 23,17',
    bad:      'M9,17 Q16,13 23,17',
    poor:     'M9,16 Q16,14.5 23,16',
    neutral:  'M9,15 L23,15',
    good:     'M9,15 Q16,16.5 23,15',
    great:    'M9,15 Q16,18 23,15',
    excellent:'M9,14 Q16,20 23,14',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
      stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11.5" cy="11" r="1.5" fill={fill} stroke="none" />
      <circle cx="20.5" cy="11" r="1.5" fill={fill} stroke="none" />
      <path d={mouths[mood.id] || mouths.neutral} />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TODAY = () => format(new Date(), 'yyyy-MM-dd')

function findEmotion(id) {
  return ALL_EMOTIONS.find(e => e.id === id) || { id, label: id, color: 'var(--text-muted)' }
}

// ── Root component ────────────────────────────────────────────────────────────
export default function MoodDashboard({ user }) {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState('today')
  const [selectedDate, setSelectedDate] = useState(TODAY())
  const [calMonth, setCalMonth]         = useState(new Date())

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

      {view === 'today'    && <TodayView    user={user} logs={logs} today={TODAY()} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
      {view === 'calendar' && <CalendarView logs={logs} calMonth={calMonth} setCalMonth={setCalMonth} today={TODAY()} />}
      {view === 'trends'   && <TrendsView   logs={logs} />}
    </div>
  )
}

/* ============================================================
   TODAY VIEW — mood rating + emotion wheel + notes
   ============================================================ */
function TodayView({ user, logs, today, selectedDate, setSelectedDate }) {
  const [mood, setMood]               = useState(null)
  const [emotions, setEmotions]       = useState(new Set())
  const [note, setNote]               = useState('')
  const [saving, setSaving]           = useState(false)
  const [showWheel, setShowWheel]     = useState(false)

  useEffect(() => {
    setMood(null); setEmotions(new Set()); setNote('')
  }, [selectedDate])

  const dayLogs = useMemo(() =>
    logs.filter(l => l.date === selectedDate)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  , [logs, selectedDate])

  // 14-day strip
  const strip = Array.from({ length: 14 }, (_, i) => {
    const d      = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    const count  = logs.filter(l => l.date === d).length
    const sample = logs.find(l => l.date === d)
    const moodObj = sample?.mood ? MOODS.find(m => m.id === sample.mood) : null
    return { date: d, label: format(new Date(d+'T12:00:00'), 'EEE', { locale: pl }),
             dayNum: format(new Date(d+'T12:00:00'), 'd'), count, dotColor: moodObj?.color }
  })

  const handleSave = async () => {
    if (!mood) return
    setSaving(true)
    const mObj = MOODS.find(m => m.id === mood)
    try {
      await addDoc(collection(db, 'users', user.uid, 'moodLogs'), {
        date: selectedDate,
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
    if (!confirm('Usunąć wpis?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'moodLogs', id))
  }

  const toggleEmotion = (id) => {
    if (id === null) { setEmotions(new Set()); return }
    setEmotions(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const selectedMoodObj = MOODS.find(m => m.id === mood)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* 14-day date strip */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {strip.map(d => {
          const isSel   = d.date === selectedDate
          const isToday = d.date === today
          return (
            <button key={d.date} onClick={() => setSelectedDate(d.date)} style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '8px 10px', borderRadius: 12, minWidth: 46,
              background: isSel ? 'var(--accent-soft)' : 'var(--surface)',
              border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'all .15s',
            }}>
              <span style={{ fontSize: 9, color: isToday ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: isToday ? 700 : 400 }}>{d.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: isSel ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>{d.dayNum}</span>
              {d.count > 0 ? (
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: Math.min(d.count, 3) }).map((_, j) => (
                    <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: d.dotColor || 'var(--primary)' }} />
                  ))}
                </div>
              ) : <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--surface3)' }} />}
            </button>
          )
        })}
      </div>

      {/* ── MOOD RATING — 7 SVG faces ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 12px', overflow: 'hidden' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 12 }}>
          Jak się czujesz? · wybierz nastrój
        </div>
        {/* Grid — 7 equal columns, no overflow */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {MOODS.map(m => {
            const active = mood === m.id
            return (
              <button key={m.id} onClick={() => setMood(active ? null : m.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '8px 2px', borderRadius: 12, cursor: 'pointer', minWidth: 0,
                background: active ? m.color + '22' : 'transparent',
                border: `2px solid ${active ? m.color : 'transparent'}`,
                transform: active ? 'translateY(-3px)' : 'none',
                transition: 'all .2s cubic-bezier(.34,1.4,.64,1)',
              }}>
                <MoodMark mood={m} size={26} active={active} />
                <span style={{
                  fontSize: 8, color: active ? m.color : 'var(--text-muted)',
                  fontWeight: active ? 700 : 400, textAlign: 'center',
                  lineHeight: 1.2, width: '100%', display: 'block',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {m.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── EMOTION WHEEL — collapsible ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
        <button
          onClick={() => setShowWheel(v => !v)}
          style={{
            width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
              Koło emocji
            </span>
            {emotions.size > 0 && (
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from(emotions).slice(0, 4).map(id => {
                  const em = findEmotion(id)
                  return <div key={id} style={{ width: 8, height: 8, borderRadius: '50%', background: em.color }} />
                })}
                {emotions.size > 4 && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{emotions.size-4}</span>}
              </div>
            )}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', transition: 'transform .2s', display: 'inline-block', transform: showWheel ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>

        {showWheel && (
          <div style={{ padding: '0 12px 18px', borderTop: '1px solid var(--border)' }}>
            <div style={{ paddingTop: 14 }}>
              <EmotionWheel selected={emotions} onToggle={toggleEmotion} />
            </div>

            {/* Selected emotion chips */}
            {emotions.size > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                {Array.from(emotions).map(id => {
                  const em = findEmotion(id)
                  return (
                    <button key={id} onClick={() => toggleEmotion(id)} style={{
                      padding: '4px 11px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                      border: `1px solid ${em.color}`, background: em.color + '22', color: em.color,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      {em.label} <span style={{ opacity: 0.6, fontSize: 10 }}>✕</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── NOTE + SAVE ── */}
      <textarea className="form-input mood-note-input"
        placeholder="Notatka (opcjonalnie)…"
        value={note} onChange={e => setNote(e.target.value)}
        rows={2} maxLength={400}
        style={{ margin: 0, resize: 'none', fontSize: 14 }}
      />
      <button className="btn-save" onClick={handleSave}
        disabled={saving || !mood}
        style={{ opacity: !mood ? 0.4 : 1 }}>
        {saving ? 'Zapisywanie…' : !mood ? 'Wybierz nastrój powyżej' : `Zapisz wpis${emotions.size > 0 ? ` · ${emotions.size} emocji` : ''}`}
      </button>

      {/* ── DAY ENTRIES ── */}
      {dayLogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
            {selectedDate === today ? 'Wpisy dziś' : `Wpisy · ${format(new Date(selectedDate+'T12:00:00'), 'd MMM', { locale: pl })}`}
          </div>
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
          {moodObj && <MoodMark mood={moodObj} size={22} active={true} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: moodObj?.color || 'var(--text)' }}>{log.moodLabel}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.time}</span>
        </div>
        <button onClick={onDelete} className="t-btn delete"><IconTrash size={12} /></button>
      </div>

      {/* Emotions */}
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

  const start    = startOfMonth(calMonth)
  const firstDow = (start.getDay() + 6) % 7
  const daysCount = getDaysInMonth(calMonth)

  const monthDays = Array.from({ length: daysCount }, (_, i) => {
    const d = format(addDays(start, i), 'yyyy-MM-dd')
    const dayLogs = logs.filter(l => l.date === d)
    const avgMoodVal = dayLogs.length > 0
      ? dayLogs.reduce((s, l) => s + (l.moodValue || 0), 0) / dayLogs.length
      : null
    const closestMood = avgMoodVal ? MOODS.reduce((p, c) => Math.abs(c.value - avgMoodVal) < Math.abs(p.value - avgMoodVal) ? c : p) : null
    return { date: d, dayNum: format(addDays(start, i), 'd'), count: dayLogs.length, moodColor: closestMood?.color }
  })

  const selectedLogs = selected
    ? logs.filter(l => l.date === selected).sort((a, b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0))
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="month-btn" onClick={() => setCalMonth(m => subMonths(m, 1))}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{format(calMonth, 'LLLL yyyy', { locale: pl })}</span>
        <button className="month-btn" onClick={() => setCalMonth(m => addMonths(m, 1))}>›</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
          {['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-muted)', paddingBottom: 2 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: firstDow }, (_, i) => <div key={'e'+i} />)}
          {monthDays.map(({ date, dayNum, count, moodColor }) => {
            const isSel   = date === selected
            const isToday = date === today
            return (
              <button key={date} onClick={() => setSelected(date === selected ? null : date)} style={{
                aspectRatio: 1, borderRadius: 9, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                background: isSel ? (moodColor ? moodColor+'33' : 'var(--accent-soft)') : 'transparent',
                border: `1px solid ${isToday ? 'var(--primary)' : isSel ? (moodColor||'var(--border-strong)') : 'transparent'}`,
                cursor: 'pointer', transition: 'background .15s',
              }}>
                <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--primary)' : 'var(--text)' }}>{dayNum}</span>
                {count > 0 ? (
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                      <div key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: moodColor||'var(--primary)' }} />
                    ))}
                  </div>
                ) : <div style={{ width: 4, height: 4 }} />}
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            {format(new Date(selected+'T12:00:00'), 'd MMMM yyyy', { locale: pl })}
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
  const [range, setRange] = useState('30d')

  const days   = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const cutoff = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')
  const ranged = logs.filter(l => l.date >= cutoff)

  const total   = ranged.length
  const avgVal  = total ? ranged.reduce((s, l) => s + (l.moodValue||0), 0) / total : 0
  const streak  = useMemo(() => {
    let s = 0
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      if (logs.some(l => l.date === d)) s++
      else if (i > 0) break
    }
    return s
  }, [logs])

  // Mood distribution (7 levels)
  const moodDist = MOODS.map(m => ({ ...m, count: ranged.filter(l => l.mood === m.id).length })).filter(m => m.count > 0)
  const maxMood  = Math.max(...moodDist.map(m => m.count), 1)

  // Emotion frequency
  const emCount = {}
  ranged.forEach(l => (l.emotions||[]).forEach(id => { emCount[id] = (emCount[id]||0)+1 }))
  const topEms  = Object.entries(emCount).sort((a,b) => b[1]-a[1]).slice(0,8).map(([id,count]) => ({ ...findEmotion(id), count }))
  const maxEm   = topEms[0]?.count || 1

  // 30-day activity
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = format(subDays(new Date(), 29-i), 'yyyy-MM-dd')
    const dayLogs = logs.filter(l => l.date === d)
    const avgM = dayLogs.length ? dayLogs.reduce((s,l) => s+(l.moodValue||0),0)/dayLogs.length : null
    const mObj = avgM ? MOODS.reduce((p,c) => Math.abs(c.value-avgM)<Math.abs(p.value-avgM)?c:p) : null
    return { date: d, count: dayLogs.length, color: mObj?.color }
  })
  const maxDay = Math.max(...last30.map(d => d.count), 1)
  const avgMoodObj = avgVal ? MOODS.reduce((p,c) => Math.abs(c.value-avgVal)<Math.abs(p.value-avgVal)?c:p) : null

  if (!total) return (
    <div className="list-empty"><p>Brak wpisów</p><p className="list-empty-hint">Zacznij od zakładki Dziś</p></div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Range */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
        {[['7d','7 dni'],['30d','30 dni'],['90d','90 dni']].map(([id,lbl]) => (
          <button key={id} onClick={() => setRange(id)} style={{
            flex:1, padding:'6px 0', borderRadius:9, fontSize:12, cursor:'pointer',
            fontWeight:range===id?700:400,
            background:range===id?'var(--surface3)':'transparent',
            color:range===id?'var(--text)':'var(--text-muted)',
            border:range===id?'1px solid var(--border-strong)':'1px solid transparent',
          }}>{lbl}</button>
        ))}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {[
          { label: 'Wpisów',      val: total,                          color: 'var(--text)',   icon: <IconCalendar size={16}/> },
          { label: 'Dni z rzędu', val: streak,                         color: 'var(--warn)',   icon: <IconFlame size={16} style={{color:'var(--warn)'}}/> },
          { label: 'Śr. nastrój', val: avgMoodObj?.label || '–',       color: avgMoodObj?.color, icon: avgMoodObj ? <MoodMark mood={avgMoodObj} size={18} active /> : null },
        ].map(({ label, val, color, icon }) => (
          <div key={label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'12px 8px', textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:5, color:'var(--text-muted)' }}>{icon}</div>
            <div style={{ fontSize: typeof val === 'number' ? 22 : 13, fontWeight:700, lineHeight:1, color: color||'var(--text)' }}>{val}</div>
            <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.1em', marginTop:3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Mood distribution */}
      {moodDist.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:16 }}>
          <div style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:12 }}>Rozkład nastroju</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {moodDist.sort((a,b)=>b.count-a.count).map(m => (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <MoodMark mood={m} size={18} active />
                <span style={{ fontSize:12, color:'var(--text-sub)', width:70, flexShrink:0 }}>{m.label}</span>
                <div style={{ flex:1, height:6, borderRadius:99, background:'var(--surface3)', overflow:'hidden' }}>
                  <AnimBar pct={(m.count/maxMood)*100} color={m.color} />
                </div>
                <span style={{ fontSize:11, color:'var(--text-muted)', width:24, textAlign:'right', flexShrink:0 }}>{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emotion frequency */}
      {topEms.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:16 }}>
          <div style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:12 }}>Najczęstsze emocje</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {topEms.map(em => (
              <div key={em.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:em.color, flexShrink:0 }}/>
                <span style={{ fontSize:12, color:'var(--text-sub)', width:100, flexShrink:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{em.label}</span>
                <div style={{ flex:1, height:6, borderRadius:99, background:'var(--surface3)', overflow:'hidden' }}>
                  <AnimBar pct={(em.count/maxEm)*100} color={em.color} />
                </div>
                <span style={{ fontSize:11, color:'var(--text-muted)', width:24, textAlign:'right', flexShrink:0 }}>{em.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-day activity heatmap */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:16 }}>
        <div style={{ fontSize:9, color:'var(--text-muted)', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:10 }}>Aktywność · 30 dni</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:50 }}>
          {last30.map(({ date, count, color }) => (
            <div key={date} title={`${date}: ${count}`} style={{
              flex:1, minHeight:4,
              height: count > 0 ? `${Math.max(12,(count/maxDay)*100)}%` : 4,
              borderRadius:3,
              background: count > 0 ? (color||'var(--violet)') : 'var(--surface3)',
              transition:'height .4s',
            }}/>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
          <span style={{ fontSize:9, color:'var(--text-muted)' }}>30 dni temu</span>
          <span style={{ fontSize:9, color:'var(--text-muted)' }}>Dziś</span>
        </div>
      </div>
    </div>
  )
}

// Animated bar (% width after mount)
function AnimBar({ pct, color }) {
  const [w, setW] = useState(0)
  useEffect(() => { const id = setTimeout(() => setW(pct), 80); return () => clearTimeout(id) }, [pct])
  return <div style={{ height:'100%', borderRadius:99, background:color, width:`${w}%`, transition:'width .7s ease' }}/>
}
