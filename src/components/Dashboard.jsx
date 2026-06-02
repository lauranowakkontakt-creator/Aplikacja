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
import { IconClose, IconTransfer, IconBank, IconChart, IconStar, IconShopping, IconPlus, IconChevronLeft, IconChevronRight, IconSearch, IconMore } from './Icons'

const TABS = [
  { id: 'transactions', label: 'Transakcje', Icon: IconTransfer },
  { id: 'accounts',     label: 'Konta',       Icon: IconBank },
  { id: 'charts',       label: 'Wykresy',      Icon: IconChart },
  { id: 'regular',      label: 'Regularne',    Icon: IconStar },
  { id: 'shopping',     label: 'Zakupy',       Icon: IconShopping },
]

export default function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts]         = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editTransaction, setEditTransaction] = useState(null)
  const [activeTab, setActiveTab] = useState('transactions')
  const [loading, setLoading] = useState(true)
  const [privateMode, setPrivateMode] = useState(false)
  const [modal, setModal] = useState(null)

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
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })))
      setLoading(false)
    })
  }, [user.uid, currentMonth])

  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance  = income - expenses
  const [visibleAccounts, setVisibleAccounts] = useState(null) // null = all
  const shownAccounts = visibleAccounts === null ? accounts : accounts.filter(a => visibleAccounts.includes(a.id))
  const totalAccountBalance = shownAccounts.reduce((s, a) => s + (a.balance || 0), 0)

  const toggleAccountVisible = (id) => {
    if (visibleAccounts === null) {
      setVisibleAccounts(accounts.map(a => a.id).filter(aid => aid !== id))
    } else if (visibleAccounts.includes(id)) {
      const next = visibleAccounts.filter(aid => aid !== id)
      setVisibleAccounts(next.length === accounts.length ? null : next.length === 0 ? accounts.map(a => a.id) : next)
    } else {
      const next = [...visibleAccounts, id]
      setVisibleAccounts(next.length === accounts.length ? null : next)
    }
  }
  const monthLabel = format(currentMonth, 'LLLL yyyy', { locale: pl })

  const handleMenuAction = (id) => {
    if (id === 'private')    return setPrivateMode(m => !m)
    if (id === 'transfer')   return setModal('transfer')
    if (id === 'search')     return setModal('search')
    if (id === 'tithe')      return setModal('tithe')
    if (id === 'goals')      return setModal('goals')
    if (id === 'reminders')  return setModal('reminders')
    if (id === 'categories') return setModal('categories')
  }

  const fmtHero = (n) => {
    const abs = Math.abs(n)
    const parts = abs.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(',')
    return { int: (n >= 0 ? '+' : '−') + parts[0], dec: ',' + (parts[1] ?? '00') }
  }

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
      {activeTab === 'transactions' && (
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
      {activeTab === 'transactions' && (
        <div className="month-nav desktop-only">
          <button className="month-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><IconChevronLeft size={16} /></button>
          <h2 className="month-label">{monthLabel}</h2>
          <button className="month-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><IconChevronRight size={16} /></button>
        </div>
      )}

      {activeTab === 'transactions' && (
        <>
          {/* Balance hero — mobile */}
          {!privateMode && (
            <div className="balance-hero mobile-only">
              {/* Big hero: total account balance */}
              {accounts.length > 0 && (
                <>
                  <div className="balance-hero-label">Saldo kont</div>
                  <div className="balance-hero-amount">
                    <span className="balance-hero-main" style={{ color: totalAccountBalance >= 0 ? 'var(--income)' : 'var(--expense)' }}>{fmtHero(totalAccountBalance).int}</span>
                    <span className="balance-hero-cents" style={{ color: totalAccountBalance >= 0 ? 'var(--income)' : 'var(--expense)' }}>{fmtHero(totalAccountBalance).dec} zł</span>
                  </div>
                  {/* Account chips filter */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '6px 0 10px' }}>
                    {accounts.map(a => {
                      const active = visibleAccounts === null || visibleAccounts.includes(a.id)
                      return (
                        <button key={a.id} onClick={() => toggleAccountVisible(a.id)} style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 99, cursor: 'pointer', fontWeight: 600, border: `1px solid ${a.color}`,
                          background: active ? a.color + '33' : 'transparent', color: active ? a.color : 'var(--text-muted)', opacity: active ? 1 : 0.5
                        }}>{a.name}</button>
                      )
                    })}
                  </div>
                  <div style={{ paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saldo miesiąca</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                      {fmtHero(balance).int}{fmtHero(balance).dec} zł
                    </span>
                  </div>
                </>
              )}
              {/* If no accounts, show monthly balance as hero */}
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
            <Summary income={income} expenses={expenses} balance={balance} privateMode={privateMode} />
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

      {activeTab === 'transactions' && (
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
