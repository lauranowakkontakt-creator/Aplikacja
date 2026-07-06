import { format, subDays, addDays } from 'date-fns'

// Czy dany dzień mieści się w którejś z pauz (wakacje/choroba)
export function isPausedDay(dateStr, pauses = []) {
  return pauses.some(p => dateStr >= p.from && dateStr <= p.to)
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
