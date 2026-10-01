import { IconCheck, IconPlus } from '../Icons'
import { dayAmount, dayProgress, unitMeta, formatAmount } from '../../utils/habitLogic'

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, opacity: disabled ? 0.45 : 1 }}>
      <button type="button" className="icon-btn" disabled={disabled || teraz === 0}
        title={`−${skok}`} onClick={() => ustaw(teraz - skok)}
        style={{ width: 30, height: 30, flexShrink: 0 }}>−</button>

      {/* Pasek z liczbą w środku — jednocześnie postęp i przycisk „domknij cel". */}
      <button type="button" disabled={disabled}
        onClick={() => ustaw(pelne ? 0 : target)}
        title={pelne ? 'Wyczyść dzień' : `Zalicz cały cel (${formatAmount(target, unit)})`}
        style={{
          position: 'relative', flex: 1, minWidth: compact ? 72 : 96, height: 30,
          borderRadius: 9, overflow: 'hidden', cursor: disabled ? 'default' : 'pointer',
          background: 'var(--surface2)', border: `1px solid ${pelne ? color : 'var(--border)'}`,
          padding: 0, fontFamily: 'inherit',
        }}>
        <span style={{
          position: 'absolute', inset: 0, width: `${pct}%`,
          background: `color-mix(in oklab, ${color} ${pelne ? 100 : 55}%, transparent)`,
        }} />
        <span className="mono" style={{
          position: 'relative', fontSize: 11, fontWeight: 600,
          color: pct > 55 ? '#fff' : 'var(--text)',
          display: 'grid', placeItems: 'center', height: '100%',
        }}>
          {pelne
            ? formatAmount(teraz, unit)
            : `${formatAmount(teraz, unit)} / ${formatAmount(target, unit)}`}
        </span>
      </button>

      <button type="button" className="icon-btn" disabled={disabled}
        title={`+${skok}`} onClick={() => ustaw(teraz + skok)}
        style={{ width: 30, height: 30, flexShrink: 0, color: pelne ? color : undefined }}>
        {pelne ? <IconCheck size={14} /> : <IconPlus size={14} />}
      </button>
    </div>
  )
}
