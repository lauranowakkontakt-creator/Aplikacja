import {
  addDays, addWeeks, addMonths, addYears, format, parseISO,
  differenceInCalendarDays, differenceInCalendarMonths, differenceInCalendarYears,
} from 'date-fns'

// Rozwijanie wydarzeń cyklicznych na konkretne wystąpienia.
//
// Wydzielone z CalendarDashboard.jsx: to czysta funkcja dat, więc da się ją
// przetestować bez przeglądarki — a jest to najbardziej podchwytliwy kawałek
// Kalendarza (miesiące o różnej długości, 29 lutego, wydarzenia wielodniowe
// wchodzące w zakres tylko końcem).

export const RECURRENCE = [
  { id: '',        label: 'Nie' },
  { id: 'daily',   label: 'Codziennie' },
  { id: 'weekly',  label: 'Co tydzień' },
  { id: 'monthly', label: 'Co miesiąc' },
  { id: 'yearly',  label: 'Co rok' },
]

export const RECUR_LABEL = {
  daily: 'co dzień', weekly: 'co tydzień', monthly: 'co miesiąc', yearly: 'co rok',
}

export const recStep = (d, rec) =>
  rec === 'daily'   ? addDays(d, 1)
  : rec === 'weekly'  ? addWeeks(d, 1)
  : rec === 'monthly' ? addMonths(d, 1)
  : addYears(d, 1)

// Bezpiecznik: gdyby przeskok się nie udał, pętla i tak się zatrzyma.
// 900 wystączy na trzy lata dziennych wystąpień w jednym oknie widoku.
const LIMIT_ITERACJI = 900

// Ile kroków cyklu trzeba wykonać, żeby dojść z `od` co najmniej do `cel`.
//
// Bez tego pętla szła krok po kroku od pierwszego wystąpienia. Dla wydarzenia
// codziennego sprzed kilku lat limit iteracji kończył się ZANIM pętla doszła
// do oglądanego miesiąca — i wydarzenie po prostu znikało z kalendarza, bez
// żadnego błędu. Przy okazji: 900 obrotów pętli na każdym przemalowaniu widoku.
function przeskocz(od, cel, rec) {
  if (cel <= od) return 0
  const kroki =
    rec === 'daily'   ? differenceInCalendarDays(cel, od)
    : rec === 'weekly'  ? Math.floor(differenceInCalendarDays(cel, od) / 7)
    : rec === 'monthly' ? differenceInCalendarMonths(cel, od)
    : differenceInCalendarYears(cel, od)
  // Cofamy się o jeden: przeskok ma NIE PRZEskoczyć pierwszego wystąpienia
  // w zakresie. Miesiące mają różną długość, więc różnica kalendarzowa potrafi
  // wypaść o jeden za dużo — resztę dobiera zwykła pętla.
  return Math.max(0, kroki - 1)
}

/**
 * Rozwija listę wydarzeń na wystąpienia mieszczące się w [rangeStart, rangeEnd].
 * Daty jako stringi 'yyyy-MM-dd'.
 *
 * Wydarzenia bez cyklu przechodzą bez zmian (o ile wpadają w zakres).
 * Cykliczne dostają `_baseId` (id pierwowzoru) i `_recurring: true`, żeby widok
 * wiedział, że edycja dotyczy całej serii, a nie tego jednego dnia.
 */
export function expandEvents(events, rangeStart, rangeEnd) {
  const wynik = []

  for (const e of events) {
    if (!e.recurrence) {
      // Wydarzenie wielodniowe wchodzi w zakres także wtedy, gdy zaczęło się
      // przed nim, a kończy w środku — stąd porównanie po dacie końca.
      if ((e.dateEnd || e.date) >= rangeStart && e.date <= rangeEnd) wynik.push(e)
      continue
    }

    const dlugosc = e.dateEnd
      ? differenceInCalendarDays(parseISO(e.dateEnd), parseISO(e.date))
      : 0
    const twardyKoniec = e.recurUntil || rangeEnd

    const baza = parseISO(e.date)
    // Wystąpienie liczy się, gdy jego KONIEC sięga początku zakresu, więc cel
    // przeskoku cofamy o długość wydarzenia.
    const cel = addDays(parseISO(rangeStart), -dlugosc)

    let cur = baza
    const pominac = przeskocz(baza, cel, e.recurrence)
    if (pominac > 0) {
      cur = e.recurrence === 'daily'   ? addDays(baza, pominac)
          : e.recurrence === 'weekly'  ? addWeeks(baza, pominac)
          : e.recurrence === 'monthly' ? addMonths(baza, pominac)
          : addYears(baza, pominac)
    }

    let obrot = 0
    while (obrot++ < LIMIT_ITERACJI) {
      const cd = format(cur, 'yyyy-MM-dd')
      if (cd > rangeEnd || cd > twardyKoniec) break

      const cdEnd = dlugosc ? format(addDays(cur, dlugosc), 'yyyy-MM-dd') : null
      if ((cdEnd || cd) >= rangeStart) {
        wynik.push({ ...e, date: cd, dateEnd: cdEnd, _baseId: e.id, _recurring: true })
      }
      cur = recStep(cur, e.recurrence)
    }
  }

  return wynik
}
