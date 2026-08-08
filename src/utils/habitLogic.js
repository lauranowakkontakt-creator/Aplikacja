import { format, subDays, addDays } from 'date-fns'

// Powody pauz (wyjazd / choroba / inne) — każdy ma swój kolor,
// używany w siatce tygodnia i legendzie, żeby dni przerwy były czytelne.
export const PAUSE_REASONS = [
  { id: 'vacation', label: 'Wyjazd',           icon: 'IcPlane',  color: '#1E3A8A' }, // ciemny niebieski
  { id: 'illness',  label: 'Choroba',          icon: 'IcThermo', color: '#DC2626' }, // czerwony
  { id: 'malaise',  label: 'Złe samopoczucie', icon: 'IcCloud',  color: '#7C3AED' }, // fioletowy
  { id: 'other',    label: 'Inne',             icon: 'IconMore', color: '#64748B' }, // szary
]

export function pauseReasonMeta(reasonId) {
  return PAUSE_REASONS.find(r => r.id === reasonId) || PAUSE_REASONS.find(r => r.id === 'other')
}

// Zwraca pauzę obejmującą dany dzień (albo null)
export function pauseForDay(dateStr, pauses = []) {
  return pauses.find(p => dateStr >= p.from && dateStr <= p.to) || null
}

// Czy dany dzień mieści się w którejś z pauz (wyjazd/choroba)
export function isPausedDay(dateStr, pauses = []) {
  return pauses.some(p => dateStr >= p.from && dateStr <= p.to)
}

// Ustala kolejność sortowania nawyków — najpierw wg pola `order` (ustawianego
// ręcznie w „Kolejności"), potem wg czasu utworzenia jako stabilna rezerwa.
export function byHabitOrder(a, b) {
  const oa = a.order ?? Number.MAX_SAFE_INTEGER
  const ob = b.order ?? Number.MAX_SAFE_INTEGER
  if (oa !== ob) return oa - ob
  return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
}

// Rutyny (części dnia / dowolne grupy) — kolejność wg pola `order`, remis wg
// czasu utworzenia. Taki sam kontrakt jak byHabitOrder.
export function byRoutineOrder(a, b) {
  const oa = a.order ?? Number.MAX_SAFE_INTEGER
  const ob = b.order ?? Number.MAX_SAFE_INTEGER
  if (oa !== ob) return oa - ob
  return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
}

// Grupuje nawyki (lub dowolne elementy) w sekcje wg przypisanej rutyny.
// `items` — lista elementów; `routines` — lista grup; `keyOf(item)` zwraca id
// rutyny elementu. Zwraca sekcje w kolejności rutyn (tylko niepuste), a na końcu
// sekcję bez grupy (id:null), jeśli są nieprzypisane elementy.
// Gdy nie ma żadnych rutyn — zwraca jedną sekcję {id:null} ze wszystkimi
// elementami, więc widok wygląda jak wcześniej (rutyny są opcjonalne).
export function groupByRoutine(items = [], routines = [], keyOf = (x) => x.routineId) {
  const ordered = [...routines].sort(byRoutineOrder)
  const sections = ordered.map(r => ({ id: r.id, name: r.name, items: [] }))
  const byId = Object.fromEntries(sections.map(s => [s.id, s]))
  const none = { id: null, name: null, items: [] }
  for (const it of items) {
    const rid = keyOf(it)
    ;(byId[rid] || none).items.push(it)
  }
  const result = sections.filter(s => s.items.length > 0)
  if (none.items.length > 0) result.push(none)
  return result
}

// Status nawyku danego dnia:
//  'before-start' | 'after-end' | 'paused' | 'due' | 'off'
//  'due'  = obowiązkowy tego dnia (wg harmonogramu)
//  'off'  = poza harmonogramem → dostępny jako dodatkowy (nieobowiązkowy)
//  'paused' = w trakcie pauzy → każdy nawyk jest dodatkowy
export function isHabitDue(habit, dateStr, pauses = []) {
  if (habit.startDate && dateStr < habit.startDate) return 'before-start'
  if (habit.endDate && dateStr > habit.endDate) return 'after-end'
  if (isPausedDay(dateStr, pauses)) return 'paused'
  const days = habit.frequencyDays || [0, 1, 2, 3, 4, 5, 6]
  return days.includes(new Date(dateStr + 'T12:00:00').getDay()) ? 'due' : 'off'
}

// Aktualna seria (streak).
//  - każdy odhaczony dzień liczy się (także bonusy: dni poza harmonogramem i w pauzie)
//  - pominięty dzień OBOWIĄZKOWY przerywa serię
//  - pominięte dni: poza harmonogramem, w pauzie oraz dzisiejszy (jeszcze nierobiony) NIE przerywają serii
export function getStreak(
  completedDates,
  frequencyDays = [0, 1, 2, 3, 4, 5, 6],
  pauses = [],
  startDate = null,
  today = format(new Date(), 'yyyy-MM-dd'),
) {
  if (!completedDates?.length) return 0
  const completed = new Set(completedDates)
  const freq = frequencyDays || [0, 1, 2, 3, 4, 5, 6]
  let streak = 0
  let check = new Date(today + 'T12:00:00')
  for (let i = 0; i < 730; i++) {
    const dateStr = format(check, 'yyyy-MM-dd')
    if (startDate && dateStr < startDate) break
    if (completed.has(dateStr)) { streak++; check = subDays(check, 1); continue } // zrobione (obowiązkowe lub bonus)
    if (isPausedDay(dateStr, pauses)) { check = subDays(check, 1); continue }      // pauza → przeskocz
    if (!freq.includes(check.getDay())) { check = subDays(check, 1); continue }    // poza harmonogramem → przeskocz
    if (dateStr === today) { check = subDays(check, 1); continue }                 // dzisiaj jeszcze nierobione → grace
    break                                                                          // pominięty dzień obowiązkowy → koniec
  }
  return streak
}

// ── Checklist (kroki) nawyku ──
// Nawyk może mieć kroki: checklist = [{ id, title }], a stan odhaczenia
// per dzień trzymamy w checklistDone = { 'yyyy-MM-dd': [stepId, ...] }.

// Przełącza jeden krok — zwraca nową listę odhaczonych id (bez mutacji)
export function toggleStepDone(doneIds = [], stepId) {
  return doneIds.includes(stepId) ? doneIds.filter(id => id !== stepId) : [...doneIds, stepId]
}

// Czy wszystkie kroki nawyku są odhaczone (pusta checklista → false)
export function isChecklistComplete(checklist = [], doneIds = []) {
  return checklist.length > 0 && checklist.every(s => doneIds.includes(s.id))
}

// Najdłuższa seria w historii — ta sama reguła co getStreak, ale skanujemy
// od pierwszego wykonania do dziś i szukamy najdłuższego nieprzerwanego ciągu.
export function getBestStreak(
  completedDates,
  frequencyDays = [0, 1, 2, 3, 4, 5, 6],
  pauses = [],
  startDate = null,
  today = format(new Date(), 'yyyy-MM-dd'),
) {
  if (!completedDates?.length) return 0
  const completed = new Set(completedDates)
  const freq = frequencyDays || [0, 1, 2, 3, 4, 5, 6]
  const first = [...completedDates].sort()[0]
  const start = startDate && startDate > first ? startDate : first
  let best = 0, current = 0
  let check = new Date(start + 'T12:00:00')
  while (format(check, 'yyyy-MM-dd') <= today) {
    const dateStr = format(check, 'yyyy-MM-dd')
    if (completed.has(dateStr)) { current++; if (current > best) best = current } // zrobione → liczy
    else if (isPausedDay(dateStr, pauses)) { /* pauza → most, nie zeruj */ }
    else if (!freq.includes(check.getDay())) { /* poza harmonogramem → most */ }
    else if (dateStr === today) { /* dzisiaj → grace */ }
    else { current = 0 }                                                          // pominięty obowiązkowy → zeruj
    check = addDays(check, 1)
  }
  return best
}

// ── Statystyki okresowe (tydzień / miesiąc / rok) ──

// Lista dni 'yyyy-MM-dd' od start do end włącznie (bezpiecznik: max 400 dni)
export function eachDayStr(start, end) {
  const out = []
  let d = new Date(start + 'T12:00:00')
  const last = new Date(end + 'T12:00:00')
  for (let i = 0; i < 400 && d <= last; i++) {
    out.push(format(d, 'yyyy-MM-dd'))
    d = addDays(d, 1)
  }
  return out
}

// Podsumowanie realizacji nawyków w zakresie dni [start..end]:
//  - expected  — ile razy nawyk był obowiązkowy (suma po dniach) + wykonania w pauzie
//  - done       — ile z tego wykonano
//  - pct        — procent realizacji (done/expected)
//  - completions — wszystkie odhaczenia (także dodatkowe poza planem / w pauzie)
//  - perfectDays — dni ze 100% wykonaniem dni obowiązkowych
//  - dueDays     — dni, w których cokolwiek było obowiązkowe
// Wykonanie nawyku w trakcie pauzy (wyjazd/choroba) liczy się jako „zrobione"
// i podbija procent — dzień przerwy bez wykonania nie jest karą (pomijany).
export function rangeStats(habits = [], pauses = [], start, end) {
  let expected = 0, done = 0, completions = 0, perfectDays = 0, dueDays = 0
  for (const d of eachDayStr(start, end)) {
    let dueCount = 0, dueDone = 0
    for (const h of habits) {
      const isDone = h.completedDates?.includes(d)
      if (isDone) completions++
      const status = isHabitDue(h, d, pauses)
      if (status === 'due') {
        dueCount++; expected++
        if (isDone) { done++; dueDone++ }
      } else if (status === 'paused' && isDone) {
        // wykonane w trakcie wyjazdu/choroby — liczy się jako zrobione
        expected++; done++
      }
    }
    if (dueCount > 0) { dueDays++; if (dueDone === dueCount) perfectDays++ }
  }
  return { expected, done, completions, perfectDays, dueDays, pct: expected ? Math.round((done / expected) * 100) : 0 }
}
