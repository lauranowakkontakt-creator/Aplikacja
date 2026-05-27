import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, addMonths, eachDayOfInterval, eachMonthOfInterval, subWeeks, addWeeks, subYears, addYears } from 'date-fns'
import { pl } from 'date-fns/locale'
import { fmt } from '../utils/currency'

const COLORS = ['#C94B28','#6366f1','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

const PERIODS = [
  { id: 'week',  label: 'Tydzień' },
  { id: 'month', label: 'Miesiąc' },
  { id: 'year',  label: 'Rok' },
]

export default function Charts({ user }) {
  const [period, setPeriod]       = useState('month')
  const [pivot, setPivot]         = useState(new Date())
  const [transactions, setTx]     = useState([])
  const [loading, setLoading]     = useState(true)

  const bounds = getBounds(period, pivot)

  useEffect(() => {
    setLoading(true)
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('date', '>=', Timestamp.fromDate(bounds.start)),
      where('date', '<=', Timestamp.fromDate(bounds.end)),
      orderBy('date', 'asc')
    )
    return onSnapshot(q, snap => {
      setTx(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })))
      setLoading(false)
    })
  }, [user.uid, period, pivot])

  const goBack = () => setPivot(p => shiftPivot(period, p, -1))
  const goFwd  = () => setPivot(p => shiftPivot(period, p, +1))

  const expenses  = transactions.filter(t => t.type === 'expense')
  const incomes   = transactions.filter(t => t.type === 'income')
  const totalExp  = expenses.reduce((s, t) => s + t.amount, 0)
  const totalInc  = incomes.reduce((s, t) => s + t.amount, 0)

  // Pie: expenses by category
  const expByCat = groupBy(expenses, 'category')
  const pieData  = Object.entries(expByCat).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value)

  // Timeline bar: income vs expense per period bucket
  const timeline = buildTimeline(period, pivot, transactions)

  if (loading) return <div className="list-loading">Ładowanie wykresu...</div>
  if (transactions.length === 0) return (
    <div className="charts-empty">
      <p>Brak danych w wybranym okresie</p>
      <p className="list-empty-hint">Dodaj transakcje aby zobaczyć wykresy</p>
    </div>
  )

  return (
    <div className="charts">
      {/* Period selector + navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
        <div className="habit-view-tabs">
          {PERIODS.map(p => (
            <button key={p.id} className={`habit-view-tab ${period === p.id ? 'active' : ''}`}
              onClick={() => { setPeriod(p.id); setPivot(new Date()) }}>{p.label}</button>
          ))}
        </div>
        <div className="habit-week-nav">
          <button className="month-btn" onClick={goBack}>‹</button>
          <span className="habit-period-label">{bounds.label}</span>
          <button className="month-btn" onClick={goFwd}>›</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Przychody</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#27AE60' }}>{fmt(totalInc)}</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wydatki</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--expense)' }}>{fmt(totalExp)}</p>
        </div>
      </div>

      {/* Timeline bar chart */}
      {timeline.length > 1 && (
        <div className="chart-section">
          <h3 className="chart-title">Przepływy w czasie</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timeline} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => fmt(v).replace(/\s.*/, '')} />
              <Tooltip formatter={(v, name) => [fmt(v), name === 'income' ? 'Przychód' : 'Wydatek']}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
              <Bar dataKey="income"  fill="#27AE60"      radius={[4,4,0,0]} />
              <Bar dataKey="expense" fill="var(--expense)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense pie by category */}
      {pieData.length > 0 && (
        <div className="chart-section">
          <h3 className="chart-title">Wydatki wg kategorii</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => fmt(v)}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pieData.map((item, i) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{item.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(item.value)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, textAlign: 'right' }}>
                  {Math.round((item.value / totalExp) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getBounds(period, pivot) {
  if (period === 'week') {
    const start = startOfWeek(pivot, { weekStartsOn: 1 })
    const end   = endOfWeek(pivot, { weekStartsOn: 1 })
    return { start, end, label: `${format(start, 'd MMM', { locale: pl })} – ${format(end, 'd MMM yyyy', { locale: pl })}` }
  }
  if (period === 'year') {
    const start = startOfYear(pivot)
    const end   = endOfYear(pivot)
    return { start, end, label: format(pivot, 'yyyy') }
  }
  // month (default)
  return {
    start: startOfMonth(pivot),
    end:   endOfMonth(pivot),
    label: format(pivot, 'LLLL yyyy', { locale: pl })
  }
}

function shiftPivot(period, pivot, dir) {
  if (period === 'week')  return dir > 0 ? addWeeks(pivot, 1) : subWeeks(pivot, 1)
  if (period === 'year')  return dir > 0 ? addYears(pivot, 1) : subYears(pivot, 1)
  return dir > 0 ? addMonths(pivot, 1) : subMonths(pivot, 1)
}

function buildTimeline(period, pivot, transactions) {
  const bounds = getBounds(period, pivot)

  const bucket = (date) => {
    if (period === 'week')  return format(date, 'EEE', { locale: pl })
    if (period === 'year')  return format(date, 'MMM', { locale: pl })
    return format(date, 'd')
  }

  const map = {}
  if (period === 'week') {
    eachDayOfInterval({ start: bounds.start, end: bounds.end }).forEach(d => {
      map[format(d, 'EEE', { locale: pl })] = { label: format(d, 'EEE', { locale: pl }), income: 0, expense: 0 }
    })
  } else if (period === 'year') {
    eachMonthOfInterval({ start: bounds.start, end: bounds.end }).forEach(d => {
      map[format(d, 'MMM', { locale: pl })] = { label: format(d, 'MMM', { locale: pl }), income: 0, expense: 0 }
    })
  } else {
    for (let i = 1; i <= 31; i++) {
      const d = new Date(pivot.getFullYear(), pivot.getMonth(), i)
      if (d.getMonth() !== pivot.getMonth()) break
      map[String(i)] = { label: String(i), income: 0, expense: 0 }
    }
  }

  transactions.forEach(t => {
    const key = bucket(t.date)
    if (map[key]) map[key][t.type] += t.amount
  })

  return Object.values(map)
}

function groupBy(arr, key) {
  return arr.reduce((acc, t) => { acc[t[key]] = (acc[t[key]] || 0) + t.amount; return acc }, {})
}
