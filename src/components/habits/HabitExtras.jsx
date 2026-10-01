import { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CatIcon, IconFlag, IconCheck, IconPlus, IconStar } from '../Icons'
import { optionalProgress, optionalSummary, optionalDayCount } from '../../utils/habitLogic'
import { habitPeriodLabel, optionalRange, optionalBuckets } from '../../utils/habitStats'
import { BarChartSVG } from '../ChartPrimitives'
import StatTiles from '../StatTiles'
import SegTabs from '../SegTabs'
import MonthCalendar from './MonthCalendar'

// Ekran „Wyzwania" — cele poboczne. Wchodzi się tu flagą w belce, tak samo jak
// twarzą w Nastrój: osobny widok W MIEJSCU treści Nawyków, nie nakładka
// (nakładce belka aplikacji zasłaniała własny pasek).
//
// Czym to się różni od nawyku wymaganego:
//  - nie wchodzi do celu dnia ani do procentów okresu,
//  - NIE MA serii ani rekordu — przy wyzwaniu liczy się „ile razy", a przerwa
//    w ciągu nie jest porażką; zamiast strike jest licznik i najlepszy dzień,
//  - wykres pokazuje LICZBĘ zaliczeń, nie procent: nie ma planu, z którego
//    dałoby się policzyć „ile z ilu".
//
// Dzień jest wspólny z listą dnia Nawyków (ten sam `selectedDay` z modułu), więc
// przejście tam i z powrotem nie gubi miejsca, w którym jesteś.
export default function HabitExtras({
  habits = [], today, selectedDay, onSelectDay, onToggle, onEdit, onAdd,
}) {
  const [period, setPeriod] = useState('month')

  const selDate  = new Date(selectedDay + 'T12:00:00')
  const isToday  = selectedDay === today
  const isFuture = selectedDay > today
  const dayLabel = format(selDate, 'EEEE, d MMMM', { locale: pl })

  const { start, end } = optionalRange(period, selectedDay)
  const sum     = optionalSummary(habits, start, end)
  const buckets = optionalBuckets(habits, period, selectedDay)
  const okresLabel = period === 'week'
    ? `${format(new Date(start + 'T12:00:00'), 'd MMM', { locale: pl })} – ${format(new Date(end + 'T12:00:00'), 'd MMM', { locale: pl })}`
    : period === 'year'
      ? format(selDate, 'yyyy')
      : format(selDate, 'LLLL yyyy', { locale: pl })

  // Kratka dnia dla JEDNEGO wyzwania — ten sam jezyk wizualny co siatki w
  // Nawykach, tylko bez planu: wyzwanie nie ma dni „wymaganych", wiec puste
  // pole nie jest porazka, a jedynie dniem, w ktorym sie nie zdarzylo.
  const cellForHabit = (habit, color) => (d) => {
    const isDone = (habit.completedDates || []).includes(d)
    const future = d > today
    if (isDone) return { bg: color, border: `1px solid ${color}`, color: '#fff', ring: d === today, title: `${d} — zaliczone` }
    return {
      bg: 'transparent',
      border: future ? '1px dashed var(--border)' : '1px solid var(--border)',
      color: 'var(--text-muted)',
      ring: d === today,
      title: d,
    }
  }

  // Kratka zbiorcza — im wiecej wyzwan zaliczonych tego dnia, tym mocniejszy
  // kolor. Skala liczona do liczby wyzwan, wiec „pelny" dzien to wszystkie.
  const cellForAll = (d) => {
    const n = optionalDayCount(habits, d)
    const future = d > today
    if (n === 0) {
      return {
        bg: 'transparent',
        border: future ? '1px dashed var(--border)' : '1px solid var(--border)',
        color: 'var(--text-muted)', ring: d === today, title: future ? d : `${d} — nic`,
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
          Zakładasz je jak zwykły nawyk, wybierając „Rodzaj: Wyzwanie".
        </p>
        <button className="t-btn" onClick={onAdd}
          style={{ width: 'auto', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <IconPlus size={14} /> Nowe wyzwanie
        </button>
      </div>
    )
  }

  const fmtDzien = (d) => format(new Date(d + 'T12:00:00'), 'd MMM', { locale: pl })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

      {habits.map(h => {
        const p = optionalProgress(h, start, end)
        const done = (h.completedDates || []).includes(selectedDay)
        const color = h.color || 'var(--warn)'
        const okres = habitPeriodLabel(p.first, p.last)
        return (
          <div key={h.id} className="card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                  {p.inRange}x w okresie · {p.total}x łącznie{okres ? ` · ${okres}` : ''}
                </span>
              </span>
            </button>
            <button
              onClick={() => !isFuture && onToggle(h, selectedDay)}
              disabled={isFuture}
              title={isFuture ? 'Przyszły dzień' : done ? 'Odznacz ten dzień' : 'Zalicz ten dzień'}
              aria-pressed={done}
              style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                cursor: isFuture ? 'default' : 'pointer', opacity: isFuture ? 0.4 : 1,
                display: 'grid', placeItems: 'center',
                background: done ? color : 'var(--surface2)',
                border: `1px solid ${done ? color : 'var(--border)'}`,
                color: done ? '#fff' : 'var(--text-muted)',
              }}>
              <IconCheck size={17} />
            </button>
          </div>

          {/* Dni, ktore sie udaly — ta sama siatka co w Nawykach. Wypelniona
              kratka to zaliczony dzien; pusta nie jest porazka, bo wyzwanie
              nie ma planu dnia. */}
          <div style={{ marginTop: 12 }}>
            <MonthCalendar month={selDate} renderCell={cellForHabit(h, color)}
              cellH={18} gap={3} font={8} />
          </div>
          </div>
        )
      })}

      {/* ===== Jak poszło ===== */}
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10 }}>
          Jak poszło · {okresLabel}
        </div>
        <SegTabs
          items={[{ id: 'week', label: 'Tydzień' }, { id: 'month', label: 'Miesiąc' }, { id: 'year', label: 'Rok' }]}
          active={period} onChange={setPeriod} style={{ marginBottom: 12 }}
        />
        <StatTiles tiles={[
          { Icon: IconCheck, value: sum.done,  label: 'zaliczeń', color: 'var(--warn)' },
          { Icon: IconFlag,  value: `${sum.active}/${sum.count}`, label: 'ruszyło' },
          { Icon: IconStar,  value: sum.bestDay ? sum.bestDay.count : '—',
            label: sum.bestDay ? `najlepszy ${fmtDzien(sum.bestDay.date)}` : 'brak zaliczeń' },
        ]} />
        {/* Ten sam podzial co w statystykach Nawykow: miesiac widac jako kalendarz,
            tydzien i rok jako slupki — w kalendarzu roku kratka bylaby nieczytelna. */}
        <div className="card" style={{ padding: 14, marginTop: 12 }}>
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
            <BarChartSVG data={buckets} accent="var(--warn)" height={130}
              fmt={(v) => `${v} ${v === 1 ? 'raz' : 'razy'}`} />
          )}
        </div>
      </div>
    </div>
  )
}
