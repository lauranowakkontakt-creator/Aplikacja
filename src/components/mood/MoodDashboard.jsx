import { useState, useEffect, useMemo } from 'react'
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, subDays, startOfMonth, getDaysInMonth, addDays, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import { IconTrash, IconCalendar, IconFlame, IconArrowUp, IconArrowDown } from '../Icons'
import EmotionWheel, { EMOTIONS, BLENDS, ALL_EMOTIONS } from './EmotionWheel'

const TODAY = () => format(new Date(), 'yyyy-MM-dd')

// Find emotion info by id
function findEmotion(id) {
  return ALL_EMOTIONS.find(e => e.id === id) || { id, label: id, color: 'var(--text-muted)' }
}

export default function MoodDashboard({ user }) {
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState('today')
  const [selectedDate, setSelectedDate] = useState(TODAY())
  const [calMonth, setCalMonth]   = useState(new Date())

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
      {/* Header */}
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Nastrój</div>
          <div className="mod-header-title">{format(new Date(), 'EEEE, d MMMM', { locale: pl })}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
        {[['today','Koło emocji'],['calendar','Kalendarz'],['trends','Statystyki']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{
            flex: 1, padding: '7px 4px', borderRadius: 10, fontSize: 12, fontWeight: view === id ? 700 : 400,
            background: view === id ? 'var(--surface3)' : 'transparent',
            color: view === id ? 'var(--text)' : 'var(--text-muted)',
            border: view === id ? '1px solid var(--border-strong)' : '1px solid transparent',
            cursor: 'pointer', transition: 'all .18s', whiteSpace: 'nowrap',
          }}>{label}</button>
        ))}
      </div>

      {view === 'today'    && <TodayView    user={user} logs={logs} today={TODAY()} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
      {view === 'calendar' && <CalendarView logs={logs} calMonth={calMonth} setCalMonth={setCalMonth} today={TODAY()} />}
      {view === 'trends'   && <TrendsView   logs={logs} />}
    </div>
  )
}

/* ============================================================
   TODAY VIEW — EmotionWheel + multi check-in
   ============================================================ */
function TodayView({ user, logs, today, selectedDate, setSelectedDate }) {
  const [selected, setSelected]   = useState(new Set())
  const [note, setNote]           = useState('')
  const [saving, setSaving]       = useState(false)

  // Reset selection when date changes
  useEffect(() => {
    setSelected(new Set())
    setNote('')
  }, [selectedDate])

  const dayLogs = useMemo(() =>
    logs.filter(l => l.date === selectedDate)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  , [logs, selectedDate])

  // 14-day date strip
  const dayStrip = Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    const count = logs.filter(l => l.date === d).length
    // Gather dominant emotion color for this day
    const dayEms = logs.filter(l => l.date === d).flatMap(l => l.emotions || [])
    const topEm = dayEms.length > 0 ? findEmotion(dayEms[0]) : null
    return {
      date: d,
      label: format(new Date(d + 'T12:00:00'), 'EEE', { locale: pl }),
      dayNum: format(new Date(d + 'T12:00:00'), 'd'),
      count,
      dotColor: topEm?.color,
    }
  })

  const toggleEmotion = (id) => {
    if (id === null) { setSelected(new Set()); return }
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (selected.size === 0) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'users', user.uid, 'moodLogs'), {
        date: selectedDate,
        time: format(new Date(), 'HH:mm'),
        emotions: Array.from(selected),
        note: note.trim(),
        createdAt: Timestamp.now(),
      })
      setSelected(new Set())
      setNote('')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Usunąć wpis?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'moodLogs', id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* 14-day date strip */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
        {dayStrip.map(d => {
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
              <div style={{ display: 'flex', gap: 2 }}>
                {d.count > 0 ? Array.from({ length: Math.min(d.count, 3) }).map((_, j) => (
                  <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: d.dotColor || 'var(--primary)' }} />
                )) : (
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--surface3)' }} />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Date label */}
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
        {selectedDate === today ? 'Dzisiaj' : format(new Date(selectedDate + 'T12:00:00'), 'EEEE, d MMMM yyyy', { locale: pl })}
        {dayLogs.length > 0 && ` · ${dayLogs.length} ${dayLogs.length === 1 ? 'wpis' : 'wpisów'}`}
      </div>

      {/* Emotion wheel */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 12px', overflow: 'hidden' }}>
        <EmotionWheel selected={selected} onToggle={toggleEmotion} />

        {/* Selected chips */}
        {selected.size > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 14 }}>
            {Array.from(selected).map(id => {
              const em = findEmotion(id)
              return (
                <button key={id} onClick={() => toggleEmotion(id)} style={{
                  padding: '5px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${em.color}`,
                  background: em.color + '22',
                  color: em.color,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {em.label} <span style={{ opacity: 0.7, fontSize: 10 }}>✕</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Note + Save */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          className="form-input mood-note-input"
          placeholder="Notatka do tego wpisu (opcjonalnie)…"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          maxLength={400}
          style={{ margin: 0, resize: 'none', fontSize: 14 }}
        />
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={saving || selected.size === 0}
          style={{ opacity: selected.size === 0 ? 0.45 : 1 }}
        >
          {saving ? 'Zapisywanie…' : selected.size === 0 ? 'Wybierz emocję z koła' : `Zapisz wpis · ${selected.size} ${selected.size === 1 ? 'emocja' : 'emocje'}`}
        </button>
      </div>

      {/* Day log entries */}
      {dayLogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
            Wpisy z tego dnia
          </div>
          {dayLogs.map(log => (
            <LogEntry key={log.id} log={log} onDelete={() => handleDelete(log.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function LogEntry({ log, onDelete }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)',
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '.05em' }}>
          {log.time}
        </span>
        <button onClick={onDelete} className="t-btn delete"><IconTrash size={12} /></button>
      </div>

      {/* Emotion chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {(log.emotions || []).map(id => {
          const em = findEmotion(id)
          return (
            <span key={id} style={{
              padding: '3px 9px', borderRadius: 99, fontSize: 11,
              background: em.color + '22', color: em.color,
              border: `1px solid ${em.color}44`,
              fontWeight: 600,
            }}>{em.label}</span>
          )
        })}
      </div>

      {log.note && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-sub)', fontStyle: 'italic', lineHeight: 1.5 }}>
          „{log.note}"
        </p>
      )}
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
    // Count emotion frequencies for this day
    const emCount = {}
    dayLogs.forEach(l => (l.emotions || []).forEach(id => { emCount[id] = (emCount[id] || 0) + 1 }))
    const topEm = Object.entries(emCount).sort((a, b) => b[1] - a[1])[0]
    return { date: d, dayNum: format(addDays(start, i), 'd'), count: dayLogs.length, topColor: topEm ? findEmotion(topEm[0]).color : null }
  })

  const selectedLogs = selected ? logs.filter(l => l.date === selected).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="month-btn" onClick={() => setCalMonth(m => subMonths(m, 1))}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
          {format(calMonth, 'LLLL yyyy', { locale: pl })}
        </span>
        <button className="month-btn" onClick={() => setCalMonth(m => addMonths(m, 1))}>›</button>
      </div>

      {/* Calendar grid */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
          {['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-muted)', paddingBottom: 4, letterSpacing: '.06em' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: firstDow }, (_, i) => <div key={'e'+i} />)}
          {monthDays.map(({ date, dayNum, count, topColor }) => {
            const isSel   = date === selected
            const isToday = date === today
            return (
              <button key={date} onClick={() => setSelected(date === selected ? null : date)} style={{
                aspectRatio: 1, borderRadius: 9, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer',
                background: isSel ? (topColor ? topColor + '33' : 'var(--accent-soft)') : 'transparent',
                border: `1px solid ${isToday ? 'var(--primary)' : isSel ? (topColor || 'var(--border-strong)') : 'transparent'}`,
                transition: 'background .15s',
              }}>
                <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--primary)' : 'var(--text)' }}>{dayNum}</span>
                {count > 0 ? (
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                      <div key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: topColor || 'var(--primary)' }} />
                    ))}
                  </div>
                ) : <div style={{ width: 4, height: 4 }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day entries */}
      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            {format(new Date(selected + 'T12:00:00'), 'd MMMM yyyy', { locale: pl })}
            {selectedLogs.length === 0 && ' · brak wpisów'}
          </div>
          {selectedLogs.map(log => (
            <div key={log.id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 14px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{log.time}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(log.emotions || []).map(id => {
                  const em = findEmotion(id)
                  return <span key={id} style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, background: em.color + '22', color: em.color, fontWeight: 600 }}>{em.label}</span>
                })}
              </div>
              {log.note && <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-sub)', fontStyle: 'italic' }}>„{log.note}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   TRENDS VIEW
   ============================================================ */
function TrendsView({ logs }) {
  const [range, setRange] = useState('7d')

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const cutoff = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')
  const rangedLogs = logs.filter(l => l.date >= cutoff)

  const total  = rangedLogs.length
  const streak = useMemo(() => {
    let s = 0
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      if (logs.some(l => l.date === d)) s++
      else if (i > 0) break
    }
    return s
  }, [logs])

  // Emotion frequency
  const emCount = {}
  rangedLogs.forEach(l => (l.emotions || []).forEach(id => { emCount[id] = (emCount[id] || 0) + 1 }))
  const topEmotions = Object.entries(emCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ ...findEmotion(id), count }))
  const maxCount = topEmotions[0]?.count || 1

  // Daily check-in count for mini heatmap
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd')
    return { date: d, count: logs.filter(l => l.date === d).length }
  })
  const maxDay = Math.max(...last30.map(d => d.count), 1)

  if (total === 0) return (
    <div className="list-empty">
      <p>Brak wpisów</p>
      <p className="list-empty-hint">Zacznij od koła emocji</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Range selector */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
        {[['7d','7 dni'],['30d','30 dni'],['90d','90 dni']].map(([id, lbl]) => (
          <button key={id} onClick={() => setRange(id)} style={{
            flex: 1, padding: '6px 0', borderRadius: 9, fontSize: 12, cursor: 'pointer', fontWeight: range===id?700:400,
            background: range===id?'var(--surface3)':'transparent',
            color: range===id?'var(--text)':'var(--text-muted)',
            border: range===id?'1px solid var(--border-strong)':'1px solid transparent',
          }}>{lbl}</button>
        ))}
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {[
          { label: 'Wpisów', val: total, icon: <IconCalendar size={18} /> },
          { label: 'Dni z rzędu', val: streak, icon: <IconFlame size={18} style={{ color: 'var(--warn)' }} /> },
          { label: 'Emocji', val: Object.keys(emCount).length, icon: <span style={{ fontSize: 15 }}>●</span> },
        ].map(({ label, val, icon }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '13px 10px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5, color: 'var(--text-muted)' }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Top emotions */}
      {topEmotions.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            Najczęstsze emocje
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {topEmotions.map(em => (
              <div key={em.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: em.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-sub)', width: 100, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{em.label}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--surface3)', overflow: 'hidden' }}>
                  <EmotionBar pct={(em.count / maxCount) * 100} color={em.color} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 24, textAlign: 'right', flexShrink: 0 }}>{em.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-day check-in frequency */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 10 }}>
          Aktywność · ostatnie 30 dni
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 50 }}>
          {last30.map(({ date, count }) => (
            <div key={date} style={{
              flex: 1,
              height: count > 0 ? `${Math.max(10, (count / maxDay) * 100)}%` : 4,
              borderRadius: 3,
              background: count > 0 ? 'var(--violet)' : 'var(--surface3)',
              transition: 'height .4s',
              minHeight: 4,
            }} title={`${date}: ${count} wpisów`} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>30 dni temu</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Dziś</span>
        </div>
      </div>
    </div>
  )
}

// Animated bar fill
function EmotionBar({ pct, color }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setW(pct), 80)
    return () => clearTimeout(id)
  }, [pct])
  return <div style={{ height: '100%', borderRadius: 99, background: color, width: `${w}%`, transition: 'width .7s ease' }} />
}
