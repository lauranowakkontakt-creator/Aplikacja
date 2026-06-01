import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { CatIcon } from './Icons'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay, subMonths, addMonths, eachDayOfInterval, eachMonthOfInterval, subWeeks, addWeeks, subYears, addYears, subDays, addDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { fmt } from '../utils/currency'

const COLORS = ['#C94B28','#6366f1','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4','#a78bfa']

const PERIODS = [
  { id: 'day',   label: 'Dzień'    },
  { id: 'week',  label: 'Tydzień'  },
  { id: 'month', label: 'Miesiąc'  },
  { id: 'year',  label: 'Rok'      },
]

export default function Charts({ user }) {
  const [tab, setTab]             = useState('general')
  const [chartType, setChartType] = useState('bar')
  const [period, setPeriod]       = useState('month')
  const [pivot, setPivot]         = useState(new Date())
  const [transactions, setTx]     = useState([])
  const [accounts, setAccounts]   = useState([])
  const [accountFilter, setAccountFilter] = useState('all')

  const bounds = getBounds(period, pivot)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('date', '>=', Timestamp.fromDate(bounds.start)),
      where('date', '<=', Timestamp.fromDate(bounds.end)),
      orderBy('date', 'asc')
    )
    return onSnapshot(q, snap => setTx(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() }))))
  }, [user.uid, period, pivot])

  const goBack = () => setPivot(p => shiftPivot(period, p, -1))
  const goFwd  = () => setPivot(p => shiftPivot(period, p, +1))

  const filtered = accountFilter === 'all' ? transactions : transactions.filter(t => t.accountId === accountFilter)
  const expenses = filtered.filter(t => t.type === 'expense')
  const incomes  = filtered.filter(t => t.type === 'income')
  const totalExp = expenses.reduce((s,t) => s+t.amount, 0)
  const totalInc = incomes.reduce((s,t) => s+t.amount, 0)
  const balance  = totalInc - totalExp

  return (
    <div className="charts">
      {/* Period selector */}
      <div className="habit-view-tabs">
        {PERIODS.map(p => (
          <button key={p.id} className={`habit-view-tab ${period === p.id ? 'active' : ''}`}
            onClick={() => { setPeriod(p.id); setPivot(new Date()) }}>{p.label}</button>
        ))}
      </div>

      {/* Period navigation */}
      <div className="habit-week-nav">
        <button className="month-btn" onClick={goBack}>‹</button>
        <span className="habit-period-label">{bounds.label}</span>
        <button className="month-btn" onClick={goFwd}>›</button>
      </div>

      {/* Account filter */}
      {accounts.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className={`account-chip ${accountFilter === 'all' ? 'active' : ''}`} onClick={() => setAccountFilter('all')}>Wszystkie konta</button>
          {accounts.map(a => (
            <button key={a.id}
              className={`account-chip ${accountFilter === a.id ? 'active' : ''}`}
              style={accountFilter === a.id ? { borderColor: a.color, background: a.color + '22' } : {}}
              onClick={() => setAccountFilter(a.id)}
            >{a.name}</button>
          ))}
        </div>
      )}

      {/* Tab selector */}
      <div className="habit-view-tabs" style={{ marginTop: 4 }}>
        {[['general','Ogólne'],['expense','Wydatki'],['income','Dochody']].map(([id,lbl]) => (
          <button key={id} className={`habit-view-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{lbl}</button>
        ))}
      </div>

      {/* Chart type toggle (not for general) */}
      {tab !== 'general' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`type-btn ${chartType === 'bar' ? 'active expense' : ''}`} style={{ flex: 1, padding: '8px 0' }} onClick={() => setChartType('bar')}>📊 Słupkowy</button>
          <button className={`type-btn ${chartType === 'pie' ? 'active expense' : ''}`} style={{ flex: 1, padding: '8px 0' }} onClick={() => setChartType('pie')}>🔵 Kołowy</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="charts-empty"><p>Brak danych w wybranym okresie</p></div>
      ) : (
        <>
          {tab === 'general' && <GeneralTab expenses={expenses} incomes={incomes} totalExp={totalExp} totalInc={totalInc} balance={balance} period={period} pivot={pivot} allTx={filtered} />}
          {tab === 'expense' && <CategoryTab transactions={expenses} total={totalExp} chartType={chartType} label="Wydatki" />}
          {tab === 'income'  && <CategoryTab transactions={incomes}  total={totalInc} chartType={chartType} label="Dochody" />}
        </>
      )}
    </div>
  )
}

/* ===== GENERAL TAB ===== */
function GeneralTab({ expenses, incomes, totalExp, totalInc, balance, period, pivot, allTx }) {
  const timeline = buildTimeline(period, pivot, allTx)
  const profit   = Math.max(0, balance)
  const loss     = Math.max(0, -balance)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Przychody', value: totalInc, color: '#27AE60' },
          { label: 'Wydatki',   value: totalExp, color: 'var(--expense)' },
          { label: 'Zysk',      value: profit,   color: '#27AE60' },
          { label: 'Strata',    value: loss,      color: 'var(--expense)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color }}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Timeline chart */}
      {timeline.length > 1 && (
        <div className="chart-section">
          <h3 className="chart-title">Przepływy w czasie</h3>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={timeline}>
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={52} tickFormatter={v => fmt(v).replace(/[\s,].*/,'')} />
              <Tooltip formatter={(v, name) => [fmt(v), name === 'income' ? 'Przychód' : name === 'expense' ? 'Wydatek' : 'Bilans']}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
              <Bar dataKey="income"  fill="#27AE60"        radius={[3,3,0,0]} name="income" />
              <Bar dataKey="expense" fill="var(--expense)" radius={[3,3,0,0]} name="expense" />
              <Bar dataKey="balance" radius={[3,3,0,0]} name="balance">
                {timeline.map((entry, i) => (
                  <Cell key={i} fill={entry.balance >= 0 ? '#3b82f6' : '#f97316'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ===== CATEGORY TAB ===== */
function CategoryTab({ transactions, total, chartType, label }) {
  const byCat = {}
  transactions.forEach(t => {
    const key = t.category || 'Inne'
    if (!byCat[key]) byCat[key] = { name: key, icon: t.categoryIcon || '📌', categoryId: t.categoryId, value: 0 }
    byCat[key].value += t.amount
  })
  const data = Object.values(byCat).sort((a, b) => b.value - a.value)

  if (!data.length) return <div className="charts-empty"><p>Brak {label.toLowerCase()}</p></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Chart */}
      <div className="chart-section">
        {chartType === 'pie' ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={88} paddingAngle={3} dataKey="value">
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
            <BarChart data={data} layout="vertical" margin={{ left: 4, right: 60, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v).replace(/[\s,].*/,'')} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category list with % */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((item, i) => {
          const pct = total > 0 ? (item.value / total * 100) : 0
          return (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
              <CatIcon categoryId={item.categoryId} emoji={item.icon} size={16} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{item.name}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(item.value)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 38, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
            </div>
          )
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Łącznie</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}

/* ===== UTILS ===== */
function getBounds(period, pivot) {
  if (period === 'day') {
    return { start: startOfDay(pivot), end: endOfDay(pivot), label: format(pivot, 'd MMMM yyyy', { locale: pl }) }
  }
  if (period === 'week') {
    const start = startOfWeek(pivot, { weekStartsOn: 1 })
    const end   = endOfWeek(pivot, { weekStartsOn: 1 })
    return { start, end, label: `${format(start, 'd MMM', { locale: pl })} – ${format(end, 'd MMM yyyy', { locale: pl })}` }
  }
  if (period === 'year') {
    return { start: startOfYear(pivot), end: endOfYear(pivot), label: format(pivot, 'yyyy') }
  }
  return { start: startOfMonth(pivot), end: endOfMonth(pivot), label: format(pivot, 'LLLL yyyy', { locale: pl }) }
}

function shiftPivot(period, pivot, dir) {
  if (period === 'day')   return dir > 0 ? addDays(pivot, 1) : subDays(pivot, 1)
  if (period === 'week')  return dir > 0 ? addWeeks(pivot, 1) : subWeeks(pivot, 1)
  if (period === 'year')  return dir > 0 ? addYears(pivot, 1) : subYears(pivot, 1)
  return dir > 0 ? addMonths(pivot, 1) : subMonths(pivot, 1)
}

function buildTimeline(period, pivot, transactions) {
  const bounds = getBounds(period, pivot)
  const map = {}

  if (period === 'day') {
    for (let h = 0; h < 24; h++) {
      const lbl = `${h}:00`
      map[lbl] = { label: lbl, income: 0, expense: 0, balance: 0 }
    }
    transactions.forEach(t => {
      const key = `${t.date.getHours()}:00`
      if (map[key]) map[key][t.type] += t.amount
    })
  } else if (period === 'week') {
    eachDayOfInterval({ start: bounds.start, end: bounds.end }).forEach(d => {
      const lbl = format(d, 'EEE', { locale: pl })
      map[lbl] = { label: lbl, income: 0, expense: 0, balance: 0 }
    })
    transactions.forEach(t => {
      const key = format(t.date, 'EEE', { locale: pl })
      if (map[key]) map[key][t.type] += t.amount
    })
  } else if (period === 'year') {
    eachMonthOfInterval({ start: bounds.start, end: bounds.end }).forEach(d => {
      const lbl = format(d, 'MMM', { locale: pl })
      map[lbl] = { label: lbl, income: 0, expense: 0, balance: 0 }
    })
    transactions.forEach(t => {
      const key = format(t.date, 'MMM', { locale: pl })
      if (map[key]) map[key][t.type] += t.amount
    })
  } else {
    for (let i = 1; i <= 31; i++) {
      const d = new Date(pivot.getFullYear(), pivot.getMonth(), i)
      if (d.getMonth() !== pivot.getMonth()) break
      map[String(i)] = { label: String(i), income: 0, expense: 0, balance: 0 }
    }
    transactions.forEach(t => {
      const key = String(t.date.getDate())
      if (map[key]) map[key][t.type] += t.amount
    })
  }

  return Object.values(map).map(row => ({ ...row, balance: row.income - row.expense }))
}
