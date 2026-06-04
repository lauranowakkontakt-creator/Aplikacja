import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp, getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { CatIcon, IconChevronLeft, IconChevronRight } from './Icons'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, CartesianGrid
} from 'recharts'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, startOfDay, endOfDay,
  subMonths, addMonths, eachDayOfInterval, eachMonthOfInterval,
  subWeeks, addWeeks, subYears, addYears, subDays, addDays
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { fmt } from '../utils/currency'
import { getSubcategoryColor, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../utils/categories'

const FALLBACK_COLORS = [
  '#C94B28','#6366f1','#f59e0b','#10b981','#3b82f6','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4','#a78bfa',
]

const PERIODS = [
  { id: 'day',   label: 'Dzień'   },
  { id: 'week',  label: 'Tydzień' },
  { id: 'month', label: 'Miesiąc' },
  { id: 'year',  label: 'Rok'     },
]

const TOOLTIP_STYLE = {
  background: 'var(--surface2)',
  border: '1px solid var(--border-strong)',
  borderRadius: 10,
  color: 'var(--text)',
  fontSize: 12,
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
}

export default function Charts({ user }) {
  const [tab, setTab]             = useState('general')
  const [chartType, setChartType] = useState('list')
  const [period, setPeriod]       = useState('month')
  const [pivot, setPivot]         = useState(new Date())
  const [transactions, setTx]     = useState([])
  const [accounts, setAccounts]   = useState([])
  const [accountFilter, setAccountFilter] = useState('all')
  const [customCats, setCustomCats] = useState(null)

  const bounds = getBounds(period, pivot)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    getDoc(doc(db, 'users', user.uid, 'settings', 'categories')).then(d => {
      setCustomCats(d.exists() ? d.data() : {})
    })
  }, [user.uid])

  const catColorMap = useMemo(() => {
    const map = {}
    ;[...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].forEach(c => { map[c.id] = c.color })
    if (customCats) {
      ;[...(customCats.expense || []), ...(customCats.income || [])].forEach(c => { if (c.id && c.color) map[c.id] = c.color })
    }
    return map
  }, [customCats])

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('date', '>=', Timestamp.fromDate(bounds.start)),
      where('date', '<=', Timestamp.fromDate(bounds.end)),
      orderBy('date', 'asc')
    )
    return onSnapshot(q, snap =>
      setTx(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })))
    )
  }, [user.uid, period, pivot])

  const goBack = () => setPivot(p => shiftPivot(period, p, -1))
  const goFwd  = () => setPivot(p => shiftPivot(period, p, +1))

  const filtered = accountFilter === 'all' ? transactions : transactions.filter(t => t.accountId === accountFilter)
  const expenses = filtered.filter(t => t.type === 'expense')
  const incomes  = filtered.filter(t => t.type === 'income')
  const totalExp = expenses.reduce((s, t) => s + t.amount, 0)
  const totalInc = incomes.reduce((s, t) => s + t.amount, 0)
  const balance  = totalInc - totalExp

  return (
    <div className="charts">

      {/* Period selector */}
      <div className="habit-view-tabs">
        {PERIODS.map(p => (
          <button key={p.id}
            className={`habit-view-tab ${period === p.id ? 'active' : ''}`}
            onClick={() => { setPeriod(p.id); setPivot(new Date()) }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Period navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="icon-btn" onClick={goBack}><IconChevronLeft size={16} /></button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>
          {bounds.label}
        </span>
        <button className="icon-btn" onClick={goFwd}><IconChevronRight size={16} /></button>
      </div>

      {/* Account filter */}
      {accounts.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={`account-chip ${accountFilter === 'all' ? 'active' : ''}`}
            onClick={() => setAccountFilter('all')}>
            Wszystkie
          </button>
          {accounts.map(a => (
            <button key={a.id}
              className={`account-chip ${accountFilter === a.id ? 'active' : ''}`}
              style={accountFilter === a.id ? { borderColor: a.color, background: a.color + '22' } : {}}
              onClick={() => setAccountFilter(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
      )}

      {/* Tab selector */}
      <div className="habit-view-tabs">
        {[['general','Ogólne'],['expense','Wydatki'],['income','Dochody']].map(([id, lbl]) => (
          <button key={id}
            className={`habit-view-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Chart type toggle (for category tabs) */}
      {tab !== 'general' && (
        <div style={{ display: 'flex', gap: 6 }}>
          {[['list','Lista'],['pie','Kołowy']].map(([id, lbl]) => (
            <button key={id}
              className={`type-btn ${chartType === id ? 'active expense' : ''}`}
              style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
              onClick={() => setChartType(id)}>
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="charts-empty">
          <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
          <p>Brak transakcji w tym okresie</p>
        </div>
      ) : (
        <>
          {tab === 'general' && (
            <GeneralTab
              expenses={expenses} incomes={incomes}
              totalExp={totalExp} totalInc={totalInc} balance={balance}
              period={period} pivot={pivot} allTx={filtered}
            />
          )}
          {tab === 'expense' && (
            <CategoryTab
              transactions={expenses} total={totalExp}
              chartType={chartType} label="Wydatki" catColorMap={catColorMap}
              accentColor="var(--expense)"
            />
          )}
          {tab === 'income' && (
            <CategoryTab
              transactions={incomes} total={totalInc}
              chartType={chartType} label="Dochody" catColorMap={catColorMap}
              accentColor="var(--income)"
              key="income"
            />
          )}
        </>
      )}
    </div>
  )
}

/* ─── General Tab ─── */
function GeneralTab({ expenses, incomes, totalExp, totalInc, balance, period, pivot, allTx }) {
  const timeline = buildTimeline(period, pivot, allTx)
  const savingsRate = totalInc > 0 ? Math.round((balance / totalInc) * 100) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Balance hero card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '20px 20px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle bg tint based on positive/negative */}
        <div style={{
          position: 'absolute', inset: 0,
          background: balance >= 0
            ? 'radial-gradient(ellipse at top right, rgba(39,174,96,0.08) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at top right, rgba(224,101,60,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Bilans okresu
        </p>
        <p style={{
          margin: '0 0 16px',
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: balance >= 0 ? 'var(--income)' : 'var(--expense)',
          lineHeight: 1.1,
        }}>
          {balance >= 0 ? '+' : '−'}{fmt(Math.abs(balance))}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 0, alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Przychody</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--income)' }}>+{fmt(totalInc)}</p>
          </div>
          <div style={{ width: 1, height: 32, background: 'var(--border)', justifySelf: 'center' }} />
          <div style={{ paddingLeft: 16 }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Wydatki</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--expense)' }}>−{fmt(totalExp)}</p>
          </div>
        </div>

        {savingsRate !== null && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, savingsRate))}%`,
                background: savingsRate >= 0 ? 'var(--income)' : 'var(--expense)',
                borderRadius: 99,
                transition: 'width 0.6s ease',
              }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right' }}>
              {savingsRate >= 0 ? 'oszczędności' : 'na minusie'} {Math.abs(savingsRate)}%
            </span>
          </div>
        )}
      </div>

      {/* Timeline chart */}
      {timeline.length > 1 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 12px 8px' }}>
          <p style={{ margin: '0 0 12px 4px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Przepływy w czasie
          </p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={timeline} barGap={2} barCategoryGap="35%">
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                formatter={(v, name) => [fmt(v), name === 'income' ? 'Przychód' : 'Wydatek']}
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
              />
              <Bar dataKey="income"  name="income"  fill="#27AE60" radius={[4,4,0,0]} maxBarSize={32} />
              <Bar dataKey="expense" name="expense" fill="var(--expense)" radius={[4,4,0,0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
            {[['#27AE60','Przychody'],['var(--expense)','Wydatki']].map(([color, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Category Tab ─── */
function CategoryTab({ transactions, total, chartType, label, catColorMap = {}, accentColor }) {
  const [drillDown, setDrillDown] = useState(null)

  const hasSubcatSet = new Set()
  transactions.forEach(t => { if (t.subcategoryId) hasSubcatSet.add(t.categoryId) })

  const byCat = {}
  transactions.forEach(t => {
    const key = t.categoryId || t.category || 'Inne'
    if (!byCat[key]) byCat[key] = { name: t.category || 'Inne', icon: t.categoryIcon || '📌', categoryId: t.categoryId, value: 0 }
    byCat[key].value += t.amount
  })
  const data = Object.values(byCat).sort((a, b) => b.value - a.value)
  data.forEach((item, i) => {
    item.chartColor = catColorMap[item.categoryId] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
  })

  if (drillDown) {
    const catTxs = transactions.filter(t => t.categoryId === drillDown.categoryId)
    const bySub  = {}
    catTxs.forEach(t => {
      const key  = t.subcategoryId || '__none__'
      const name = t.subcategoryLabel || 'Ogólne'
      if (!bySub[key]) bySub[key] = { name, value: 0 }
      bySub[key].value += t.amount
    })
    const subData   = Object.values(bySub).sort((a, b) => b.value - a.value)
    const subTotal  = catTxs.reduce((s, t) => s + t.amount, 0)
    const subColors = subData.map((_, i) => getSubcategoryColor(drillDown.parentColor, i))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => setDrillDown(null)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '10px 14px', cursor: 'pointer',
          fontSize: 13, color: 'var(--text)',
        }}>
          <IconChevronLeft size={14} />
          <CatIcon categoryId={drillDown.categoryId} emoji={drillDown.icon} size={16} />
          <span style={{ fontWeight: 600 }}>{drillDown.name}</span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{fmt(subTotal)}</span>
        </button>

        {chartType === 'pie' ? (
          <DonutChart data={subData} colors={subColors} total={subTotal} />
        ) : (
          <ProgressList data={subData} total={subTotal} colors={subColors} />
        )}
      </div>
    )
  }

  if (!data.length) return (
    <div className="charts-empty">
      <p style={{ fontSize: 32, marginBottom: 8 }}>🗂️</p>
      <p>Brak {label.toLowerCase()}</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {chartType === 'pie' ? (
        <DonutChart data={data} colors={data.map(d => d.chartColor)} total={total} />
      ) : (
        <ProgressList
          data={data} total={total}
          colors={data.map(d => d.chartColor)}
          onItemClick={(item) => hasSubcatSet.has(item.categoryId)
            ? setDrillDown({ categoryId: item.categoryId, name: item.name, icon: item.icon, parentColor: item.chartColor })
            : null
          }
          hasSubcat={hasSubcatSet}
          renderIcon={(item) => (
            <CatIcon categoryId={item.categoryId} emoji={item.icon} size={15} />
          )}
        />
      )}
    </div>
  )
}

/* ─── Progress bar list (replaces horizontal BarChart) ─── */
function ProgressList({ data, total, colors, onItemClick, hasSubcat, renderIcon }) {
  const maxVal = data[0]?.value || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((item, i) => {
        const pct    = total > 0 ? (item.value / total * 100) : 0
        const relPct = (item.value / maxVal) * 100
        const color  = colors[i]
        const clickable = hasSubcat?.has(item.categoryId)

        return (
          <div
            key={item.name}
            onClick={() => onItemClick?.(item)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '12px 14px',
              cursor: clickable ? 'pointer' : 'default',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { if (clickable) { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--surface2)' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color,
              }}>
                {renderIcon ? renderIcon(item) : <span style={{ fontSize: 14 }}>{item.name[0]}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{fmt(item.value)}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</p>
              </div>
              {clickable && <span style={{ fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }}>›</span>}
            </div>
            <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: relPct + '%',
                background: color,
                borderRadius: 99,
                transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
              }} />
            </div>
          </div>
        )
      })}

      {/* Total row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        background: 'var(--surface2)',
        borderRadius: 12,
        marginTop: 2,
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Łącznie</span>
        <span style={{ fontSize: 17, fontWeight: 800 }}>{fmt(total)}</span>
      </div>
    </div>
  )
}

/* ─── Donut chart with center label ─── */
function DonutChart({ data, colors, total }) {
  const [active, setActive] = useState(null)
  const displayItem = active != null ? data[active] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data} cx="50%" cy="50%"
              innerRadius={62} outerRadius={96}
              paddingAngle={2} dataKey="value"
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={colors[i]}
                  opacity={active == null || active === i ? 1 : 0.4}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={v => fmt(v)}
              contentStyle={TOOLTIP_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {displayItem ? (
            <>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {displayItem.name}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: colors[active] }}>
                {fmt(displayItem.value)}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                {total > 0 ? (displayItem.value / total * 100).toFixed(1) : 0}%
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Łącznie</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800 }}>{fmt(total)}</p>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((item, i) => {
          const pct = total > 0 ? (item.value / total * 100) : 0
          return (
            <div key={item.name}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 6px', borderRadius: 8,
                background: active === i ? 'var(--surface2)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i], flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(item.value)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Utils ─── */
function getBounds(period, pivot) {
  if (period === 'day') {
    return { start: startOfDay(pivot), end: endOfDay(pivot), label: format(pivot, 'd MMMM yyyy', { locale: pl }) }
  }
  if (period === 'week') {
    const start = startOfWeek(pivot, { weekStartsOn: 1 })
    const end   = endOfWeek(pivot,   { weekStartsOn: 1 })
    return { start, end, label: `${format(start, 'd MMM', { locale: pl })} – ${format(end, 'd MMM yyyy', { locale: pl })}` }
  }
  if (period === 'year') {
    return { start: startOfYear(pivot), end: endOfYear(pivot), label: format(pivot, 'yyyy') }
  }
  return { start: startOfMonth(pivot), end: endOfMonth(pivot), label: format(pivot, 'LLLL yyyy', { locale: pl }) }
}

function shiftPivot(period, pivot, dir) {
  if (period === 'day')  return dir > 0 ? addDays(pivot, 1)    : subDays(pivot, 1)
  if (period === 'week') return dir > 0 ? addWeeks(pivot, 1)   : subWeeks(pivot, 1)
  if (period === 'year') return dir > 0 ? addYears(pivot, 1)   : subYears(pivot, 1)
  return dir > 0 ? addMonths(pivot, 1) : subMonths(pivot, 1)
}

function buildTimeline(period, pivot, transactions) {
  const bounds = getBounds(period, pivot)
  const map    = {}

  if (period === 'day') {
    for (let h = 0; h < 24; h++) {
      const lbl = `${h}h`
      map[lbl] = { label: lbl, income: 0, expense: 0 }
    }
    transactions.forEach(t => {
      const key = `${t.date.getHours()}h`
      if (map[key]) map[key][t.type] += t.amount
    })
  } else if (period === 'week') {
    eachDayOfInterval({ start: bounds.start, end: bounds.end }).forEach(d => {
      const lbl = format(d, 'EEE', { locale: pl })
      map[lbl] = { label: lbl, income: 0, expense: 0 }
    })
    transactions.forEach(t => {
      const key = format(t.date, 'EEE', { locale: pl })
      if (map[key]) map[key][t.type] += t.amount
    })
  } else if (period === 'year') {
    eachMonthOfInterval({ start: bounds.start, end: bounds.end }).forEach(d => {
      const lbl = format(d, 'MMM', { locale: pl })
      map[lbl] = { label: lbl, income: 0, expense: 0 }
    })
    transactions.forEach(t => {
      const key = format(t.date, 'MMM', { locale: pl })
      if (map[key]) map[key][t.type] += t.amount
    })
  } else {
    for (let i = 1; i <= 31; i++) {
      const d = new Date(pivot.getFullYear(), pivot.getMonth(), i)
      if (d.getMonth() !== pivot.getMonth()) break
      map[String(i)] = { label: String(i), income: 0, expense: 0 }
    }
    transactions.forEach(t => {
      const key = String(t.date.getDate())
      if (map[key]) map[key][t.type] += t.amount
    })
  }

  return Object.values(map)
}
