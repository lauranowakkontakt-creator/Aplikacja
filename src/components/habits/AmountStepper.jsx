import { IconCheck, IconPlus } from '../Icons'
import { dayAmount, dayProgress, unitMeta, formatAmount, amountShortLabel } from '../../utils/habitLogic'

// Wpisywanie wykonania dla nawyku na czas albo ilość. Zamiast haczyka: pasek
// postępu i dwa przyciski. Na telefonie nie ma klawiatury numerycznej w drodze —
// „−" i „+" robią skok (5 przy minutach, 1 przy sztukach), a kliknięcie w pasek
// domyka cel od razu, bo „zrobione i tyle" to najczęstszy przypadek.
export default function AmountStepper({ habit, dateStr, onSet, disabled = false, compact = false }) {
  const target = Number(habit.target) || 0
  const unit   = habit.unit || 'szt'
  const meta   = unitMeta(unit)
  const skok   = meta.time ? 5 : 1
  const teraz  = dayAmount(habit, dateStr)
  const pct    = Math.round(dayProgress(habit, dateStr) * 100)
  const color  = habit.color || 'var(--accent)'
  const pelne  = teraz >= target

  const ustaw = (v) => { if (!disabled) onSet(habit, dateStr, Math.max(0, v)) }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, opacity: disabled ? 0.45 : 1 }}>
      <button type="button" className="icon-btn" disabled={disabled || teraz === 0}
        title={`−${skok}`} onClick={() => ustaw(teraz - skok)}
        style={{ width: 26, height: 26, flexShrink: 0, fontSize: 13, lineHeight: 1 }}>−</button>

      {/* Pasek z liczbą w środku — jednocześnie postęp i przycisk „domknij cel". */}
      <button type="button" disabled={disabled}
        onClick={() => ustaw(pelne ? 0 : target)}
        title={pelne ? 'Wyczyść dzień' : `Zalicz cały cel (${formatAmount(target, unit)})`}
        style={{
          position: 'relative', flexShrink: 0, width: compact ? 62 : 88, height: 26,
          borderRadius: 8, overflow: 'hidden', cursor: disabled ? 'default' : 'pointer',
          background: 'var(--surface2)', border: `1px solid ${pelne ? color : 'var(--border)'}`,
          padding: 0, fontFamily: 'inherit',
        }}>
        <span style={{
          position: 'absolute', inset: 0, width: `${pct}%`,
          background: `color-mix(in oklab, ${color} ${pelne ? 100 : 55}%, transparent)`,
        }} />
        <span className="mono" style={{
          position: 'relative', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
          color: pct > 55 ? '#fff' : 'var(--text)',
          display: 'grid', placeItems: 'center', height: '100%',
        }}>
          {amountShortLabel(teraz, target, unit)}
        </span>
      </button>

      <button type="button" className="icon-btn" disabled={disabled}
        title={`+${skok}`} onClick={() => ustaw(teraz + skok)}
        style={{ width: 26, height: 26, flexShrink: 0, color: pelne ? color : undefined }}>
        {pelne ? <IconCheck size={13} /> : <IconPlus size={13} />}
      </button>
    </div>
  )
}
