import {
  NEGLECT_FILTERS, SORT_MODES, DEFAULT_FILTERS,
  collectTags, isDefaultFilters, toggleTag,
} from '../../utils/prayerFilters'
import { IconChevronDown, IconChevronRight, IconClock, IconFlag, IconTag, IconUsers } from '../Icons'
import { useState } from 'react'

// Pasek filtrów nad listą „Dziś": temat (tag), jak dawno, w jakim porządku.
// Zwinięty pokazuje tylko podsumowanie wyboru — rozwija się dopiero, gdy
// naprawdę chce się coś przestawić, żeby nad prośbami nie stała ściana guzików.

const KAFELKI = [
  { id: 'neglect', label: 'Jak dawno', Icon: IconClock, opcje: NEGLECT_FILTERS },
  { id: 'sort',    label: 'Kolejność', Icon: IconFlag,  opcje: SORT_MODES },
]

// Krótki opis stanu filtrów na zwiniętym pasku — bez rozwijania widać, czy
// lista jest pełna, czy przycięta do jednego tematu.
export function podsumowanieFiltrow(filters) {
  const czesci = []
  if (filters.tags.length) czesci.push(filters.tags.join(' + '))
  const neg = NEGLECT_FILTERS.find(f => f.id === filters.neglect)
  if (neg && neg.minDays) czesci.push(neg.label)
  const sort = SORT_MODES.find(m => m.id === filters.sort)
  if (sort && sort.id !== 'smart') czesci.push(sort.label.toLowerCase())
  return czesci.length ? czesci.join(' · ') : 'Wszystkie prośby'
}

export default function PrayerFilterBar({ filters, onChange, intentions, carMode }) {
  const [open, setOpen] = useState(false)
  const tagi = collectTags(intentions)
  const czysto = isDefaultFilters(filters)
  const set = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="pray-filters">
      <button type="button" className="pray-filters-head" onClick={() => setOpen(o => !o)}>
        {open ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
        <IconTag size={13} />
        <span className="pray-filters-summary" style={{ fontSize: carMode ? 15 : 12 }}>
          {podsumowanieFiltrow(filters)}
        </span>
        {!czysto && <span className="pray-filters-dot" />}
      </button>

      {open && (
        <div className="pray-filters-body">
          <div className="pray-filters-group">
            <span className="pray-filters-label"><IconTag size={11} /> Temat</span>
            <div className="pray-filters-chips">
              {tagi.length === 0 && (
                <span className="pray-filters-hint">Brak tagów — dodaj je przy prośbie (np. Zdrowie, Praca)</span>
              )}
              {tagi.map(({ tag, count }) => (
                <button key={tag} type="button"
                  className={`chip${filters.tags.some(t => t.toLowerCase() === tag.toLowerCase()) ? ' active' : ''}`}
                  onClick={() => set({ tags: toggleTag(filters.tags, tag) })}>
                  {tag} <span className="pray-filters-count">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {KAFELKI.map(({ id, label, Icon, opcje }) => (
            <div className="pray-filters-group" key={id}>
              <span className="pray-filters-label"><Icon size={11} /> {label}</span>
              <div className="pray-filters-chips">
                {opcje.map(o => (
                  <button key={o.id} type="button"
                    className={`chip${filters[id] === o.id ? ' active' : ''}`}
                    onClick={() => set({ [id]: o.id })}>
                    {o.id === 'person' ? <><IconUsers size={11} /> {o.label}</> : o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pray-filters-group">
            <button type="button"
              className={`chip${filters.pinTemporary ? ' active' : ''}`}
              onClick={() => set({ pinTemporary: !filters.pinTemporary })}>
              Chwilowe na górze
            </button>
            {!czysto && (
              <button type="button" className="pray-filters-reset" onClick={() => onChange({ ...DEFAULT_FILTERS })}>
                Wyczyść
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
