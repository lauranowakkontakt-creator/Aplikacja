import { format, startOfMonth, endOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CatIcon, IconFlag, IconCheck, IconPlus } from '../Icons'
import { optionalProgress, optionalSummary } from '../../utils/habitLogic'
import { habitPeriodLabel } from '../../utils/habitStats'

// Ekran „Dodatkowe" — wyzwania i cele poboczne. Wchodzi się tu flagą w belce,
// tak samo jak twarzą w Nastrój: osobny widok W MIEJSCU treści Nawyków, nie
// nakładka (nakładce belka aplikacji zasłaniała własny pasek).
//
// Czym to się różni od nawyku wymaganego:
//  - nie wchodzi do celu dnia ani do procentów okresu,
//  - NIE MA serii ani rekordu — przy wyzwaniu liczy się „ile razy", a przerwa
//    w ciągu nie jest porażką,
//  - za to widać przebieg: ile w tym miesiącu, ile łącznie, od kiedy.
export default function HabitExtras({ habits = [], today, onToggle, onEdit, onAdd }) {
  const mStart = format(startOfMonth(new Date(today + 'T12:00:00')), 'yyyy-MM-dd')
  const mEnd   = format(endOfMonth(new Date(today + 'T12:00:00')), 'yyyy-MM-dd')
  const sum    = optionalSummary(habits, mStart, mEnd)
  const monthLabel = format(new Date(today + 'T12:00:00'), 'LLLL yyyy', { locale: pl })

  if (habits.length === 0) {
    return (
      <div className="card" style={{ padding: 22, textAlign: 'center' }}>
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 10, color: 'var(--text-muted)' }}>
          <IconFlag size={26} />
        </div>
        <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>Nie masz jeszcze wyzwań</p>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Wyzwanie to cel poboczny — nie psuje procentów dnia i nie ma serii.
          Zrobisz, to się liczy; nie zrobisz, nic się nie dzieje.
          Zakładasz je jak zwykły nawyk, wybierając „Rodzaj: Dodatkowy".
        </p>
        <button className="t-btn" onClick={onAdd}
          style={{ width: 'auto', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <IconPlus size={14} /> Nowe wyzwanie
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card" style={{
        padding: 16, display: 'flex', alignItems: 'center', gap: 14,
        borderTop: '2px solid color-mix(in oklab, var(--warn) 80%, transparent)',
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center',
          background: 'color-mix(in oklab, var(--warn) 14%, transparent)', color: 'var(--warn)',
        }}>
          <IconFlag size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase' }}>
            Wyzwania · {monthLabel}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 3 }}>
            {sum.done}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}> × w tym miesiącu</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {sum.active} z {sum.count} ruszyło · bez serii, bez wpływu na cel dnia
          </div>
        </div>
      </div>

      {habits.map(h => {
        const p = optionalProgress(h, mStart, mEnd)
        const done = (h.completedDates || []).includes(today)
        const color = h.color || 'var(--warn)'
        const okres = habitPeriodLabel(p.first, p.last)
        return (
          <div key={h.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => onEdit(h)} title="Edytuj"
              style={{
                flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer',
                background: 'none', border: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', color: 'var(--text)',
              }}>
              <span className="habit-emoji" style={{
                background: color + '1A', border: `1px solid ${color + '40'}`, color, flexShrink: 0,
              }}>
                <CatIcon categoryId={null} emoji={h.emoji} size={15} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.name}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  {p.inRange}x w tym miesiącu · {p.total}x łącznie{okres ? ` · ${okres}` : ''}
                </span>
              </span>
            </button>
            <button
              onClick={() => onToggle(h, today)}
              title={done ? 'Odznacz dzisiaj' : 'Zalicz dzisiaj'}
              aria-pressed={done}
              style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
                display: 'grid', placeItems: 'center',
                background: done ? color : 'var(--surface2)',
                border: `1px solid ${done ? color : 'var(--border)'}`,
                color: done ? '#fff' : 'var(--text-muted)',
              }}>
              <IconCheck size={17} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
