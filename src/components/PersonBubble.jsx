import { CatIcon } from './Icons'

// Wspólny „bąbelek" osoby — inicjały lub wybrana ikona, na kolorze osoby.
// Używany w modułach, które podpinają osoby z bazy `calendarPeople`.
export const initials = (name) =>
  (name || '?').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()

// `title` — podpowiedź z imieniem po najechaniu. Opcjonalna, bo tam gdzie imię
// stoi tuż obok bąbelka, byłaby tylko szumem.
export default function PersonBubble({ person, size = 32, title = false }) {
  const color = person?.color || '#8b5cf6'
  return (
    <div title={title ? person?.name : undefined} style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color + '28', border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      fontSize: size * 0.36, fontWeight: 700, letterSpacing: '-0.02em',
    }}>
      {person?.icon ? <CatIcon categoryId={null} emoji={person.icon} size={size * 0.5} /> : initials(person?.name)}
    </div>
  )
}
