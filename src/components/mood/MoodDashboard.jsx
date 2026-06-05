import { useState, useEffect } from 'react'
import { collection, doc, setDoc, deleteDoc, onSnapshot, Timestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, subDays, startOfMonth, getDaysInMonth, addDays, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import { IconTrash, IconCalendar, IconFlame, IconArrowUp, IconArrowDown } from '../Icons'

/* Abstract SVG mood face — no emoji */
function MoodMark({ mood, size = 32, active }) {
  const col = active ? mood.color : 'var(--border-strong)'
  const fill = active ? mood.color : 'var(--text-muted)'
  // Quadratic bezier mouth: Q 16 controlY 23 baseY
  // control > base = smile, control < base = frown
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
      <circle cx="11.5" cy="11" r="1.5" fill={fill} stroke="none"/>
      <circle cx="20.5" cy="11" r="1.5" fill={fill} stroke="none"/>
      <path d={mouths[mood.id] || mouths.neutral}/>
    </svg>
  )
}

export const MOODS = [
  { id: 'awful',     label: 'Fatalnie',  emoji: '😣', value: 1, color: '#C0392B' },
  { id: 'bad',       label: 'Źle',       emoji: '😢', value: 2, color: '#8E44AD' },
  { id: 'poor',      label: 'Słabo',     emoji: '😔', value: 3, color: '#2980B9' },
  { id: 'neutral',   label: 'Tak sobie', emoji: '😐', value: 4, color: '#7F8C8D' },
  { id: 'good',      label: 'Dobrze',    emoji: '🙂', value: 5, color: '#D35400' },
  { id: 'great',     label: 'Świetnie',  emoji: '😊', value: 6, color: '#27AE60' },
  { id: 'excellent', label: 'Doskonale', emoji: '😄', value: 7, color: '#F39C12' },
]

export const EMOTIONS_BASIC = [
  { id: 'joy',       label: 'Radość',      emoji: '✨', positive: true },
  { id: 'peace',     label: 'Spokój',      emoji: '🕊️', positive: true },
  { id: 'gratitude', label: 'Wdzięczność', emoji: '🙏', positive: true },
  { id: 'love',      label: 'Miłość',      emoji: '❤️', positive: true },
  { id: 'sadness',   label: 'Smutek',      emoji: '💧', positive: false },
  { id: 'anger',     label: 'Złość',       emoji: '😠', positive: false },
  { id: 'fear',      label: 'Strach',      emoji: '😨', positive: false },
  { id: 'anxiety',   label: 'Niepokój',    emoji: '😰', positive: false },
]

export const EMOTIONS_EXTENDED = [
  { id: 'pride',      label: 'Duma',       emoji: '🌟', positive: true },
  { id: 'hope',       label: 'Nadzieja',   emoji: '🌅', positive: true },
  { id: 'excitement', label: 'Ekscytacja', emoji: '⚡', positive: true },
  { id: 'curiosity',  label: 'Ciekawość',  emoji: '🔍', positive: true },
  { id: 'relief',     label: 'Ulga',       emoji: '😌', positive: true },
  { id: 'fatigue',    label: 'Zmęczenie',  emoji: '😴', positive: false },
  { id: 'longing',    label: 'Tęsknota',   emoji: '💭', positive: false },
  { id: 'loneliness', label: 'Samotność',  emoji: '🌙', positive: false },
  { id: 'shame',      label: 'Wstyd',      emoji: '😶', positive: false },
  { id: 'frustration',label: 'Frustracja', emoji: '😤', positive: false },
  { id: 'envy',       label: 'Zazdrość',   emoji: '💚', positive: false },
  { id: 'surprise',   label: 'Zdziwienie', emoji: '😮', positive: true },
]

export const EMOTIONS = [...EMOTIONS_BASIC, ...EMOTIONS_EXTENDED]

const kicker = (t) => (
  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 10 }}>{t}</div>
)

export default function MoodDashboard({ user, onBack }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState('today')
  const [calMonth, setCalMonth] = useState(new Date())

  const TODAY = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'moods'), orderBy('date', 'desc'))
    return onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user.uid])

  const [selectedDate, setSelectedDate] = useState(TODAY)
  const selectedEntry = entries.find(e => e.date === selectedDate)

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div className="mood-dashboard">
      {/* Header */}
      <div className="mod-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <button className="habit-compact-btn" onClick={onBack} title="Wróć" style={{ fontSize: 18 }}>←</button>
          )}
          <div>
            <div className="mod-header-kicker">Nastrój</div>
            <div className="mod-header-title">{format(new Date(), 'EEEE, d MMMM', { locale: pl })}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 4 }}>
        {[['today','Dziś'],['calendar','Kalendarz'],['trends','Trendy']].map(([id, label]) => (
          <button key={id}
            onClick={() => setView(id)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 13, fontWeight: view === id ? 700 : 400,
              background: view === id ? 'var(--surface3)' : 'transparent',
              color: view === id ? 'var(--text)' : 'var(--text-muted)',
              border: view === id ? '1px solid var(--border-strong)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all .2s',
            }}
          >{label}</button>
        ))}
      </div>

      {view === 'today'    && <MoodTodayView user={user} entry={selectedEntry} today={TODAY} entries={entries} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
      {view === 'calendar' && <MoodCalendarView user={user} entries={entries} calMonth={calMonth} setCalMonth={setCalMonth} today={TODAY} />}
      {view === 'trends'   && <MoodTrendsView entries={entries} today={TODAY} />}
    </div>
  )
}

/* ============================================================
   TODAY VIEW
   ============================================================ */
function MoodTodayView({ user, entry, today, entries, selectedDate, setSelectedDate }) {
  const [mood, setMood]         = useState(entry?.mood || null)
  const [emotions, setEmotions] = useState(entry?.emotions || [])
  const [note, setNote]         = useState(entry?.note || '')
  const [showExt, setShowExt]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(!!entry)

  useEffect(() => {
    setMood(entry?.mood || null)
    setEmotions(entry?.emotions || [])
    setNote(entry?.note || '')
    setSaved(!!entry)
  }, [entry?.id, selectedDate])

  // 14-day strip
  const dayStrip = Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    const e = entries.find(en => en.date === d)
    const m = e ? MOODS.find(mo => mo.id === e.mood) : null
    return { date: d, label: format(new Date(d + 'T12:00:00'), 'EEE', { locale: pl }), dayNum: format(new Date(d + 'T12:00:00'), 'd'), mood: m }
  })

  const toggleEmotion = (id) => {
    setEmotions(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
    setSaved(false)
  }

  const handleSave = async () => {
    if (!mood) return
    setSaving(true)
    const m = MOODS.find(m => m.id === mood)
    await setDoc(doc(db, 'users', user.uid, 'moods', selectedDate), {
      date: selectedDate, mood, moodValue: m.value, moodEmoji: m.emoji, moodLabel: m.label,
      emotions, note: note.trim(), updatedAt: Timestamp.now()
    })
    setSaving(false)
    setSaved(true)
  }

  const recent7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
    const e = entries.find(en => en.date === d)
    const m = e ? MOODS.find(mo => mo.id === e.mood) : null
    return { date: d, mood: m }
  })

  // Hero left: area chart placeholder (recent 7 days mood bars)
  // Hero right: avg + top emotions

  // Top emotions for hero
  const emotionCount = {}
  entries.slice(0, 30).forEach(e => e.emotions?.forEach(em => { emotionCount[em] = (emotionCount[em] || 0) + 1 }))
  const topEmotions = Object.entries(emotionCount).sort((a,b) => b[1]-a[1]).slice(0, 5)
  const maxEmCount = topEmotions[0]?.[1] || 1

  const thisMonth = format(new Date(), 'yyyy-MM')
  const thisMonthEntries = entries.filter(e => e.date.startsWith(thisMonth))
  const avg = thisMonthEntries.length
    ? (thisMonthEntries.reduce((s,e) => s + (e.moodValue||0), 0) / thisMonthEntries.length)
    : null

  return (
    <div className="mood-today">
      {/* 14-day selector strip */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none' }}>
        {dayStrip.map(d => {
          const isSel = d.date === selectedDate
          const isToday = d.date === today
          return (
            <button key={d.date} onClick={() => setSelectedDate(d.date)} style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '8px 10px', borderRadius: 12, cursor: 'pointer',
              background: isSel ? 'var(--accent-soft)' : 'var(--surface)',
              border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
              minWidth: 48, transition: 'all .15s',
            }}>
              <span style={{ fontSize: 9, color: isToday ? 'var(--accent)' : isSel ? 'var(--text-sub)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: isToday ? 700 : 400 }}>{d.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: isSel ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>{d.dayNum}</span>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.mood ? d.mood.color : 'var(--surface3)', flexShrink: 0 }} />
            </button>
          )
        })}
      </div>

      {/* Hero row */}
      <div className="g2-b" style={{ gap: 10, marginBottom: 14 }}>
        {/* Left: mini chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18 }}>
          {kicker('Nastrój w czasie · 7 dni')}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
            {recent7.map(({ date, mood: m }) => (
              <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 2px 2px',
                  height: m ? `${(m.value / 7) * 100}%` : '8%',
                  background: m ? m.color + '99' : 'var(--surface2)',
                  border: date === today ? `1px solid ${m?.color || 'var(--border)'}` : '1px solid transparent',
                  minHeight: 6, transition: 'height .3s',
                }} />
                <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                  {format(new Date(date + 'T12:00:00'), 'EEE', { locale: pl })}
                </span>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {MOODS.slice(0,4).map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Avg */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, flex: 1 }}>
            {kicker('Średnia · miesiąc')}
            {avg !== null ? (
              <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
                {avg.toFixed(1)}<span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 400 }}> / 7</span>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>brak danych</div>
            )}
          </div>

          {/* Top emotions */}
          {topEmotions.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, flex: 1 }}>
              {kicker('Najczęstsze emocje')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {topEmotions.slice(0,3).map(([id, count]) => {
                  const e = EMOTIONS.find(em => em.id === id)
                  return e ? (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, width: 64, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-sub)' }}>{e.emoji} {e.label}</span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--surface2)' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: e.positive ? 'var(--income)' : 'var(--expense)', width: `${(count / maxEmCount) * 100}%`, transition: 'width .6s' }} />
                      </div>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pasek ostatnich 7 dni (SVG) */}
      <div className="mood-week-strip" style={{ marginBottom: 14 }}>
        {recent7.map(({ date, mood: m }) => (
          <div key={date} className={`mood-week-day ${date === today ? 'today' : ''}`}>
            <div style={{ opacity: m ? 1 : 0.18, transition: 'opacity .2s' }}>
              {m ? <MoodMark mood={m} size={22} active={true} /> : <MoodMark mood={MOODS[3]} size={22} active={false} />}
            </div>
            <span className="mood-week-label">{format(new Date(date + 'T12:00:00'), 'EEE', { locale: pl })}</span>
          </div>
        ))}
      </div>

      {/* Picker */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18, marginBottom: 12 }}>
        {kicker('Jak się masz teraz?')}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {MOODS.map(m => (
            <button key={m.id}
              onClick={() => { setMood(m.id); setSaved(false) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 8px', borderRadius: 10, cursor: 'pointer', minWidth: 56,
                border: `2px solid ${mood === m.id ? m.color : 'var(--border)'}`,
                background: mood === m.id ? m.color + '22' : 'transparent',
                transform: mood === m.id ? 'translateY(-3px)' : 'none',
                transition: 'all .2s var(--spring)',
              }}
            >
              <MoodMark mood={m} size={28} active={mood === m.id} />
              <span style={{ fontSize: 9, color: mood === m.id ? m.color : 'var(--text-muted)', fontWeight: mood === m.id ? 700 : 400 }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Emocje podstawowe */}
      {mood && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18, marginBottom: 12 }}>
          {kicker('Podstawowe emocje')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EMOTIONS_BASIC.map(e => (
              <button key={e.id}
                onClick={() => toggleEmotion(e.id)}
                style={{
                  padding: '6px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${emotions.includes(e.id) ? (e.positive ? 'var(--income)' : 'var(--expense)') : 'var(--border)'}`,
                  background: emotions.includes(e.id) ? (e.positive ? 'var(--income)' : 'var(--expense)') + '22' : 'transparent',
                  color: emotions.includes(e.id) ? 'var(--text)' : 'var(--text-muted)',
                  transition: 'all .15s',
                }}
              >{e.emoji} {e.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Emocje rozszerzone */}
      {mood && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowExt(v => !v)} style={{
            width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, textAlign: 'left'
          }}>
            {showExt ? '▲' : '▼'} Rozszerzone emocje
          </button>
          {showExt && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18, marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOTIONS_EXTENDED.map(e => (
                <button key={e.id}
                  onClick={() => toggleEmotion(e.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${emotions.includes(e.id) ? (e.positive ? 'var(--income)' : 'var(--expense)') : 'var(--border)'}`,
                    background: emotions.includes(e.id) ? (e.positive ? 'var(--income)' : 'var(--expense)') + '22' : 'transparent',
                    color: emotions.includes(e.id) ? 'var(--text)' : 'var(--text-muted)',
                  }}
                >{e.emoji} {e.label}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notatka + zapisz */}
      {mood && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18, marginBottom: 12 }}>
          {kicker('Notatka')}
          <textarea className="mood-note-input form-input"
            placeholder="Co się dziś wydarzyło? O czym myślisz?"
            value={note} onChange={e => { setNote(e.target.value); setSaved(false) }}
            rows={3} maxLength={500}
            style={{ margin: 0, width: '100%' }}
          />
          <button className="btn-save" onClick={handleSave} disabled={saving} style={{ marginTop: 10 }}>
            {saving ? 'Zapisywanie...' : saved ? '✓ Zapisano' : 'Zapisz nastrój'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   CALENDAR VIEW
   ============================================================ */
function MoodCalendarView({ user, entries, calMonth, setCalMonth, today }) {
  const [selected, setSelected] = useState(null)

  const start    = startOfMonth(calMonth)
  const firstDow = ((start.getDay() + 6) % 7)
  const monthDays = Array.from({ length: getDaysInMonth(calMonth) }, (_, i) => {
    const d = addDays(start, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const entry = entries.find(e => e.date === dateStr)
    const m = entry ? MOODS.find(mo => mo.id === entry.mood) : null
    return { date: dateStr, dayNum: format(d, 'd'), mood: m, entry }
  })

  const selectedEntry = selected ? entries.find(e => e.date === selected) : null

  return (
    <div className="mood-calendar">
      <div className="habit-week-nav" style={{ marginBottom: 12 }}>
        <button className="month-btn" onClick={() => setCalMonth(m => subMonths(m, 1))}>‹</button>
        <span className="habit-period-label">{format(calMonth, 'LLLL yyyy', { locale: pl })}</span>
        <button className="month-btn" onClick={() => setCalMonth(m => addMonths(m, 1))}>›</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, marginBottom: 12 }}>
        <div className="mood-cal-grid">
          {['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(d => <div key={d} className="mood-cal-header">{d}</div>)}
          {Array.from({ length: firstDow }, (_, i) => <div key={'e'+i} />)}
          {monthDays.map(({ date, dayNum, mood: m }) => (
            <button key={date}
              className={`mood-cal-day ${m ? 'has-mood' : ''} ${date === today ? 'today' : ''} ${date === selected ? 'selected' : ''}`}
              style={m && date === selected ? { background: m.color + '40', borderColor: m.color } : m ? { background: m.color + '20' } : {}}
              onClick={() => setSelected(date === selected ? null : date)}
            >
              <span className="mood-cal-num">{dayNum}</span>
              {m && <span style={{ display: 'block', width: 16, height: 3, borderRadius: 2, background: m.color, margin: '0 auto' }}/>}
            </button>
          ))}
        </div>
      </div>

      {selectedEntry && <MoodEntryCard entry={selectedEntry} user={user} />}
    </div>
  )
}

function MoodEntryCard({ entry, user }) {
  const m = MOODS.find(mo => mo.id === entry.mood)
  const emotionObjs = EMOTIONS.filter(e => entry.emotions?.includes(e.id))

  const handleDelete = async () => {
    if (!confirm('Usunąć ten wpis?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'moods', entry.date))
  }

  return (
    <div className="mood-entry-card" style={{ borderLeftColor: m?.color }}>
      <div className="mood-entry-header">
        <div>
          {m && <MoodMark mood={m} size={32} active={true} />}
          <div>
            <p className="mood-entry-label">{m?.label}</p>
            <p className="mood-entry-date">{format(new Date(entry.date + 'T12:00:00'), 'd MMMM yyyy', { locale: pl })}</p>
          </div>
        </div>
        <button className="t-btn delete" onClick={handleDelete}><IconTrash size={13} /></button>
      </div>
      {emotionObjs.length > 0 && (
        <div className="mood-entry-emotions">
          {emotionObjs.map(e => <span key={e.id} className="mood-entry-emotion">{e.emoji} {e.label}</span>)}
        </div>
      )}
      {entry.note && <p className="mood-entry-note">"{entry.note}"</p>}
    </div>
  )
}

/* ============================================================
   TRENDS VIEW
   ============================================================ */
function MoodTrendsView({ entries, today }) {
  const [period, setPeriod] = useState('14d')

  const days = period === '14d' ? 14 : period === '30d' ? 30 : 90
  const chartData = Array.from({ length: days }, (_, i) => {
    const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd')
    const e = entries.find(en => en.date === d)
    return { day: format(new Date(d + 'T12:00:00'), days <= 14 ? 'd.MM' : 'd', { locale: pl }), value: e?.moodValue || null, entry: e }
  })

  const total  = entries.length
  const avg    = total ? (entries.reduce((s,e) => s + (e.moodValue||0), 0) / total) : 0
  const avgMood = avg ? MOODS.reduce((p,c) => Math.abs(c.value-avg) < Math.abs(p.value-avg) ? c : p) : null

  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    if (entries.find(e => e.date === d)) streak++
    else if (i > 0) break
  }

  const moodDist = MOODS.map(m => ({
    ...m,
    count: entries.filter(e => e.mood === m.id).length
  })).filter(m => m.count > 0)

  const emotionCount = {}
  entries.forEach(e => e.emotions?.forEach(em => { emotionCount[em] = (emotionCount[em] || 0) + 1 }))
  const topEmotions = Object.entries(emotionCount).sort((a,b) => b[1]-a[1]).slice(0, 8)

  const thisMonth = format(new Date(), 'yyyy-MM')
  const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM')
  const thisMonthEntries = entries.filter(e => e.date.startsWith(thisMonth))
  const lastMonthEntries = entries.filter(e => e.date.startsWith(lastMonth))
  const thisAvg = thisMonthEntries.length ? (thisMonthEntries.reduce((s,e) => s + e.moodValue, 0) / thisMonthEntries.length).toFixed(1) : null
  const lastAvg = lastMonthEntries.length ? (lastMonthEntries.reduce((s,e) => s + e.moodValue, 0) / lastMonthEntries.length).toFixed(1) : null
  const diff = thisAvg && lastAvg ? (thisAvg - lastAvg).toFixed(1) : null

  if (!total) return <div className="list-empty"><p>Brak wpisów</p><p className="list-empty-hint">Zacznij od zakładki Dziś</p></div>

  // Render simple SVG line chart
  const validData = chartData.filter(d => d.value !== null)
  const maxV = 7, minV = 1
  const W = 300, H = 120
  const toX = (i) => (i / (chartData.length - 1)) * W
  const toY = (v) => H - ((v - minV) / (maxV - minV)) * H
  const linePath = chartData.reduce((acc, d, i) => {
    if (d.value === null) return acc
    return acc + (acc === '' ? `M ${toX(i)} ${toY(d.value)}` : ` L ${toX(i)} ${toY(d.value)}`)
  }, '')

  return (
    <div className="mood-trends">
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8, marginBottom: 14 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {avgMood && <MoodMark mood={avgMood} size={26} active={true} />}
          <p style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 700 }}>{avg.toFixed(1)}<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/7</span></p>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Średni nastrój</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, textAlign: 'center' }}>
          <IconCalendar size={22} />
          <p style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 700 }}>{total}</p>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Wpisów</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, textAlign: 'center' }}>
          <IconFlame size={22} />
          <p style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 700 }}>{streak}</p>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Dni z rzędu</p>
        </div>
        {diff !== null && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: Number(diff) >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {Number(diff) >= 0 ? <IconArrowUp size={22}/> : <IconArrowDown size={22}/>}
          </div>
            <p style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 700, color: Number(diff) >= 0 ? 'var(--income)' : 'var(--expense)' }}>
              {Number(diff) >= 0 ? '+' : ''}{diff}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>vs poprz. mies.</p>
          </div>
        )}
      </div>

      {/* SVG Line chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          {kicker('Nastrój w czasie')}
          <div style={{ display: 'flex', gap: 4 }}>
            {[['14d','14 dni'],['30d','30 dni'],['90d','90 dni']].map(([id, lbl]) => (
              <button key={id}
                onClick={() => setPeriod(id)}
                style={{
                  padding: '4px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                  background: period === id ? 'var(--surface3)' : 'transparent',
                  border: `1px solid ${period === id ? 'var(--border-strong)' : 'var(--border)'}`,
                  color: period === id ? 'var(--text)' : 'var(--text-muted)',
                }}
              >{lbl}</button>
            ))}
          </div>
        </div>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 100 }} preserveAspectRatio="none">
            {/* Grid lines */}
            {[1,3,5,7].map(v => (
              <line key={v} x1={0} y1={toY(v)} x2={W} y2={toY(v)} stroke="var(--border)" strokeWidth={0.5} />
            ))}
            {/* Line */}
            {linePath && <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
            {/* Dots */}
            {chartData.map((d, i) => d.value !== null && (
              <circle key={i} cx={toX(i)} cy={toY(d.value)} r={3} fill="var(--primary)" />
            ))}
          </svg>
        </div>
      </div>

      {/* Rozkład nastrojów */}
      {moodDist.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18, marginBottom: 14 }}>
          {kicker('Rozkład nastrojów')}
          <div className="mood-dist">
            {moodDist.sort((a,b) => b.count - a.count).map(m => (
              <div key={m.id} className="mood-dist-row">
                <MoodMark mood={m} size={18} active={true} />
                <span className="mood-dist-label">{m.label}</span>
                <div className="mood-dist-bar-wrap">
                  <div className="mood-dist-bar" style={{ width: `${(m.count / Math.max(...moodDist.map(x=>x.count))) * 100}%`, background: m.color }} />
                </div>
                <span className="mood-dist-count">{m.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top emocje */}
      {topEmotions.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18 }}>
          {kicker('Najczęstsze emocje')}
          <div className="mood-top-emotions">
            {topEmotions.map(([id, count]) => {
              const e = EMOTIONS.find(em => em.id === id)
              return e ? (
                <div key={id} className="mood-top-emotion">
                  <span className="mood-top-emotion-name">{e.emoji} {e.label}</span>
                  <div className="mood-top-emotion-bar-wrap">
                    <div className="mood-top-emotion-bar"
                      style={{ width: `${(count / topEmotions[0][1]) * 100}%`, background: e.positive ? 'var(--income)' : 'var(--expense)' }} />
                  </div>
                  <span className="mood-top-emotion-count">{count}×</span>
                </div>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
