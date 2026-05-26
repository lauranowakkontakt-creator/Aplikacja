import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4']

const fmt = (n) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n)

export default function Charts({ transactions }) {
  const expenses = transactions.filter(t => t.type === 'expense')
  const incomes = transactions.filter(t => t.type === 'income')

  // Wydatki wg kategorii (pie chart)
  const expenseByCategory = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {})
  const pieData = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Przychody wg kategorii (bar chart)
  const incomeByCategory = incomes.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {})
  const barData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }))

  if (transactions.length === 0) {
    return (
      <div className="charts-empty">
        <p>Brak danych do wyświetlenia</p>
        <p className="list-empty-hint">Dodaj transakcje aby zobaczyć wykresy</p>
      </div>
    )
  }

  return (
    <div className="charts">
      {pieData.length > 0 && (
        <div className="chart-section">
          <h3 className="chart-title">Wydatki wg kategorii</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend formatter={(v) => v} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {barData.length > 0 && (
        <div className="chart-section">
          <h3 className="chart-title">Przychody wg kategorii</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v} zł`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
