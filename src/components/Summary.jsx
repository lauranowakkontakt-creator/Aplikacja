import { fmt } from '../utils/currency'
const hide = '••••'

const fmtCur = (n, cur = 'PLN') =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: cur }).format(n)

export default function Summary({ income, expenses, balance, privateMode, totalsByCurrency, hasAccounts }) {
  const p = privateMode
  const entries = Object.entries(totalsByCurrency || {})
  const totalPLN = totalsByCurrency?.PLN ?? 0

  return (
    <div className="summary-grid" style={{ gridTemplateColumns: hasAccounts ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' }}>
      {hasAccounts && (
        <div className={`summary-card balance ${totalPLN >= 0 ? 'positive' : 'negative'}`}>
          <span className="summary-label">Saldo kont</span>
          {p ? <span className="summary-amount">{hide}</span> : (
            entries.length <= 1
              ? <span className="summary-amount">{`${totalPLN >= 0 ? '+' : ''}${fmt(totalPLN)}`}</span>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {entries.map(([cur, val]) => (
                    <span key={cur} className="summary-amount" style={{ fontSize: '0.85em' }}>{`${val >= 0 ? '+' : ''}${fmtCur(val, cur)}`}</span>
                  ))}
                </div>
          )}
        </div>
      )}
      <div className="summary-card income">
        <span className="summary-label">Przychody</span>
        <span className="summary-amount">{p ? hide : `+${fmt(income)}`}</span>
      </div>
      <div className="summary-card expenses">
        <span className="summary-label">Wydatki</span>
        <span className="summary-amount">{p ? hide : `-${fmt(expenses)}`}</span>
      </div>
      <div className={`summary-card balance ${balance >= 0 ? 'positive' : 'negative'}`}>
        <span className="summary-label">Saldo miesiąca</span>
        <span className="summary-amount">{p ? hide : `${balance >= 0 ? '+' : ''}${fmt(balance)}`}</span>
      </div>
    </div>
  )
}
