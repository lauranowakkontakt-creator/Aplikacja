import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
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

const TABS = [
  { id: 'transactions', label: 'Transakcje', icon: '↕️' },
  { id: 'accounts',     label: 'Konta',       icon: '🏦' },
  { id: 'charts',       label: 'Wykresy',      icon: '📊' },
  { id: 'regular',      label: 'Regularne',    icon: '🔄' },
]

export default function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editTransaction, setEditTransaction] = useState(null)
  const [activeTab, setActiveTab] = useState('transactions')
  const [loading, setLoading] = useState(true)
  const [privateMode, setPrivateMode] = useState(false)
  const [modal, setModal] = useState(null) // 'transfer' | 'search' | 'tithe' | null

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('date', '>=', Timestamp.fromDate(monthStart)),
      where('date', '<=', Timestamp.fromDate(monthEnd)),
      orderBy('date', 'desc')
    )
    return onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })))
      setLoading(false)
    })
  }, [user.uid, currentMonth])

  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance  = income - expenses
  const monthLabel = format(currentMonth, 'LLLL yyyy', { locale: pl })

  const handleMenuAction = (id) => {
    if (id === 'private')   return setPrivateMode(m => !m)
    if (id === 'transfer')  return setModal('transfer')
    if (id === 'search')    return setModal('search')
    if (id === 'tithe')     return setModal('tithe')
    if (id === 'goals')     return setModal('goals')
    if (id === 'stats')     return setModal('stats')
    if (id === 'reminders') return setModal('reminders')
  }

  return (
    <div className="dashboard">
      {/* Pasek zakładek + menu */}
      <div className="budget-header-row">
        <div className="budget-tabs">
          {TABS.map(t => (
            <button key={t.id}
              className={`budget-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="budget-tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <BudgetMenu onAction={handleMenuAction} privateMode={privateMode} />
      </div>

      {/* Nawigacja miesiąca */}
      {(activeTab === 'transactions' || activeTab === 'charts') && (
        <div className="month-nav">
          <button className="month-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>‹</button>
          <h2 className="month-label">{monthLabel}</h2>
          <button className="month-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>›</button>
        </div>
      )}

      {/* Zawartość */}
      {activeTab === 'transactions' && (
        <>
          <Summary income={income} expenses={expenses} balance={balance} privateMode={privateMode} />
          <TransactionList
            transactions={transactions}
            loading={loading}
            onEdit={(t) => { setEditTransaction(t); setShowForm(true) }}
            user={user}
            privateMode={privateMode}
          />
        </>
      )}
      {activeTab === 'accounts' && <AccountsView user={user} privateMode={privateMode} />}
      {activeTab === 'charts'   && <Charts user={user} />}
      {activeTab === 'regular'  && <RegularPayments user={user} />}

      {/* Przycisk + */}
      {activeTab === 'transactions' && (
        <button className="btn-add" onClick={() => setShowForm(true)}>+</button>
      )}

      {/* Modale z menu */}
      {modal === 'transfer'  && <TransferForm user={user} onClose={() => setModal(null)} />}
      {modal === 'search'    && <SearchPanel  user={user} onClose={() => setModal(null)} />}
      {modal === 'tithe'     && <TitheView   user={user} onClose={() => setModal(null)} />}
      {modal === 'goals'     && <SavingsGoals user={user} onClose={() => setModal(null)} />}
      {modal === 'reminders' && <Reminders   user={user} onClose={() => setModal(null)} />}
      {modal === 'stats'     && <ComingSoon title="📊 Statystyki roczne" onClose={() => setModal(null)} />}

      {/* Formularz transakcji */}
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
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '32px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>🚧</p>
          <p>Ta funkcja jest w przygotowaniu.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Dodamy ją wkrótce!</p>
        </div>
      </div>
    </div>
  )
}
