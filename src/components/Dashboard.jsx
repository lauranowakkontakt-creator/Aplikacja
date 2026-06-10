import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import TransactionForm from './TransactionForm'
import TransactionList from './TransactionList'
import Charts from './Charts'
import Summary from './Summary'
import AccountsView from './budget/AccountsView'
import RegularPayments from './budget/RegularPayments'
import BudgetMenu from './budget/BudgetMenu'
import TransferForm from './budget/TransferForm'
import SearchPanel from './budget/SearchPanel'
import TitheView from './budget/TitheView'
import SavingsGoals from './budget/SavingsGoals'
import Reminders from './budget/Reminders'
import CategoriesView from './budget/CategoriesView'
import ShoppingList from './budget/ShoppingList'
import { IconClose, IconTransfer, IconBank, IconChart, IconStar, IconShopping, IconPlus, IconChevronLeft, IconChevronRight, IconSearch, IconMore, IconSavings, IconArrowUp, IconArrowDown, IconCash, IconCard, IconFlame, CatIcon } from './Icons'
import { Donut, FlowBar, BarChartSVG, Spark } from './ChartPrimitives'

const TABS = [
  { id: 'overview',     label: 'Przegląd',   Icon: IconChart },
  { id: 'transactions', label: 'Transakcje',  Icon: IconTransfer },
  { id: 'accounts',     label: 'Konta',       Icon: IconBank },
  { id: 'charts',       label: 'Wykresy',     Icon: IconChart },
  { id: 'regular',      label: 'Regularne',   Icon: IconStar },
  { id: 'shopping',     label: 'Zakupy',      Icon: IconShopping },
]

const kicker = (t) => (
  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 10 }}>{t}</div>
)

export default function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts]         = useState([])
  const [allTransactions, setAllTransactions] = useState([]) // for charts (last 6 months)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editTransaction, setEditTransaction] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [privateMode, setPrivateMode] = useState(() => {
    try { return localStorage.getItem('mw_privateMode') === 'true' } catch { return false }
  })
  const [modal, setModal] = useState(null)
  const [donutHover, setDonutHover] = useState(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'accounts'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user.uid])

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('date', '>=', Timestamp.fromDate(monthStart)),
      where('date', '<=', Timestamp.fromDate(monthEnd)),
      orderBy('date', 'desc')
    )
    return onSnapshot(q, snap => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() }))
      txs.sort((a, b) => {
        const at = a.createdAt?.toMillis() ?? a.date?.getTime() ?? 0
        const bt = b.createdAt?.toMillis() ?? b.date?.getTime() ?? 0
        return bt - at
      })
      setTransactions(txs)
      setLoading(false)
    })
  }, [user.uid, currentMonth])

  // Load last 6 months for bar chart
  useEffect(() => {
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5))
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('date', '>=', Timestamp.fromDate(sixMonthsAgo)),
      orderBy('date', 'desc')
    )
    return onSnapshot(q, snap => {
      setAllTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })))
    })
  }, [user.uid])

  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance  = income - expenses

  const excludedFromTotal = (() => {
    try { const s = localStorage.getItem(`excludedAccounts_${user.uid}`); return s ? JSON.parse(s) : [] } catch { return [] }
  })()
  const includedAccounts = accounts.filter(a => !excludedFromTotal.includes(a.id))
  const totalsByCurrency = includedAccounts.reduce((acc, a) => {
    const cur = a.currency || 'PLN'
    acc[cur] = (acc[cur] || 0) + (a.balance || 0)
    return acc
  }, {})
  const totalPLN = totalsByCurrency['PLN'] || 0

  const monthLabel = format(currentMonth, 'LLLL yyyy', { locale: pl })

  const handleMenuAction = (id) => {
    if (id === 'private') {
      setPrivateMode(m => { const n=!m; try { localStorage.setItem('mw_privateMode', n) } catch {} return n })
      return
    }
    if (id === 'transfer')   return setModal('transfer')
    if (id === 'search')     return setModal('search')
    if (id === 'tithe')      return setModal('tithe')
    if (id === 'goals')      return setModal('goals')
    if (id === 'reminders')  return setModal('reminders')
    if (id === 'categories') return setModal('categories')
  }

  const fmtAcc = (n, currency = 'PLN') =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(n)

  const fmtHero = (n) => {
    const abs = Math.abs(n)
    const parts = abs.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(',')
    return { int: (n >= 0 ? '+' : '−') + parts[0], dec: ',' + (parts[1] ?? '00') }
  }

  const fmtShort = (n) => {
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k'
    return n.toFixed(0)
  }

  // Build donut data from expense categories
  const categoryMap = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category || 'Inne'
    categoryMap[cat] = (categoryMap[cat] || 0) + t.amount
  })
  const donutColors = ['#E0673E','#7C8AF0','#5FBF98','#E0B15A','#5BB6D9','#9B7CF0','#EC4899','#14B8A6']
  const donutData = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], i) => ({ name, value, color: donutColors[i % donutColors.length] }))

  // Bar chart: last 6 months expenses
  const barData = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(new Date(), 5 - i)
    const mStr = format(m, 'yyyy-MM')
    const mExpenses = allTransactions
      .filter(t => t.type === 'expense' && format(t.date, 'yyyy-MM') === mStr)
      .reduce((s, t) => s + t.amount, 0)
    return {
      label: format(m, 'MMM', { locale: pl }),
      value: mExpenses,
      active: i === 5
    }
  })

  // Real daily expense spark — last 14 days
  const sparkData = Array.from({ length: 14 }, (_, i) => {
    const target = new Date()
    target.setDate(target.getDate() - (13 - i))
    const dayStr = format(target, 'yyyy-MM-dd')
    return allTransactions
      .filter(t => t.type === 'expense' && format(t.date instanceof Date ? t.date : new Date(t.date), 'yyyy-MM-dd') === dayStr)
      .reduce((s, t) => s + t.amount, 0)
  })

  // Prev month comparison
  const prevMonthStart = startOfMonth(subMonths(currentMonth, 1))
  const prevMonthEnd   = endOfMonth(subMonths(currentMonth, 1))
  const prevExpenses = allTransactions
    .filter(t => {
      const tDate = t.date instanceof Date ? t.date : t.date?.toDate?.() || new Date(t.date)
      return t.type === 'expense' && tDate >= prevMonthStart && tDate <= prevMonthEnd
    })
    .reduce((s, t) => s + t.amount, 0)
  const expenseTrend = prevExpenses > 0
    ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100)
    : null

  // Avg daily spend
  const daysInMonth = Math.max(1, new Date().getDate())
  const avgDaily = expenses / daysInMonth

  return (
    <div className="dashboard">
      {/* Mobile module header */}
      <div className="mod-header">
        <div>
          <div className="mod-header-kicker">Budżet</div>
          <div className="mod-header-title" style={{ textTransform: 'capitalize' }}>{monthLabel}</div>
        </div>
        <div className="mod-header-right">
          <button className="icon-btn" onClick={() => handleMenuAction('search')}><IconSearch size={16} /></button>
          <BudgetMenu onAction={handleMenuAction} privateMode={privateMode} mobile />
        </div>
      </div>

      {/* Month range row — mobile */}
      {(activeTab === 'transactions' || activeTab === 'overview') && (
        <div className="month-range-row mobile-only">
          <button className="icon-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><IconChevronLeft size={16} /></button>
          <span className="month-range-label">
            {format(monthStart, 'd', { locale: pl })} — {format(monthEnd, 'd LLLL', { locale: pl }).toUpperCase()}
          </span>
          <button className="icon-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><IconChevronRight size={16} /></button>
        </div>
      )}

      {/* Tabs + menu */}
      <div className="budget-header-row">
        <div className="budget-tabs" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.id}
              className={`budget-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="desktop-only"><t.Icon size={14} /></span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <span className="desktop-only"><BudgetMenu onAction={handleMenuAction} privateMode={privateMode} /></span>
      </div>

      {/* Month navigation — desktop only */}
      {(activeTab === 'transactions' || activeTab === 'overview') && (
        <div className="month-nav desktop-only">
          <button className="month-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><IconChevronLeft size={16} /></button>
          <h2 className="month-label">{monthLabel}</h2>
          <button className="month-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><IconChevronRight size={16} /></button>
        </div>
      )}

      {/* ====== OVERVIEW TAB ====== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Row 1: Balance + Donut */}
          <div className="g2-11">

            {/* Left: Saldo */}
            <div className="card-hover-glow" style={{ background: 'linear-gradient(140deg,var(--surface) 40%,color-mix(in oklab,var(--expense) 5%,var(--surface)) 100%)', border: '1px solid var(--border)', borderTop: `2px solid color-mix(in oklab,${totalPLN>=0?'var(--income)':'var(--expense)'} 80%,transparent)`, borderRadius: 'var(--r)', padding: 20, overflow: 'hidden' }}>
              {kicker('Saldo łączne')}
              {!privateMode ? (
                <>
                  <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: totalPLN >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {fmtHero(totalPLN).int}
                    <span style={{ fontSize: 18, fontWeight: 400, color: 'var(--text-muted)' }}>{fmtHero(totalPLN).dec} zł</span>
                  </div>
                  {expenseTrend !== null && (
                    <div style={{ fontSize: 11, color: expenseTrend > 0 ? 'var(--expense)' : 'var(--income)', marginTop: 6, fontWeight: 600 }}>
                      {expenseTrend > 0 ? '↑' : '↓'} {Math.abs(expenseTrend)}% vs poprzedni miesiąc
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-muted)' }}>••••</div>
              )}

              <div style={{ marginTop: 16 }}>
                {kicker('Wydatki / zostało')}
                <FlowBar segments={[
                  { value: expenses, color: 'var(--expense)', label: `Wydatki: ${fmtShort(expenses)} zł` },
                  { value: Math.max(0, income - expenses), color: 'var(--income)', label: `Zostało: ${fmtShort(Math.max(0, income - expenses))} zł` },
                ]} height={10} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--expense)' }}>Wydatki {!privateMode && fmtAcc(expenses)}</span>
                  <span style={{ fontSize: 11, color: 'var(--income)' }}>Przychody {!privateMode && fmtAcc(income)}</span>
                </div>
              </div>
            </div>

            {/* Right: Donut */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 20, display: 'flex', flexDirection: 'column' }}>
              {kicker('Wydatki wg kategorii')}
              {donutData.length > 0 ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Donut
                      data={donutData}
                      size={typeof window !== 'undefined' && window.innerWidth < 480 ? 120 : 140}
                      thickness={16}
                      centerTop={donutHover ? donutHover.name : 'razem'}
                      centerMain={!privateMode ? (donutHover ? fmtShort(donutHover.value) : fmtShort(expenses)) : '••'}
                      centerSub="zł"
                      onHover={setDonutHover}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                    {donutData.slice(0, 4).map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, flex: 1, color: 'var(--text-sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                        {!privateMode && <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{fmtShort(d.value)} zł</span>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Brak wydatków</div>
              )}
            </div>
          </div>

          {/* Row 2: Bar chart + mini metrics */}
          <div className="g2-b">

            {/* Left: Bar chart 6 months */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 20, overflow: 'hidden' }}>
              {kicker('Wydatki miesięczne')}
              <BarChartSVG
                data={barData}
                height={130}
                accent="var(--expense)"
                fmt={v => fmtAcc(v)}
              />
            </div>

            {/* Right: 2x2 mini metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { color: 'var(--warn)',    Icon: IconChart,    label: 'Śr. dzienne', val: !privateMode ? fmtShort(avgDaily) + ' zł' : '••', spark: null },
                { color: balance>=0?'var(--income)':'var(--expense)', Icon: IconSavings, label: 'Saldo m-ca', val: !privateMode ? fmtShort(balance) + ' zł' : '••', spark: null },
                { color: 'var(--income)', Icon: IconArrowUp,   label: 'Przychody',   val: !privateMode ? fmtShort(income) + ' zł' : '••', spark: sparkData.slice(0, 7), sparkColor: 'var(--income)' },
                { color: 'var(--expense)',Icon: IconArrowDown,  label: 'Wydatki',     val: !privateMode ? fmtShort(expenses) + ' zł' : '••', spark: sparkData.slice(0, 7), sparkColor: 'var(--expense)' },
              ].map((m, i) => (
                <div key={i} className="card-hover-glow" style={{
                  background: `linear-gradient(145deg, var(--surface) 50%, color-mix(in oklab, ${m.color} 6%, var(--surface)) 100%)`,
                  border: '1px solid var(--border)',
                  borderTop: `2px solid ${m.color}`,
                  borderRadius: 'var(--r)', padding: 14, overflow: 'hidden',
                }}>
                  <div style={{ color: m.color, marginBottom: 6 }}><m.Icon size={15}/></div>
                  {kicker(m.label)}
                  <div style={{ fontSize: 17, fontWeight: 700, color: m.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-.01em' }}>{m.val}</div>
                  {m.spark && <div style={{ marginTop: 6 }}><Spark data={m.spark} color={m.sparkColor} height={18} w={3} /></div>}
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Accounts + recent transactions */}
          <div className="g2-13">

            {/* Left: Accounts */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 20 }}>
              {kicker('Konta')}
              {accounts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Brak kont</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {accounts.slice(0, 5).map(a => {
                    const acColors = { bank: '#3b82f6', cash: '#22c55e', card: '#f59e0b', savings: '#8b5cf6', investment: '#14b8a6', revolut: '#6366f1' }
                    const color = acColors[a.type] || 'var(--primary)'
                    return (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 6px', borderRadius: 10, borderLeft: `3px solid ${color}55`, transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                          {a.type === 'cash' ? <IconCash size={17}/> : a.type === 'savings' ? <IconSavings size={17}/> : a.type === 'card' ? <IconCard size={17}/> : <IconBank size={17}/>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                          {a.bankName && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.bankName}</div>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: (a.balance || 0) >= 0 ? 'var(--income)' : 'var(--expense)', flexShrink: 0 }}>
                          {!privateMode ? fmtAcc(a.balance || 0, a.currency || 'PLN') : '••••'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right: Recent transactions */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 20 }}>
              {kicker('Ostatnie transakcje')}
              {transactions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Brak transakcji</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {transactions.slice(0, 6).map(t => {
                    const isExpense = t.type === 'expense'
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                          background: isExpense ? 'var(--expense)22' : 'var(--income)22',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isExpense ? 'var(--expense)' : 'var(--income)',
                        }}>
                          <CatIcon categoryId={t.categoryId} emoji={t.categoryIcon} size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description || t.category || 'Transakcja'}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {t.category} · {format(t.date, 'd MMM', { locale: pl })}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, flexShrink: 0, color: isExpense ? 'var(--expense)' : 'var(--income)' }}>
                          {!privateMode ? `${isExpense ? '−' : '+'}${fmtAcc(t.amount)}` : '••'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {transactions.length > 6 && (
                <button onClick={() => setActiveTab('transactions')} style={{
                  width: '100%', marginTop: 10, padding: '8px', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer',
                }}>
                  Pokaż wszystkie ({transactions.length}) →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <>
          {/* Balance hero — mobile */}
          {!privateMode && (
            <div className="balance-hero mobile-only">
              {accounts.length > 0 && (
                <>
                  <div className="balance-hero-label">Saldo kont</div>
                  {(() => {
                    const entries = Object.entries(totalsByCurrency)
                    const isOnlyPLN = entries.length === 0 || (entries.length === 1 && entries[0][0] === 'PLN')
                    const plnVal = totalsByCurrency['PLN'] || 0
                    if (isOnlyPLN) {
                      return (
                        <div className="balance-hero-amount">
                          <span className="balance-hero-main" style={{ color: plnVal >= 0 ? 'var(--income)' : 'var(--expense)' }}>{fmtHero(plnVal).int}</span>
                          <span className="balance-hero-cents" style={{ color: plnVal >= 0 ? 'var(--income)' : 'var(--expense)' }}>{fmtHero(plnVal).dec} zł</span>
                        </div>
                      )
                    }
                    return (
                      <div className="balance-hero-amount" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                        {entries.map(([cur, amount]) => (
                          <div key={cur} style={{ display: 'flex', alignItems: 'baseline' }}>
                            <span className="balance-hero-main" style={{ fontSize: '1.65rem', color: amount >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                              {fmtAcc(amount, cur)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                  <div style={{ paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saldo miesiąca</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                      {fmtHero(balance).int}{fmtHero(balance).dec} zł
                    </span>
                  </div>
                </>
              )}
              {accounts.length === 0 && (
                <>
                  <div className="balance-hero-label">Saldo miesiąca</div>
                  <div className="balance-hero-amount">
                    <span className="balance-hero-main" style={{ color: balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>{fmtHero(balance).int}</span>
                    <span className="balance-hero-cents" style={{ color: balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>{fmtHero(balance).dec} zł</span>
                  </div>
                </>
              )}
              <div className="balance-hero-row">
                <div className="balance-hero-stat">
                  <span className="balance-hero-stat-label">Przychody</span>
                  <span className="balance-hero-stat-value" style={{ color: 'var(--income)' }}>+{income.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł</span>
                </div>
                <div className="balance-hero-stat-sep" />
                <div className="balance-hero-stat">
                  <span className="balance-hero-stat-label">Wydatki</span>
                  <span className="balance-hero-stat-value" style={{ color: 'var(--expense)' }}>−{expenses.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł</span>
                </div>
              </div>
            </div>
          )}
          {/* Summary grid — desktop */}
          <div className="desktop-only">
            <Summary income={income} expenses={expenses} balance={balance} privateMode={privateMode}
              totalsByCurrency={totalsByCurrency} hasAccounts={includedAccounts.length > 0} />
          </div>
          <TransactionList
            transactions={transactions}
            loading={loading}
            onEdit={(t) => { setEditTransaction(t); setShowForm(true) }}
            user={user}
            privateMode={privateMode}
          />
        </>
      )}
      {activeTab === 'accounts'  && <AccountsView user={user} privateMode={privateMode} />}
      {activeTab === 'charts'    && <Charts user={user} />}
      {activeTab === 'regular'   && <RegularPayments user={user} />}
      {activeTab === 'shopping'  && <ShoppingList user={user} />}

      {(activeTab === 'transactions' || activeTab === 'overview') && (
        <button className="btn-add" onClick={() => setShowForm(true)}><IconPlus size={22} /></button>
      )}

      {modal === 'transfer'    && <TransferForm   user={user} onClose={() => setModal(null)} />}
      {modal === 'search'      && <SearchPanel    user={user} onClose={() => setModal(null)} />}
      {modal === 'tithe'       && <TitheView      user={user} onClose={() => setModal(null)} />}
      {modal === 'goals'       && <SavingsGoals   user={user} onClose={() => setModal(null)} />}
      {modal === 'reminders'   && <Reminders      user={user} onClose={() => setModal(null)} />}
      {modal === 'categories'  && <CategoriesView user={user} onClose={() => setModal(null)} />}
      {modal === 'stats'       && <ComingSoon title="📊 Statystyki roczne" onClose={() => setModal(null)} />}

      {showForm && (
        <TransactionForm
          user={user}
          onClose={() => { setShowForm(false); setEditTransaction(null) }}
          editData={editTransaction}
        />
      )}
    </div>
  )
}

function ComingSoon({ title, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ textAlign: 'center' }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><IconClose size={16} /></button>
        </div>
        <div style={{ padding: '32px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>🚧</p>
          <p>Ta funkcja jest w przygotowaniu.</p>
        </div>
      </div>
    </div>
  )
}
