import { useState } from 'react'

// Wspólny panel „w liczbach" z przełącznikiem Miesiąc / Rok.
// props: title, month: [{label, value, sub?, color?}], year: [...], note?
export default function StatSummary({ title = 'W liczbach', month = [], year = [], note }) {
  const [period, setPeriod] = useState('month')
  const data = period === 'month' ? month : year
  return (
    <div className="stat-summary">
      <div className="stat-summary-head">
        <span className="stat-summary-title">{title}</span>
        <div className="stat-summary-toggle">
          {[['month', 'Miesiąc'], ['year', 'Rok']].map(([id, label]) => (
            <button key={id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="stat-summary-grid">
        {data.map((s, i) => (
          <div key={i} className="stat-summary-tile">
            <div className="stat-summary-value" style={s.color ? { color: s.color } : undefined}>{s.value}</div>
            <div className="stat-summary-label">{s.label}</div>
            {s.sub && <div className="stat-summary-sub">{s.sub}</div>}
          </div>
        ))}
      </div>
      {note && <p className="stat-summary-note">{note}</p>}
    </div>
  )
}
