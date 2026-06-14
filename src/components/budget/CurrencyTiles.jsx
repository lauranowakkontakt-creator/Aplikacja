// Salda w różnych walutach jako osobne kafelki obok siebie (zamiast listy jeden pod drugim).
const fmtCur = (n, cur = 'PLN') =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: cur }).format(n)

export default function CurrencyTiles({ totals, privateMode, compact = false }) {
  const entries = Object.entries(totals || {})
  if (!entries.length) return null
  return (
    <div className={`currency-tiles${compact ? ' compact' : ''}`}>
      {entries.map(([cur, val]) => (
        <div key={cur} className="currency-tile">
          <span className="currency-tile-code">{cur}</span>
          <span className="currency-tile-amount" style={{ color: val >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {privateMode ? '••••' : fmtCur(val, cur)}
          </span>
        </div>
      ))}
    </div>
  )
}
