import { format, addDays, startOfWeek, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import { pauseForDay, pauseReasonMeta, rangeStats, dayScore, isPausedDay } from './habitLogic.js'

// Statystyki i zakresy dat dla modułu Nawyki.
//
// Wydzielone z HabitsDashboard.jsx: same funkcje dat i liczb, więc dają się
// sprawdzić testem. W komponencie siedziały obok siebie z JSX-em i nie było
// jak zweryfikować ani granic tygodnia, ani tego, co dzieje się z przyszłymi
// dniami w wykresie trendu.
//
// Uzupełnia habitLogic.js (serie, odhaczanie, wynik dnia) — tam logika
// pojedynczego nawyku, tutaj zestawienia w czasie.

export function getPauseIcon(pauses, dateStr) {
  const p = pauseForDay(dateStr, pauses)
  return p?.reasonIcon || null
}

export function getPauseColor(pauses, dateStr) {
  const p = pauseForDay(dateStr, pauses)
  return p ? pauseReasonMeta(p.reason).color : null
}

export const ymd = (d) => format(d, 'yyyy-MM-dd')

// Zakres dat dla wybranego okresu statystyk.
//  ctx = { weekAnchor, monthAnchor: Date, year: number }
//  - week  → wybrany tydzień (pon–nd)
//  - month → wybrany miesiąc
//  - year  → cały wybrany rok
export function statRange(period, ctx) {
  if (period === 'week') {
    const s = startOfWeek(ctx.weekAnchor, { weekStartsOn: 1 })
    return { start: ymd(s), end: ymd(addDays(s, 6)) }
  }
  if (period === 'month') {
    return { start: ymd(startOfMonth(ctx.monthAnchor)), end: ymd(endOfMonth(ctx.monthAnchor)) }
  }
  return { start: `${ctx.year}-01-01`, end: `${ctx.year}-12-31` }
}

// Kubełki trendu realizacji (%) do wykresu słupkowego:
//  - week  → 7 dni tygodnia
//  - month → tygodnie wybranego miesiąca (T1..T5)
//  - year  → po jednym słupku na każdy rok z danymi (dataYears)
export function statBuckets(habits, pauses, period, ctx, dataYears, now = new Date()) {
  const todayStr = ymd(now)
  const clampEnd = (e) => (e > todayStr ? todayStr : e)
  const pct = (start, end) => (start > todayStr ? 0 : rangeStats(habits, pauses, start, clampEnd(end)).pct)
  if (period === 'week') {
    const s = startOfWeek(ctx.weekAnchor, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => {
      const d = ymd(addDays(s, i))
      return { label: format(addDays(s, i), 'EEEEEE', { locale: pl }), value: pct(d, d), active: d === todayStr }
    })
  }
  if (period === 'month') {
    const ms = startOfMonth(ctx.monthAnchor)
    const total = getDaysInMonth(ctx.monthAnchor)
    const buckets = []
    for (let i = 0, wk = 1; i < total; i += 7, wk++) {
      const start = ymd(addDays(ms, i))
      const end = ymd(addDays(ms, Math.min(i + 6, total - 1)))
      buckets.push({ label: `T${wk}`, value: pct(start, end), active: todayStr >= start && todayStr <= end })
    }
    return buckets
  }
  // year — po słupku na rok
  return dataYears.map(y => ({ label: String(y), value: pct(`${y}-01-01`, `${y}-12-31`), active: y === ctx.year }))
}

// Zbiorczy stan dnia dla wszystkich nawyków (do mini-kalendarza na dashboardzie):
//  due  — ile było obowiązkowych (+ wykonane w pauzie)
//  done — ile z nich zrobione
//  paused — czy to dzień wyjazdu/choroby
export function dayAggregate(habits, pauses, dateStr) {
  // Ta sama zasada co w hero i na Pulpicie: cel z nawyków wymaganych,
  // zrobione ze wszystkich. Intensywność kratki ucinamy na 1.
  const s = dayScore(habits, dateStr, pauses)
  return {
    due: s.required,
    done: s.doneTotal,
    pct: s.pct / 100,
    paused: isPausedDay(dateStr, pauses),
  }
}
