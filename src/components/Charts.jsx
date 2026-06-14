import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp, getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { CatIcon, IconChevronLeft, IconChevronRight, IconChart } from './Icons'
import { useMounted, BarChartSVG, FlowBar } from './ChartPrimitives'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, startOfDay, endOfDay,
  subMonths, addMonths, eachDayOfInterval, eachMonthOfInterval,
  subWeeks, addWeeks, subYears, addYears, subDays, addDays
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { fmt } from '../utils/currency'
import { getSubcategoryColor, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, isTransfer } from '../utils/categories'

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

export default function Charts({ user, privateMode = false }) {
  const [tab, setTab]             = useState('general')
  const [chartType, setChartType] = useState('list')
  const [period, setPeriod]       = useState('month')
  const [pivot, setPivot]         = useState(new Date())
  const [transactions, setTx]     = useState([])
  const [allYearTx, setAllYearTx] = useState([])
  const [accounts, setAccounts]   = useState([])
  const [accountFilter, setAccountFilter] = useState('all')
  const [showAllAcc, setShowAllAcc] = useState(false)
  const [customCats, setCustomCats] = useState(null)

  const bounds = getBounds(period, pivot)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    getDoc(doc(db, 'users', user.uid, 'settings', 'categories')).then(d => {
      setCustomCats(d.exists() ? d.data() : {})
    }).catch(() => setCustomCats({}))
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

  // 12-month data for timeline (always, regardless of selected period)
  useEffect(() => {
    const twelveAgo = startOfMonth(subMonths(new Date(), 11))
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('date', '>=', Timestamp.fromDate(twelveAgo)),
      orderBy('date', 'asc')
    )
    return onSnapshot(q, snap =>
      setAllYearTx(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })))
    )
  }, [user.uid])

  // Najczęściej używane konta (z ostatnich 12 miesięcy) na początku
  const accountUsage = useMemo(() => {
    const u = {}
    allYearTx.forEach(t => { if (t.accountId) u[t.accountId] = (u[t.accountId] || 0) + 1 })
    return u
  }, [allYearTx])
  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => (accountUsage[b.id] || 0) - (accountUsage[a.id] || 0)),
    [accounts, accountUsage]
  )

  const goBack = () => setPivot(p => shiftPivot(period, p, -1))
  const goFwd  = () => setPivot(p => shiftPivot(period, p, +1))

  // Przelewy między kontami nie są przychodem/wydatkiem — pomijamy w wykresach
  const base = transactions.filter(t => !isTransfer(t))
  const filtered = accountFilter === 'all' ? base : base.filter(t => t.accountId === accountFilter)
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

      {/* Account filter — najczęściej używane na początku, reszta pod „więcej" */}
      {accounts.length > 0 && (() => {
        const top = sortedAccounts.slice(0, 4)
        const visible = showAllAcc
          ? sortedAccounts
          : (accountFilter !== 'all' && !top.some(a => a.id === accountFilter)
              ? [...top, sortedAccounts.find(a => a.id === accountFilter)].filter(Boolean)
              : top)
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`account-chip ${accountFilter === 'all' ? 'active' : ''}`}
              onClick={() => setAccountFilter('all')}>
              Wszystkie
            </button>
            {visible.map(a => (
              <button key={a.id}
                className={`account-chip ${accountFilter === a.id ? 'active' : ''}`}
                style={accountFilter === a.id ? { borderColor: a.color, background: a.color + '22' } : {}}
                onClick={() => setAccountFilter(a.id)}>
                {a.name}
              </button>
            ))}
            {sortedAccounts.length > 4 && (
              <button className="account-chip" onClick={() => setShowAllAcc(v => !v)}>
                {showAllAcc ? '− mniej' : `+${sortedAccounts.length - 4} więcej`}
              </button>
            )}
          </div>
        )
      })()}

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
          <p style={{ marginBottom: 8, opacity: 0.4 }}><IconChart size={32} /></p>
          <p>Brak transakcji w tym okresie</p>
        </div>
      ) : (
        <>
          {tab === 'general' && (
            <GeneralTab
              expenses={expenses} incomes={incomes}
              totalExp={totalExp} totalInc={totalInc} balance={balance}
              period={period} pivot={pivot} allTx={filtered}
              yearTx={(accountFilter === 'all' ? allYearTx : allYearTx.filter(t => t.accountId === accountFilter)).filter(t => !isTransfer(t))}
              privateMode={privateMode}
            />
          )}
          {tab === 'expense' && (
            <CategoryTab
              transactions={expenses} total={totalExp}
              chartType={chartType} label="Wydatki" catColorMap={catColorMap}
              accentColor="var(--expense)"
              privateMode={privateMode}
            />
          )}
          {tab === 'income' && (
            <CategoryTab
              transactions={incomes} total={totalInc}
              chartType={chartType} label="Dochody" catColorMap={catColorMap}
              accentColor="var(--income)"
              privateMode={privateMode}
              key="income"
            />
          )}
        </>
      )}
    </div>
  )
}

/* ─── General Tab ─── */
function GeneralTab({ expenses, incomes, totalExp, totalInc, balance, period, pivot, allTx, yearTx = [], privateMode = false }) {
  const savingsRate = totalInc > 0 ? Math.round((balance / totalInc) * 100) : null
  const on = useMounted(80)

  // Always show last 12 months (monthly buckets) — more informative than day-by-day
  const monthly12 = build12MonthTimeline(yearTx.length > 0 ? yearTx : allTx)
  const incomeData  = monthly12.map(d => ({ label: d.label, value: d.income }))
  const expenseData = monthly12.map(d => ({ label: d.label, value: d.expense }))
  const balanceData = monthly12.map(d => ({ label: d.label, value: d.income - d.expense }))
  const hasTimeline = monthly12.some(d => d.income > 0 || d.expense > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Balance hero card */}
      <div className="card card-pad" style={{ overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: balance >= 0
            ? 'radial-gradient(ellipse at top right, rgba(95,191,152,0.08) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at top right, rgba(224,103,62,0.08) 0%, transparent 60%)',
        }} />

        <p style={{ margin: '0 0 4px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Bilans okresu
        </p>
        <p style={{
          margin: '0 0 16px', fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em',
          color: balance >= 0 ? 'var(--income)' : 'var(--expense)', lineHeight: 1.1,
        }}>
          {privateMode ? '••' : `${balance >= 0 ? '+' : '−'}${fmt(Math.abs(balance))}`}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 0, alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Przychody</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--income)' }}>{privateMode ? '••' : `+${fmt(totalInc)}`}</p>
          </div>
          <div style={{ width: 1, height: 32, background: 'var(--border)', justifySelf: 'center' }} />
          <div style={{ paddingLeft: 16 }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Wydatki</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--expense)' }}>{privateMode ? '••' : `−${fmt(totalExp)}`}</p>
          </div>
        </div>

        {savingsRate !== null && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: on ? `${Math.min(100, Math.max(0, savingsRate))}%` : '0%',
                background: savingsRate >= 0 ? 'var(--income)' : 'var(--expense)',
                borderRadius: 99,
                transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right' }}>
              {savingsRate >= 0 ? 'oszczędności' : 'na minusie'} {Math.abs(savingsRate)}%
            </span>
          </div>
        )}
      </div>

      {/* Flow bar — przychody vs wydatki */}
      {(totalInc > 0 || totalExp > 0) && (
        <div className="card card-pad">
          <p style={{ margin: '0 0 12px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Przepływy
          </p>
          <FlowBar segments={[
            ...(totalInc > 0 ? [{ label: 'Przychody', value: totalInc, color: 'var(--income)' }] : []),
            ...(totalExp > 0 ? [{ label: 'Wydatki', value: totalExp, color: 'var(--expense)' }] : []),
          ]} height={12} />
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            {[['var(--income)','Przychody', privateMode ? '••' : fmt(totalInc)],['var(--expense)','Wydatki', privateMode ? '••' : fmt(totalExp)]].map(([color, lbl, val]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lbl}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bilans miesięczny — dodatni niebieski w górę, ujemny czerwony w dół */}
      {hasTimeline && (
        <div className="card card-pad" style={{ overflow: 'hidden' }}>
          <p style={{ margin: '0 0 16px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Bilans miesięczny · ostatnie 12 miesięcy
          </p>
          <BalanceBars data={balanceData} privateMode={privateMode} />
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {[['var(--info)','Nadwyżka (na plus)'],['var(--expense)','Deficyt (na minus)']].map(([color, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline chart */}
      {hasTimeline && (
        <div className="card card-pad" style={{ overflow: 'hidden' }}>
          <p style={{ margin: '0 0 16px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Trendy · ostatnie 12 miesięcy
          </p>
          <div className="g2">
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: '0 0 8px', fontSize: 9, color: 'var(--income)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Przychody</p>
              <BarChartSVG data={incomeData} height={110} accent="var(--income)" fmt={privateMode ? () => '••' : fmt} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: '0 0 8px', fontSize: 9, color: 'var(--expense)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Wydatki</p>
              <BarChartSVG data={expenseData} height={110} accent="var(--expense)" fmt={privateMode ? () => '••' : fmt} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Bilans miesięczny (rozbieżne słupki) ─── */
function BalanceBars({ data, privateMode = false }) {
  const [hover, setHover] = useState(null)
  const on = useMounted(80)
  const maxAbs = Math.max(1, ...data.map(d => Math.abs(d.value)))
  const H = 64 // wysokość połowy (góra/dół)
  const shortMoney = (n) => {
    const a = Math.abs(n)
    if (a >= 1000) return (n / 1000).toFixed(a >= 10000 ? 0 : 1).replace('.', ',') + 'k'
    return Math.round(n).toString()
  }
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
      {data.map((d, i) => {
        const pos = d.value >= 0
        const h = Math.round((Math.abs(d.value) / maxAbs) * H)
        const color = pos ? 'var(--info)' : 'var(--expense)'
        const showLabel = hover === i || (hover === null && Math.abs(d.value) === maxAbs)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {/* górna połowa (dodatnie w górę) */}
            <div style={{ height: H, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
              {showLabel && pos && d.value !== 0 && !privateMode && (
                <span style={{ fontSize: 8, fontWeight: 700, color, marginBottom: 2, whiteSpace: 'nowrap' }}>{shortMoney(d.value)}</span>
              )}
              {pos && (
                <div style={{ width: '72%', height: on ? h : 0, background: color, borderRadius: '4px 4px 0 0', transition: `height .6s cubic-bezier(.4,0,.2,1) ${i * .03}s`, opacity: hover === null || hover === i ? 1 : 0.5 }} />
              )}
            </div>
            <div style={{ height: 1, background: 'var(--border-strong)', width: '100%' }} />
            {/* dolna połowa (ujemne w dół) */}
            <div style={{ height: H, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {!pos && d.value !== 0 && (
                <div style={{ width: '72%', height: on ? h : 0, background: color, borderRadius: '0 0 4px 4px', transition: `height .6s cubic-bezier(.4,0,.2,1) ${i * .03}s`, opacity: hover === null || hover === i ? 1 : 0.5 }} />
              )}
              {showLabel && !pos && d.value !== 0 && !privateMode && (
                <span style={{ fontSize: 8, fontWeight: 700, color, marginTop: 2, whiteSpace: 'nowrap' }}>{shortMoney(d.value)}</span>
              )}
            </div>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 4, textTransform: 'capitalize' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Category Tab ─── */
function CategoryTab({ transactions, total, chartType, label, catColorMap = {}, accentColor, privateMode = false }) {
  const [drillDown, setDrillDown] = useState(null)

  const hasSubcatSet = new Set()
  transactions.forEach(t => { if (t.subcategoryId) hasSubcatSet.add(t.categoryId) })

  const byCat = {}
  transactions.forEach(t => {
    const key = t.categoryId || t.category || 'Inne'
    if (!byCat[key]) byCat[key] = { name: t.category || 'Inne', icon: t.categoryIcon || 'IconMore', categoryId: t.categoryId, value: 0 }
    byCat[key].value += t.amount
  })
  const data = Object.values(byCat).sort((a, b) => b.value - a.value)
  data.forEach((item, i) => {
    item.chartColor = catColorMap[item.categoryId] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
  })

  // Pre-compute subcategory breakdown for hover display
  const subcatMap = {}
  transactions.forEach(t => {
    if (!t.subcategoryId) return
    const cid = t.categoryId || 'Inne'
    if (!subcatMap[cid]) subcatMap[cid] = {}
    if (!subcatMap[cid][t.subcategoryId]) subcatMap[cid][t.subcategoryId] = { name: t.subcategoryLabel || 'Ogólne', value: 0 }
    subcatMap[cid][t.subcategoryId].value += t.amount
  })
  data.forEach(item => {
    const sc = subcatMap[item.categoryId]
    if (sc) item.subcats = Object.values(sc).sort((a, b) => b.value - a.value)
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
          <DonutChart data={subData} colors={subColors} total={subTotal} privateMode={privateMode} />
        ) : (
          <ProgressList data={subData} total={subTotal} colors={subColors} privateMode={privateMode} />
        )}
      </div>
    )
  }

  if (!data.length) return (
    <div className="charts-empty">
      <p style={{ marginBottom: 8, opacity: 0.4 }}><IconChart size={32} /></p>
      <p>Brak {label.toLowerCase()}</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {chartType === 'pie' ? (
        <DonutChart data={data} colors={data.map(d => d.chartColor)} total={total} privateMode={privateMode} />
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
          privateMode={privateMode}
        />
      )}
    </div>
  )
}

/* ─── Progress bar list ─── */
function ProgressList({ data, total, colors, onItemClick, hasSubcat, renderIcon, privateMode = false }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const maxVal = data[0]?.value || 1
  const on = useMounted(100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((item, i) => {
        const pct    = total > 0 ? (item.value / total * 100) : 0
        const relPct = (item.value / maxVal) * 100
        const color  = colors[i]
        const clickable = hasSubcat?.has(item.categoryId)
        const isHovered = hoveredIdx === i

        return (
          <div
            key={item.name}
            onClick={() => onItemClick?.(item)}
            style={{
              background: isHovered && clickable ? 'var(--surface2)' : 'var(--surface)',
              border: `1px solid ${isHovered && clickable ? color : 'var(--border)'}`,
              borderRadius: 14, padding: '12px 14px',
              cursor: clickable ? 'pointer' : 'default',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                {renderIcon ? renderIcon(item) : <span style={{ fontSize: 14 }}>{item.name[0]}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{privateMode ? '••' : fmt(item.value)}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</p>
              </div>
              {clickable && <span style={{ fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }}>›</span>}
            </div>
            <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: on ? relPct + '%' : '0%', background: color, borderRadius: 99,
                transition: `width .8s cubic-bezier(.4,0,.2,1) ${i * .05}s`,
              }} />
            </div>

            {/* Subcategory breakdown on hover */}
            {isHovered && item.subcats?.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {item.subcats.slice(0, 6).map(sc => {
                  const scPct = item.value > 0 ? (sc.value / item.value * 100) : 0
                  return (
                    <div key={sc.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, opacity: 0.5, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>{sc.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>{scPct.toFixed(0)}%</span>
                      {!privateMode && <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, minWidth: 60, textAlign: 'right' }}>{fmt(sc.value)}</span>}
                    </div>
                  )
                })}
                {item.subcats.length > 6 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 13 }}>+{item.subcats.length - 6} więcej →</span>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Total row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 12, marginTop: 2 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Łącznie</span>
        <span style={{ fontSize: 17, fontWeight: 800 }}>{privateMode ? '••' : fmt(total)}</span>
      </div>
    </div>
  )
}

/* ─── Donut chart z SVG (zastępuje recharts PieChart) ─── */
function DonutChart({ data, colors, total, privateMode = false }) {
  const [active, setActive] = useState(null)
  const on = useMounted(120)

  const size = typeof window !== 'undefined' && window.innerWidth < 480 ? 180 : 220
  const thickness = 28
  const r = (size - thickness) / 2 - 2
  const C = 2 * Math.PI * r
  const gap = 0.015

  let acc = 0
  const segs = data.map((d, i) => {
    const frac = d.value / total
    const len = Math.max(0, frac * C - gap * C)
    const seg = { ...d, i, offset: -(acc * C), len, dash: `${len} ${C - len}`, frac }
    acc += frac
    return seg
  })

  const displayItem = active != null ? data[active] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface3)" strokeWidth={thickness} opacity={.4}/>
          {segs.map(s => (
            <circle key={s.i} cx={size/2} cy={size/2} r={r} fill="none"
              stroke={colors[s.i]}
              strokeWidth={active === s.i ? thickness + 4 : thickness}
              strokeLinecap="butt"
              strokeDasharray={on ? s.dash : `0 ${C}`}
              strokeDashoffset={s.offset}
              opacity={active == null || active === s.i ? 1 : 0.4}
              onMouseEnter={() => setActive(s.i)}
              onMouseLeave={() => setActive(null)}
              style={{ transition: `stroke-dasharray .9s cubic-bezier(.4,0,.2,1) ${s.i * .07}s, stroke-width .2s, opacity .2s`, cursor: 'pointer' }}
            />
          ))}
        </svg>

        {/* Center label */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          {displayItem ? (
            <>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{displayItem.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: colors[active] }}>{privateMode ? '••' : fmt(displayItem.value)}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{total > 0 ? (displayItem.value / total * 100).toFixed(1) : 0}%</p>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Łącznie</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800 }}>{privateMode ? '••' : fmt(total)}</p>
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
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 8, background: active === i ? 'var(--surface2)' : 'transparent', transition: 'background 0.15s', cursor: 'pointer' }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i], flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{privateMode ? '••' : fmt(item.value)}</span>
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

function build12MonthTimeline(transactions) {
  const months = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date(),
  })
  return months.map(m => {
    const mStr = format(m, 'yyyy-MM')
    const txs = transactions.filter(t => format(t.date, 'yyyy-MM') === mStr)
    return {
      label: format(m, 'MMM', { locale: pl }),
      income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  })
}

function buildTimeline(period, pivot, transactions) {
  const bounds = getBounds(period, pivot)
  const map    = {}

  if (period === 'day') {
    for (let h = 0; h < 24; h += 2) {
      const lbl = `${h}`
      map[lbl] = { label: lbl, income: 0, expense: 0 }
    }
    transactions.forEach(t => {
      const h = t.date.getHours()
      const key = `${h - (h % 2)}`
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
