import { fmt } from '../utils/currency'
const hide = '••••'

export default function Summary({ income, expenses, balance, privateMode }) {
  const p = privateMode
  return (
    <div className="summary-grid">
      <div className="summary-card income">
        <span className="summary-label">Przychody</span>
        <span className="summary-amount">{p ? hide : `+${fmt(income)}`}</span>
      </div>
      <div className="summary-card expenses">
        <span className="summary-label">Wydatki</span>
        <span className="summary-amount">{p ? hide : `-${fmt(expenses)}`}</span>
      </div>
      <div className={`summary-card balance ${balance >= 0 ? 'positive' : 'negative'}`}>
        <span className="summary-label">Saldo</span>
        <span className="summary-amount">{p ? hide : `${balance >= 0 ? '+' : ''}${fmt(balance)}`}</span>
      </div>
    </div>
  )
}
