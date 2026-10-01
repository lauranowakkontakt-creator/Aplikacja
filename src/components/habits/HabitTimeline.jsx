import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CatIcon } from '../Icons'
import { timelineLanes, timelineTicks } from '../../utils/habitStats'

// Oś czasu archiwum — zamknięte nawyki jako pasy na jednej wspólnej skali.
// Archiwum JEST historią, więc zamiast osobnych kafelków z liczbami pokazujemy,
// co kiedy trwało: od razu widać, co ciągnęło się najdłużej, co było krótkim
// zrywem i które rzeczy robiłaś równolegle.
//
// Skalę i pozycje liczy timelineLanes — tutaj zostaje sam rysunek.
export default function HabitTimeline({ habits = [], accent = 'var(--accent)', onPick }) {
  const { from, to, lanes, longest } = timelineLanes(habits)
  if (lanes.length === 0) return null

  const ticks = timelineTicks(from, to)
  const fmtD = (d) => format(new Date(d + 'T12:00:00'), 'd MMM yyyy', { locale: pl })
  const mies = (dni) => {
    const m = Math.round(dni / 30.4)
    if (m < 1) return `${dni} ${dni === 1 ? 'dzień' : 'dni'}`
    return `${m} ${m === 1 ? 'miesiąc' : m < 5 ? 'miesiące' : 'miesięcy'}`
  }

  return (
    <div>
      {/* Podpisy skali */}
      <div style={{ position: 'relative', height: 14, marginBottom: 6 }}>
        {ticks.map((t, i) => (
          <span key={i} style={{
            position: 'absolute', left: `${t.leftPct}%`,
            transform: t.leftPct > 92 ? 'translateX(-100%)' : 'none',
            fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em',
            whiteSpace: 'nowrap',
          }}>{t.label}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {lanes.map(l => {
          const color = l.color || accent
          return (
            <div key={l.id}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                {l.emoji && (
                  <span style={{ color, display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
                    <CatIcon categoryId={null} emoji={l.emoji} size={11} />
                  </span>
                )}
                <span style={{
                  fontSize: 11.5, fontWeight: 600, minWidth: 0, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{l.name}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                  {l.total}x
                </span>
              </div>
              {/* Tor pasa — tło pokazuje całą skalę, pas wycinek, w którym nawyk żył. */}
              <div
                onClick={onPick ? () => onPick(l.id) : undefined}
                title={`${l.name} · ${fmtD(l.from)} – ${fmtD(l.to)} · ${l.total}x`}
                style={{
                  position: 'relative', height: 12, borderRadius: 6,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  cursor: onPick ? 'pointer' : 'default', overflow: 'hidden',
                }}>
                <div style={{
                  position: 'absolute', top: -1, bottom: -1,
                  left: `${l.leftPct}%`, width: `${l.widthPct}%`,
                  background: `linear-gradient(90deg, color-mix(in oklab, ${color} 70%, transparent), ${color})`,
                  borderRadius: 6,
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {longest && lanes.length > 1 && (
        <p style={{ margin: '10px 0 0', fontSize: 10.5, color: 'var(--text-muted)' }}>
          Najdłużej: <strong style={{ color: 'var(--text)' }}>{longest.name}</strong> · {mies(longest.days)}
        </p>
      )}
    </div>
  )
}
