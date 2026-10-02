import { IconCheck, IconPlus } from '../Icons'
import { dayAmount, dayProgress, formatAmount, nextAmount, amountStep } from '../../utils/habitLogic'

// Zaliczanie nawyku na czas albo ilość — JEDEN przycisk wielkości haczyka.
//
// Wcześniej były trzy („−", pasek z liczbą, „+") i zjadały tyle szerokości, że
// nazwy zostawały jako „Czas z B…" i „Psychol…". Teraz klik dokłada skok
// policzony z celu (do pełna zawsze około czterech kliknięć), a po osiągnięciu
// celu wraca do zera — cofnięcie pomyłki to przeklikanie w kółko.
//
// Pierścień pokazuje postęp, więc widać go bez czytania liczby; sama liczba
// stoi przy nazwie nawyku, gdzie jest na nią miejsce.
export default function AmountStepper({ habit, dateStr, onSet, disabled = false, size = 32 }) {
  const target = Number(habit.target) || 0
  const unit   = habit.unit || 'szt'
  const teraz  = dayAmount(habit, dateStr)
  const pct    = Math.round(dayProgress(habit, dateStr) * 100)
  const color  = habit.color || 'var(--accent)'
  const pelne  = target > 0 && teraz >= target

  const tytul = disabled
    ? 'Przyszły dzień'
    : pelne
      ? `${formatAmount(teraz, unit)} — kliknij, żeby wyzerować`
      : `${formatAmount(teraz, unit)} z ${formatAmount(target, unit)} — kliknij, żeby dodać ${formatAmount(amountStep(target), unit)}`

  return (
    <button
      type="button"
      onClick={() => !disabled && onSet(habit, dateStr, nextAmount(teraz, target))}
      disabled={disabled}
      title={tytul}
      aria-label={tytul}
      style={{
        width: size, height: size, borderRadius: 99, flexShrink: 0, padding: 0, border: 'none',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        // Pierścień postępu: wycinek koła w kolorze nawyku, reszta to tor.
        background: `conic-gradient(${color} ${pct}%, var(--border-strong) 0)`,
        display: 'grid', placeItems: 'center',
        transition: 'all .2s var(--spring)',
      }}
    >
      {/* Środek przykrywa pierścień, zostawiając obwódkę grubości 2–3 px. */}
      <span style={{
        width: size - 5, height: size - 5, borderRadius: 99,
        background: pelne ? color : 'var(--bg)',
        display: 'grid', placeItems: 'center',
        color: pelne ? 'var(--bg)' : 'var(--text-muted)',
        fontSize: size <= 32 ? 9 : 10, fontWeight: 700, lineHeight: 1,
      }}>
        {/* Pusty dzień pokazuje „+", żeby było widać, że przycisk COŚ robi.
            Sam pierścień bez znaku wyglądał jak kontrolka tylko do patrzenia. */}
        {pelne
          ? <IconCheck size={size <= 32 ? 14 : 15} />
          : teraz > 0 ? teraz : <IconPlus size={size <= 32 ? 13 : 14} />}
      </span>
    </button>
  )
}
