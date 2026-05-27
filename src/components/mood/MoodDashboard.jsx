import { useState, useEffect } from 'react'
import { collection, doc, setDoc, deleteDoc, onSnapshot, Timestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, subDays, startOfMonth, getDaysInMonth, addDays, subMonths, addMonths, startOfYear } from 'date-fns'
import { pl } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, ReferenceLine } from 'recharts'

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

  const todayEntry = entries.find(e => e.date === TODAY)

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div className="mood-dashboard">
      <div className="habits-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <button className="habit-compact-btn" onClick={onBack} title="Wróć do nawyków" style={{ fontSize: 18 }}>←</button>
          )}
          <div>
            <h2 className="habits-title">Nastrój 💭</h2>
            <p className="habits-subtitle">{format(new Date(), 'EEEE, d MMMM', { locale: pl })}</p>
          </div>
        </div>
      </div>

      <div className="habit-view-tabs">
        {[['today','Dziś'],['calendar','Kalendarz'],['trends','Trendy']].map(([id, label]) => (
          <button key={id} className={`habit-view-tab ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>{label}</button>
        ))}
      </div>

      {view === 'today'    && <MoodTodayView user={user} entry={todayEntry} today={TODAY} entries={entries} />}
      {view === 'calendar' && <MoodCalendarView user={user} entries={entries} calMonth={calMonth} setCalMonth={setCalMonth} today={TODAY} />}
      {view === 'trends'   && <MoodTrendsView entries={entries} today={TODAY} />}
    </div>
  )
}

/* ============================================================
   TODAY VIEW
   ============================================================ */
function MoodTodayView({ user, entry, today, entries }) {
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
  }, [entry?.mood, entry?.id])

  const toggleEmotion = (id) => {
    setEmotions(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
    setSaved(false)
  }

  const handleSave = async () => {
    if (!mood) return
    setSaving(true)
    const m = MOODS.find(m => m.id === mood)
    await setDoc(doc(db, 'users', user.uid, 'moods', today), {
      date: today, mood, moodValue: m.value, moodEmoji: m.emoji, moodLabel: m.label,
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

  return (
    <div className="mood-today">
      {/* Pasek ostatnich 7 dni */}
      <div className="mood-week-strip">
        {recent7.map(({ date, mood: m }) => (
          <div key={date} className={`mood-week-day ${date === today ? 'today' : ''}`}>
            <span className="mood-week-emoji" style={m ? { opacity: 1 } : {}}>{m ? m.emoji : '·'}</span>
            <span className="mood-week-label">{format(new Date(date + 'T12:00:00'), 'EEE', { locale: pl })}</span>
          </div>
        ))}
      </div>

      {/* 1. RANKING */}
      <div className="mood-block">
        <p className="mood-block-title">Jak się dziś czujesz?</p>
        <div className="mood-picker">
          {MOODS.map(m => (
            <button key={m.id}
              className={`mood-btn ${mood === m.id ? 'active' : ''}`}
              style={mood === m.id ? { background: m.color + '22', borderColor: m.color, transform: 'scale(1.12)' } : {}}
              onClick={() => { setMood(m.id); setSaved(false) }}
            >
              <span className="mood-btn-emoji">{m.emoji}</span>
              <span className="mood-btn-label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. EMOCJE PODSTAWOWE */}
      {mood && (
        <div className="mood-block">
          <p className="mood-block-title">Podstawowe emocje</p>
          <div className="mood-emotions">
            {EMOTIONS_BASIC.map(e => (
              <button key={e.id}
                className={`mood-emotion-btn ${emotions.includes(e.id) ? 'active' : ''}`}
                style={emotions.includes(e.id) ? {
                  borderColor: e.positive ? '#27AE60' : '#E74C3C',
                  background:  e.positive ? '#27AE6020' : '#E74C3C20',
                  color: 'var(--text)'
                } : {}}
                onClick={() => toggleEmotion(e.id)}
              >{e.emoji} {e.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* 3. EMOCJE ROZSZERZONE */}
      {mood && (
        <div className="mood-block">
          <button className="mood-expand-btn" onClick={() => setShowExt(v => !v)}>
            {showExt ? '▲' : '▼'} Rozszerzone emocje
          </button>
          {showExt && (
            <div className="mood-emotions" style={{ marginTop: 10 }}>
              {EMOTIONS_EXTENDED.map(e => (
                <button key={e.id}
                  className={`mood-emotion-btn ${emotions.includes(e.id) ? 'active' : ''}`}
                  style={emotions.includes(e.id) ? {
                    borderColor: e.positive ? '#27AE60' : '#E74C3C',
                    background:  e.positive ? '#27AE6020' : '#E74C3C20',
                    color: 'var(--text)'
                  } : {}}
                  onClick={() => toggleEmotion(e.id)}
                >{e.emoji} {e.label}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. NOTATKA */}
      {mood && (
        <div className="mood-block">
          <p className="mood-block-title">Notatka</p>
          <textarea className="mood-note-input form-input"
            placeholder="Co się dziś wydarzyło? O czym myślisz?"
            value={note} onChange={e => { setNote(e.target.value); setSaved(false) }}
            rows={3} maxLength={500}
          />
        </div>
      )}

      {mood && (
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Zapisywanie...' : saved ? '✓ Zapisano' : 'Zapisz wpis'}
        </button>
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
      <div className="habit-week-nav">
        <button className="month-btn" onClick={() => setCalMonth(m => subMonths(m, 1))}>‹</button>
        <span className="habit-period-label">{format(calMonth, 'LLLL yyyy', { locale: pl })}</span>
        <button className="month-btn" onClick={() => setCalMonth(m => addMonths(m, 1))}>›</button>
      </div>

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
            {m && <span className="mood-cal-emoji">{m.emoji}</span>}
          </button>
        ))}
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
          <span style={{ fontSize: 28 }}>{m?.emoji}</span>
          <div>
            <p className="mood-entry-label">{m?.label}</p>
            <p className="mood-entry-date">{format(new Date(entry.date + 'T12:00:00'), 'd MMMM yyyy', { locale: pl })}</p>
          </div>
        </div>
        <button className="t-btn delete" onClick={handleDelete}>🗑️</button>
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

  // Statystyki ogólne
  const total  = entries.length
  const avg    = total ? (entries.reduce((s,e) => s + (e.moodValue||0), 0) / total) : 0
  const avgMood = avg ? MOODS.reduce((p,c) => Math.abs(c.value-avg) < Math.abs(p.value-avg) ? c : p) : null

  // Streak wpisów
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    if (entries.find(e => e.date === d)) streak++
    else if (i > 0) break
  }

  // Rozkład nastrojów
  const moodDist = MOODS.map(m => ({
    ...m,
    count: entries.filter(e => e.mood === m.id).length
  })).filter(m => m.count > 0)

  // Top emocje
  const emotionCount = {}
  entries.forEach(e => e.emotions?.forEach(em => { emotionCount[em] = (emotionCount[em] || 0) + 1 }))
  const topEmotions = Object.entries(emotionCount).sort((a,b) => b[1]-a[1]).slice(0, 8)

  // Porównanie: ten miesiąc vs poprzedni
  const thisMonth = format(new Date(), 'yyyy-MM')
  const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM')
  const thisMonthEntries = entries.filter(e => e.date.startsWith(thisMonth))
  const lastMonthEntries = entries.filter(e => e.date.startsWith(lastMonth))
  const thisAvg = thisMonthEntries.length ? (thisMonthEntries.reduce((s,e) => s + e.moodValue, 0) / thisMonthEntries.length).toFixed(1) : null
  const lastAvg = lastMonthEntries.length ? (lastMonthEntries.reduce((s,e) => s + e.moodValue, 0) / lastMonthEntries.length).toFixed(1) : null
  const diff = thisAvg && lastAvg ? (thisAvg - lastAvg).toFixed(1) : null

  if (!total) return <div className="list-empty"><p>Brak wpisów</p><p className="list-empty-hint">Zacznij od zakładki Dziś</p></div>

  return (
    <div className="mood-trends">
      {/* Karty podsumowania */}
      <div className="mood-stats-grid">
        <div className="mood-stat-card">
          <span className="mood-stat-card-icon" style={{ color: avgMood?.color }}>{avgMood?.emoji}</span>
          <p className="mood-stat-card-val">{avg.toFixed(1)}<span>/7</span></p>
          <p className="mood-stat-card-lbl">Średni nastrój</p>
        </div>
        <div className="mood-stat-card">
          <span className="mood-stat-card-icon">📅</span>
          <p className="mood-stat-card-val">{total}</p>
          <p className="mood-stat-card-lbl">Wpisów łącznie</p>
        </div>
        <div className="mood-stat-card">
          <span className="mood-stat-card-icon">🔥</span>
          <p className="mood-stat-card-val">{streak}</p>
          <p className="mood-stat-card-lbl">Dni z rzędu</p>
        </div>
        {diff !== null && (
          <div className="mood-stat-card">
            <span className="mood-stat-card-icon">{Number(diff) >= 0 ? '📈' : '📉'}</span>
            <p className="mood-stat-card-val" style={{ color: Number(diff) >= 0 ? '#27AE60' : '#E74C3C' }}>
              {Number(diff) >= 0 ? '+' : ''}{diff}
            </p>
            <p className="mood-stat-card-lbl">vs poprz. miesiąc</p>
          </div>
        )}
      </div>

      {/* Wykres liniowy */}
      <div className="habit-chart-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="habit-chart-title" style={{ margin: 0 }}>Nastrój w czasie</p>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['14d','14 dni'],['30d','30 dni'],['90d','90 dni']].map(([id, lbl]) => (
              <button key={id}
                className={`type-btn ${period === id ? 'active expense' : ''}`}
                style={{ padding: '4px 10px', fontSize: 11 }}
                onClick={() => setPeriod(id)}
              >{lbl}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData}>
            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={days <= 14 ? 0 : 'preserveStartEnd'} />
            <YAxis domain={[1,7]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={22}
              tickFormatter={v => MOODS.find(m => m.value === v)?.emoji || ''} />
            <Tooltip
              formatter={v => [MOODS.find(m => m.value === v)?.label || v, 'Nastrój']}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
            />
            <ReferenceLine y={4} stroke="var(--border)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2}
              dot={{ fill: 'var(--primary)', r: 3 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Rozkład nastrojów */}
      {moodDist.length > 0 && (
        <div className="mood-block">
          <p className="mood-block-title">Rozkład nastrojów</p>
          <div className="mood-dist">
            {moodDist.sort((a,b) => b.count - a.count).map(m => (
              <div key={m.id} className="mood-dist-row">
                <span className="mood-dist-emoji">{m.emoji}</span>
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
        <div className="mood-block">
          <p className="mood-block-title">Najczęstsze emocje</p>
          <div className="mood-top-emotions">
            {topEmotions.map(([id, count]) => {
              const e = EMOTIONS.find(em => em.id === id)
              return e ? (
                <div key={id} className="mood-top-emotion">
                  <span className="mood-top-emotion-name">{e.emoji} {e.label}</span>
                  <div className="mood-top-emotion-bar-wrap">
                    <div className="mood-top-emotion-bar"
                      style={{ width: `${(count / topEmotions[0][1]) * 100}%`, background: e.positive ? '#27AE60' : '#E74C3C' }} />
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
