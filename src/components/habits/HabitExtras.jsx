import { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CatIcon, IconFlag, IconCheck, IconPlus, IconStar } from '../Icons'
import { optionalProgress, optionalSummary, optionalDayCount, hasAmountGoal,
  amountTotals } from '../../utils/habitLogic'
import { habitPeriodLabel, optionalRange, optionalBuckets } from '../../utils/habitStats'
import { BarChartSVG } from '../ChartPrimitives'
import StatTiles from '../StatTiles'
import SegTabs from '../SegTabs'
import MonthCalendar from './MonthCalendar'
import AmountStepper from './AmountStepper'

// Ekran „Wyzwania" — cele poboczne. Wchodzi się tu flagą w belce, tak samo jak
// twarzą w Nastrój: osobny widok W MIEJSCU treści Nawyków, nie nakładka
// (nakładce belka aplikacji zasłaniała własny pasek).
//
// Podział ekranu jest TAKI SAM jak w Nawykach: „Dziś" to zwarta lista do
// odhaczania, a siatki dni i liczby siedzą w osobnych „Statystykach”. Kalendarz
// pod każdą pozycją listy dnia zjadał cały ekran — na telefonie trzy wyzwania
// znaczyły trzy przewinięcia, żeby dojść do czwartego.
//
// Czym wyzwanie różni się od nawyku wymaganego:
//  - nie wchodzi do celu dnia ani do procentów okresu,
//  - NIE MA serii ani rekordu — liczy się „ile razy”, a przerwa w ciągu nie
//    jest porażką; zamiast strike jest licznik i najlepszy dzień,
//  - wykres pokazuje LICZBĘ zaliczeń, nie procent: nie ma planu, z którego
//    dałoby się policzyć „ile z ilu”,
//  - pusta kratka nie jest porażką, tylko dniem, w którym się nie zdarzyło,
//    więc nie ma tu obwódek „pominięte” ani stanów pauzy.
//
// Dzień jest wspólny z listą dnia Nawyków (ten sam `selectedDay` z modułu), więc
// przejście tam i z powrotem nie gubi miejsca, w którym jesteś.
export default function HabitExtras({
  habits = [], archived = [], today, selectedDay, onSelectDay, onToggle, onSetAmount, onEdit, onAdd,
}) {
  const [tab, setTab]       = useState('today')
  const [period, setPeriod] = useState('month')

  const selDate  = new Date(selectedDay + 'T12:00:00')
  const isToday  = selectedDay === today
  const isFuture = selectedDay > today
  const dayLabel = format(selDate, 'EEEE, d MMMM', { locale: pl })

  const { start, end } = optionalRange(period, selectedDay)
  const sum     = optionalSummary(habits, start, end)
  const okresLabel = period === 'week'
    ? `${format(new Date(start + 'T12:00:00'), 'd MMM', { locale: pl })} – ${format(new Date(end + 'T12:00:00'), 'd MMM', { locale: pl })}`
    : period === 'year'
      ? format(selDate, 'yyyy')
      : format(selDate, 'LLLL yyyy', { locale: pl })

  const fmtDzien = (d) => format(new Date(d + 'T12:00:00'), 'd MMM', { locale: pl })

  // Kratka dnia dla JEDNEGO wyzwania. Wypełniona = zaliczone; pusta to tylko
  // dzień, w którym się nie zdarzyło, dlatego bez obwódek „pominięte”.
  const cellForHabit = (habit, color) => (d) => {
    const isDone = (habit.completedDates || []).includes(d)
    if (isDone) return { bg: color, border: `1px solid ${color}`, color: '#fff', ring: d === today, title: `${d} — zaliczone` }
    return {
      bg: 'transparent',
      border: d > today ? '1px dashed var(--border)' : '1px solid var(--border)',
      color: 'var(--text-muted)',
      ring: d === today,
      title: d,
    }
  }

  // Kratka zbiorcza — im więcej wyzwań zaliczonych tego dnia, tym mocniejszy
  // kolor. Skalę liczymy do liczby wyzwań, więc „pełny” dzień to wszystkie.
  const cellForAll = (d) => {
    const n = optionalDayCount(habits, d)
    if (n === 0) {
      return {
        bg: 'transparent',
        border: d > today ? '1px dashed var(--border)' : '1px solid var(--border)',
        color: 'var(--text-muted)', ring: d === today, title: d > today ? d : `${d} — nic`,
      }
    }
    const udzial = Math.min(1, n / Math.max(1, habits.length))
    return {
      bg: `color-mix(in oklab, var(--warn) ${Math.round(22 + udzial * 78)}%, var(--surface2))`,
      border: '1px solid transparent',
      color: udzial > 0.55 ? '#fff' : 'var(--text)',
      ring: d === today,
      title: `${d} — ${n} ${n === 1 ? 'zaliczenie' : 'zaliczenia'}`,
    }
  }

  if (habits.length === 0 && archived.length === 0) {
    return (
      <div className="card" style={{ padding: 22, textAlign: 'center' }}>
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 10, color: 'var(--text-muted)' }}>
          <IconFlag size={26} />
        </div>
        <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>Nie masz jeszcze wyzwań</p>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Wyzwanie to cel poboczny — nie psuje procentów dnia i nie ma serii.
          Zrobisz, to się liczy; nie zrobisz, nic się nie dzieje.
          Zakładasz je jak zwykły nawyk, wybierając „Rodzaj: Wyzwanie".
        </p>
        <button className="t-btn" onClick={onAdd}
          style={{ width: 'auto', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <IconPlus size={14} /> Nowe wyzwanie
        </button>
      </div>
    )
  }

  const ikona = (h, size = 15) => {
    const color = h.color || 'var(--warn)'
    return (
      <span className="habit-emoji" style={{
        background: color + '1A', border: `1px solid ${color + '40'}`, color, flexShrink: 0,
      }}>
        <CatIcon categoryId={null} emoji={h.emoji} size={size} />
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SegTabs
        items={[{ id: 'today', label: 'Dziś' }, { id: 'stats', label: 'Statystyki' }]}
        active={tab} onChange={setTab}
      />

      {tab === 'today' && (
        <>
          {/* Nawigator dnia — ten sam wzorzec co na liście dnia Nawyków. */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', padding: '10px 14px',
          }}>
            <button className="month-btn" style={{ width: 32, height: 32 }}
              onClick={() => onSelectDay(format(subDays(selDate, 1), 'yyyy-MM-dd'))}>‹</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>{dayLabel}</div>
              {isToday && (
                <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 2 }}>Dziś</div>
              )}
            </div>
            {/* W przyszłość nie puszczamy — nie da się zaliczyć czegoś, co się nie stało. */}
            <button className="month-btn" style={{ width: 32, height: 32, opacity: isToday ? 0.3 : 1 }}
              disabled={isToday}
              onClick={() => onSelectDay(format(addDays(selDate, 1), 'yyyy-MM-dd'))}>›</button>
          </div>

          {/* Zwarta lista do odhaczania — jedna linijka na wyzwanie, bez siatek.
              Archiwalnych tu nie ma: schowanego wyzwania sie nie zalicza. */}
          {habits.length === 0 && (
            <div className="list-empty"><p>Wszystkie wyzwania są w archiwum — szukaj ich w ⋮ „Ukończone i archiwum".</p></div>
          )}
          {habits.map(h => {
            const done = (h.completedDates || []).includes(selectedDay)
            const color = h.color || 'var(--warn)'
            const p = optionalProgress(h, start, end)
            return (
              <div key={h.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 11 }}>
                <button onClick={() => onEdit(h)} title="Edytuj"
                  style={{
                    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer',
                    background: 'none', border: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', color: 'var(--text)',
                  }}>
                  {ikona(h)}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.name}
                    </span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.inRange}x w okresie · {p.total}x łącznie
                    </span>
                  </span>
                </button>
                {/* Wyzwanie na czas / ilosc: pasek z liczba zamiast haczyka. */}
                {hasAmountGoal(h) ? (
                  <AmountStepper habit={h} dateStr={selectedDay} onSet={onSetAmount} disabled={isFuture} compact />
                ) : (
                  <button
                    onClick={() => !isFuture && onToggle(h, selectedDay)}
                    disabled={isFuture}
                    title={isFuture ? 'Przyszły dzień' : done ? 'Odznacz ten dzień' : 'Zalicz ten dzień'}
                    aria-pressed={done}
                    style={{
                      width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                      cursor: isFuture ? 'default' : 'pointer', opacity: isFuture ? 0.4 : 1,
                      display: 'grid', placeItems: 'center',
                      background: done ? color : 'var(--surface2)',
                      border: `1px solid ${done ? color : 'var(--border)'}`,
                      color: done ? '#fff' : 'var(--text-muted)',
                    }}>
                    <IconCheck size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </>
      )}

      {tab === 'stats' && (
        <>
          <SegTabs
            items={[{ id: 'week', label: 'Tydzień' }, { id: 'month', label: 'Miesiąc' }, { id: 'year', label: 'Rok' }]}
            active={period} onChange={setPeriod}
          />
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase' }}>
            Jak poszło · {okresLabel}
          </div>
          {/* „Ile na to poszlo" — sumy czasu i ilosci, kazda jednostka osobno. */}
          {amountTotals(habits, start, end).length > 0 && (
            <div className="card" style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {amountTotals(habits, start, end).map(t => (
                <div key={t.unit}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--warn)' }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 2 }}>
                    w tym okresie
                  </div>
                </div>
              ))}
            </div>
          )}
          <StatTiles tiles={[
            { Icon: IconCheck, value: sum.done, label: 'zaliczeń', color: 'var(--warn)' },
            { Icon: IconFlag,  value: `${sum.active}/${sum.count}`, label: 'ruszyło' },
            { Icon: IconStar,  value: sum.bestDay ? sum.bestDay.count : '—',
              label: sum.bestDay ? `najlepszy ${fmtDzien(sum.bestDay.date)}` : 'brak zaliczeń' },
          ]} />

          {/* Ten sam podział co w statystykach Nawyków: miesiąc widać jako
              kalendarz, tydzień i rok jako słupki — kratki na cały rok byłyby
              nieczytelne. */}
          <div className="card" style={{ padding: 14 }}>
            {period === 'month' ? (
              <>
                <MonthCalendar month={selDate} renderCell={cellForAll} cellH={30} gap={4} font={11} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>mniej</span>
                  {[0, 0.35, 0.6, 0.85, 1].map((v, i) => (
                    <div key={i} style={{
                      width: 9, height: 9, borderRadius: 2,
                      background: v === 0 ? 'var(--surface2)' : `color-mix(in oklab, var(--warn) ${Math.round(22 + v * 78)}%, var(--surface2))`,
                    }} />
                  ))}
                  <span style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>więcej</span>
                </div>
              </>
            ) : (
              <BarChartSVG data={optionalBuckets(habits, period, selectedDay)} accent="var(--warn)" height={130}
                fmt={(v) => `${v} ${v === 1 ? 'raz' : 'razy'}`} />
            )}
          </div>

          {/* Karty wyzwań — jak karty nawyków w statystykach: siatka dni przy
              miesiącu, przy tygodniu i roku sam licznik. */}
          <div data-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
            {habits.map(h => {
              const p = optionalProgress(h, start, end)
              const color = h.color || 'var(--warn)'
              const okres = habitPeriodLabel(p.first, p.last)
              return (
                <div key={h.id} className="card hover" style={{ padding: 14, cursor: 'pointer' }}
                  onClick={() => onEdit(h)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    {ikona(h, 15)}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.inRange}x w okresie · {p.total}x łącznie
                      </div>
                    </div>
                  </div>
                  {period === 'month'
                    ? <MonthCalendar month={selDate} renderCell={cellForHabit(h, color)} cellH={18} gap={3} font={8} />
                    : okres && <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{okres}</div>}
                </div>
              )
            })}
          </div>

        </>
      )}
    </div>
  )
}
