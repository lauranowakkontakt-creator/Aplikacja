import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { pl } from 'date-fns/locale'
import TransactionForm from './TransactionForm'
import TransactionList from './TransactionList'
import Charts from './Charts'
import Summary from './Summary'

const VIEWS = { OVERVIEW: 'overview', TRANSACTIONS: 'transactions', CHARTS: 'charts' }

export default function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editTransaction, setEditTransaction] = useState(null)
  const [activeView, setActiveView] = useState(VIEWS.OVERVIEW)
  const [loading, setLoading] = useState(true)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('date', '>=', Timestamp.fromDate(monthStart)),
      where('date', '<=', Timestamp.fromDate(monthEnd)),
      orderBy('date', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      }))
      setTransactions(data)
      setLoading(false)
    })

    return unsubscribe
  }, [user.uid, currentMonth])

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expenses

  const monthLabel = format(currentMonth, 'LLLL yyyy', { locale: pl })

  const handleEdit = (transaction) => {
    setEditTransaction(transaction)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditTransaction(null)
  }

  return (
    <div className="dashboard">
      {/* Nawigacja miesiąca */}
      <div className="month-nav">
        <button className="month-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>‹</button>
        <h2 className="month-label">{monthLabel}</h2>
        <button className="month-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>›</button>
      </div>

      {/* Podsumowanie */}
      <Summary income={income} expenses={expenses} balance={balance} />

      {/* Zakładki */}
      <div className="view-tabs">
        {Object.entries({ [VIEWS.OVERVIEW]: 'Przegląd', [VIEWS.TRANSACTIONS]: 'Transakcje', [VIEWS.CHARTS]: 'Wykresy' }).map(([key, label]) => (
          <button
            key={key}
            className={`tab-btn ${activeView === key ? 'active' : ''}`}
            onClick={() => setActiveView(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Zawartość */}
      <div className="view-content">
        {activeView === VIEWS.OVERVIEW && (
          <TransactionList
            transactions={transactions.slice(0, 5)}
            loading={loading}
            onEdit={handleEdit}
            user={user}
            compact
          />
        )}
        {activeView === VIEWS.TRANSACTIONS && (
          <TransactionList
            transactions={transactions}
            loading={loading}
            onEdit={handleEdit}
            user={user}
          />
        )}
        {activeView === VIEWS.CHARTS && (
          <Charts transactions={transactions} />
        )}
      </div>

      {/* Przycisk dodawania */}
      <button className="btn-add" onClick={() => setShowForm(true)}>+</button>

      {/* Modal formularza */}
      {showForm && (
        <TransactionForm
          user={user}
          onClose={handleCloseForm}
          editData={editTransaction}
        />
      )}
    </div>
  )
}
