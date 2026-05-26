const fmt = (n) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n)

export default function Summary({ income, expenses, balance }) {
  return (
    <div className="summary-grid">
      <div className="summary-card income">
        <span className="summary-label">Przychody</span>
        <span className="summary-amount">+{fmt(income)}</span>
      </div>
      <div className="summary-card expenses">
        <span className="summary-label">Wydatki</span>
        <span className="summary-amount">-{fmt(expenses)}</span>
      </div>
      <div className={`summary-card balance ${balance >= 0 ? 'positive' : 'negative'}`}>
        <span className="summary-label">Saldo</span>
        <span className="summary-amount">{balance >= 0 ? '+' : ''}{fmt(balance)}</span>
      </div>
    </div>
  )
}
