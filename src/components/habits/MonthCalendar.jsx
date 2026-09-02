import { ymd } from '../../utils/habitStats'
import { addDays, format, getDaysInMonth, startOfMonth } from 'date-fns'

// Kalendarz miesiąca wyrównany do poniedziałku. Wygląd pojedynczej kratki
// oddany wołającemu przez renderCell — ten sam komponent obsługuje
// mini-kalendarz na pulpicie modułu i duży widok w statystykach.

const WD = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N']

// Kalendarz miesiąca wyrównany do poniedziałku (puste pola przed 1. dniem).
// renderCell(dateStr) → { bg, border, color, ring, title }. Rozmiar sterowany
// przez cellH/font/gap; maxWidth ogranicza szerokość (np. na dashboardzie).
export default function MonthCalendar({ month, renderCell, cellH = 20, gap = 3, font = 8.5, maxWidth, showNums = true }) {
  const mStart = startOfMonth(month)
  const lead = (mStart.getDay() + 6) % 7
  const count = getDaysInMonth(month)
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => ymd(addDays(mStart, i)))]
  const wrap = maxWidth ? { maxWidth } : {}
  return (
    <div>
      <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap, marginBottom: gap }}>
        {WD.map((l, i) => <div key={i} style={{ textAlign: 'center', fontSize: Math.max(7, font - 0.5), color: 'var(--text-muted)', fontWeight: 700 }}>{l}</div>)}
      </div>
      <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap }}>
        {cells.map((d, idx) => {
          if (!d) return <div key={`b${idx}`} />
          const c = renderCell(d)
          return (
            <div key={d} title={c.title} style={{
              height: cellH, borderRadius: cellH >= 26 ? 6 : 4, background: c.bg, border: c.border,
              boxShadow: c.ring ? '0 0 0 1.5px var(--warn)' : 'none',
              display: 'grid', placeItems: 'center', fontSize: font, color: c.color || 'var(--text-muted)', fontWeight: 600,
            }}>{showNums ? format(new Date(d + 'T12:00:00'), 'd') : ''}</div>
          )
        })}
      </div>
    </div>
  )
}

// „Dzisiejszy rytm" — ścieżka dnia nad listą nawyków. Wyłączona, bo w praktyce
// mało używana; kod i komponent DayPath zostają nietknięte, żeby dało się do
// niej wrócić. Aby przywrócić: ustaw na true — nic więcej nie trzeba.
