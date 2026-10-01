import { format, addDays, startOfWeek, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import { pauseForDay, pauseReasonMeta, rangeStats, dayScore, isPausedDay, isRequiredHabit,
  optionalSummary } from './habitLogic.js'

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
  // Trend realizacji liczymy TYLKO z nawyków wymaganych — tak samo jak cel dnia
  // w dayScore. Nawyk dodatkowy („wyzwanie") wchodził tu do mianownika i zaniżał
  // procent za dni, w których po prostu nie było go w planie: cel dnia pokazywał
  // 100%, a słupek tego samego dnia 60%.
  const glowne = habits.filter(isRequiredHabit)
  const pct = (start, end) => (start > todayStr ? 0 : rangeStats(glowne, pauses, start, clampEnd(end)).pct)
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

// Etykieta okresu życia nawyku — „kiedy to się działo", pokazywana przy
// nawykach ukończonych i zarchiwizowanych. Bez niej stary nawyk w archiwum
// mówił tylko ile razy się udało, a nie z jakich to lat.
//
// Granice bierzemy z odhaczeń (pierwsze i ostatnie), nie z startDate/endDate:
// nawyk schowany do archiwum zwykle nie ma daty końca, a ostatni odhaczony
// dzień i tak lepiej opisuje, kiedy się skończyło.
//  - ten sam miesiąc        → „sie 2026"
//  - ten sam rok            → „mar – lip 2026"
//  - różne lata             → „sie 2025 – sie 2026"
//  - jedna granica albo brak → null (nie ma czego pokazać)
export function habitPeriodLabel(from, to) {
  if (!from || !to) return null
  const a = new Date(from + 'T12:00:00'), b = new Date(to + 'T12:00:00')
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  const mies = (d) => format(d, 'LLL', { locale: pl })
  const rok  = (d) => format(d, 'yyyy')
  if (rok(a) === rok(b)) {
    if (mies(a) === mies(b)) return `${mies(a)} ${rok(a)}`
    return `${mies(a)} – ${mies(b)} ${rok(b)}`
  }
  return `${mies(a)} ${rok(a)} – ${mies(b)} ${rok(b)}`
}

// Zakres okresu dla ekranu Wyzwań. Liczymy od WYBRANEGO dnia, nie od dziś —
// ekran ma nawigator dni, więc cofnięcie się do września ma pokazać statystyki
// września, a nie bieżącego miesiąca.
export function optionalRange(period, dayStr) {
  const d = new Date(dayStr + 'T12:00:00')
  if (period === 'week') {
    const s = startOfWeek(d, { weekStartsOn: 1 })
    return { start: ymd(s), end: ymd(addDays(s, 6)) }
  }
  if (period === 'year') return { start: `${format(d, 'yyyy')}-01-01`, end: `${format(d, 'yyyy')}-12-31` }
  return { start: ymd(startOfMonth(d)), end: ymd(endOfMonth(d)) }
}

// Kubełki do wykresu na ekranie Wyzwań. W przeciwieństwie do statBuckets
// wartością jest LICZBA zaliczeń, nie procent: wyzwanie nie ma planu, więc
// nie ma z czego liczyć procentu — pytanie brzmi „ile razy", nie „ile z ilu".
//  - week  → 7 dni tygodnia
//  - month → tygodnie miesiąca (T1..T5)
//  - year  → 12 miesięcy
export function optionalBuckets(habits = [], period, dayStr) {
  const d = new Date(dayStr + 'T12:00:00')
  const ile = (s, e) => optionalSummary(habits, s, e).done
  if (period === 'week') {
    const s = startOfWeek(d, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => {
      const day = ymd(addDays(s, i))
      return { label: format(addDays(s, i), 'EEEEEE', { locale: pl }), value: ile(day, day), active: day === dayStr }
    })
  }
  if (period === 'year') {
    const rok = format(d, 'yyyy')
    return Array.from({ length: 12 }, (_, m) => {
      const first = new Date(Number(rok), m, 1)
      const start = ymd(startOfMonth(first)), end = ymd(endOfMonth(first))
      return { label: format(first, 'LLL', { locale: pl }), value: ile(start, end), active: dayStr >= start && dayStr <= end }
    })
  }
  const ms = startOfMonth(d)
  const total = getDaysInMonth(d)
  const buckets = []
  for (let i = 0, wk = 1; i < total; i += 7, wk++) {
    const start = ymd(addDays(ms, i))
    const end = ymd(addDays(ms, Math.min(i + 6, total - 1)))
    buckets.push({ label: `T${wk}`, value: ile(start, end), active: dayStr >= start && dayStr <= end })
  }
  return buckets
}
