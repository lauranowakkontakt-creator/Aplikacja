import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isPausedDay, isHabitDue, getStreak, getBestStreak, toggleStepDone, isChecklistComplete,
  PAUSE_REASONS, pauseReasonMeta, pauseForDay, byHabitOrder, eachDayStr, rangeStats,
  byRoutineOrder, groupByRoutine, habitDayKind, isDoneKind, isRequiredHabit, dayScore,
  habitLifecycle } from '../src/utils/habitLogic.js'

test('byRoutineOrder: sortuje wg order, remis wg createdAt', () => {
  const a = { id: 'a', order: 2 }, b = { id: 'b', order: 0 }, c = { id: 'c', order: 1 }
  assert.deepEqual([a, b, c].sort(byRoutineOrder).map(x => x.id), ['b', 'c', 'a'])
})

test('groupByRoutine: sekcje w kolejności rutyn + „bez grupy" na końcu', () => {
  const routines = [{ id: 'wiecz', name: 'Wieczór', order: 2 }, { id: 'poranek', name: 'Poranek', order: 0 }]
  const habits = [
    { id: 'h1', routineId: 'poranek' },
    { id: 'h2', routineId: 'wiecz' },
    { id: 'h3', routineId: 'poranek' },
    { id: 'h4', routineId: null },       // bez grupy
    { id: 'h5', routineId: 'nieistnieje' }, // osierocone → bez grupy
  ]
  const g = groupByRoutine(habits, routines)
  assert.deepEqual(g.map(s => s.id), ['poranek', 'wiecz', null])
  assert.deepEqual(g[0].items.map(h => h.id), ['h1', 'h3'])
  assert.deepEqual(g[1].items.map(h => h.id), ['h2'])
  assert.deepEqual(g[2].items.map(h => h.id), ['h4', 'h5'])
})

test('groupByRoutine: pomija puste rutyny', () => {
  const routines = [{ id: 'a', name: 'A', order: 0 }, { id: 'b', name: 'B', order: 1 }]
  const g = groupByRoutine([{ id: 'h1', routineId: 'b' }], routines)
  assert.deepEqual(g.map(s => s.id), ['b'])
})

test('groupByRoutine: brak rutyn → jedna sekcja bez grupy ze wszystkim', () => {
  const g = groupByRoutine([{ id: 'h1', routineId: null }, { id: 'h2', routineId: 'x' }], [])
  assert.equal(g.length, 1)
  assert.equal(g[0].id, null)
  assert.deepEqual(g[0].items.map(h => h.id), ['h1', 'h2'])
})

test('groupByRoutine: własny keyOf (np. elementy {h})', () => {
  const routines = [{ id: 'p', name: 'Poranek', order: 0 }]
  const items = [{ h: { routineId: 'p' }, status: 'due' }]
  const g = groupByRoutine(items, routines, x => x.h.routineId)
  assert.deepEqual(g.map(s => s.id), ['p'])
})

// Punkt odniesienia: 2026-07-06 to poniedziałek (getDay() === 1)
const TODAY = '2026-07-06'
const DAILY = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [1, 2, 3, 4, 5]

// ---------- isPausedDay ----------
test('isPausedDay — wykrywa dzień w zakresie pauzy (włącznie z krańcami)', () => {
  const pauses = [{ from: '2026-07-04', to: '2026-07-05' }]
  assert.equal(isPausedDay('2026-07-03', pauses), false)
  assert.equal(isPausedDay('2026-07-04', pauses), true)
  assert.equal(isPausedDay('2026-07-05', pauses), true)
  assert.equal(isPausedDay('2026-07-06', pauses), false)
  assert.equal(isPausedDay('2026-07-06', []), false)
})

test('isPausedDay/pauseForDay — rozpoznaje pauzę zaplanowaną w przyszłości', () => {
  // Kalendarz nawyków pokazuje wyjazd już przed terminem, więc logika pauzy
  // musi działać dla dat przyszłych (czysty test zakresu — bez „dziś").
  const future = [{ from: '2099-12-24', to: '2099-12-31', reason: 'vacation' }]
  assert.equal(isPausedDay('2099-12-27', future), true)
  assert.equal(isPausedDay('2099-12-23', future), false)
  assert.equal(pauseForDay('2099-12-27', future)?.reason, 'vacation')
})

// ---------- isHabitDue ----------
test('isHabitDue — przed startem i po końcu', () => {
  const h = { frequencyDays: DAILY, startDate: '2026-07-05', endDate: '2026-07-10' }
  assert.equal(isHabitDue(h, '2026-07-04'), 'before-start')
  assert.equal(isHabitDue(h, '2026-07-11'), 'after-end')
})

test('isHabitDue — due w dniu harmonogramu, off poza nim', () => {
  const h = { frequencyDays: WEEKDAYS }
  assert.equal(isHabitDue(h, '2026-07-06'), 'due')   // poniedziałek
  assert.equal(isHabitDue(h, '2026-07-05'), 'off')   // niedziela
})

test('isHabitDue — pauza nadpisuje harmonogram (każdy nawyk dodatkowy)', () => {
  const h = { frequencyDays: DAILY }
  const pauses = [{ from: '2026-07-06', to: '2026-07-06' }]
  assert.equal(isHabitDue(h, '2026-07-06', pauses), 'paused')
})

// ---------- getStreak ----------
test('getStreak — brak wykonań to 0', () => {
  assert.equal(getStreak([], DAILY, [], null, TODAY), 0)
  assert.equal(getStreak(undefined, DAILY, [], null, TODAY), 0)
})

test('getStreak — codzienny: kolejne dni się liczą', () => {
  assert.equal(getStreak(['2026-07-06', '2026-07-05'], DAILY, [], null, TODAY), 2)
})

test('getStreak — dziś jeszcze nierobione nie przerywa serii (grace)', () => {
  // dziś (pon) nie zrobione, ale wczoraj i przedwczoraj tak
  assert.equal(getStreak(['2026-07-05', '2026-07-04'], DAILY, [], null, TODAY), 2)
})

test('getStreak — pominięty dzień OBOWIĄZKOWY przerywa serię', () => {
  // codzienny: brak 07-05 przerywa
  assert.equal(getStreak(['2026-07-06', '2026-07-04'], DAILY, [], null, TODAY), 1)
})

test('getStreak — weekend poza harmonogramem nie przerywa serii', () => {
  // nawyk na dni robocze; pon zrobiony, pt zrobiony, weekend pominięty (off)
  assert.equal(getStreak(['2026-07-06', '2026-07-03'], WEEKDAYS, [], null, TODAY), 2)
})

test('getStreak — dodatkowe wykonanie w dzień poza harmonogramem DOLICZA się do serii', () => {
  // nawyk na dni robocze, ale zrobiony też w sobotę i niedzielę (bonus)
  const done = ['2026-07-06', '2026-07-05', '2026-07-04', '2026-07-03']
  assert.equal(getStreak(done, WEEKDAYS, [], null, TODAY), 4)
})

test('getStreak — pauza nie przerywa serii, a wykonanie w pauzie doliczy bonus', () => {
  const pauses = [{ from: '2026-07-04', to: '2026-07-05' }]
  // codzienny: 07-06 i 07-03 zrobione, 04-05 w pauzie (pominięte, nie przerywają)
  assert.equal(getStreak(['2026-07-06', '2026-07-03'], DAILY, pauses, null, TODAY), 2)
  // dodatkowe wykonanie w pauzie (07-05) też się liczy
  assert.equal(getStreak(['2026-07-06', '2026-07-05', '2026-07-03'], DAILY, pauses, null, TODAY), 3)
})

test('getStreak — nie liczy dni sprzed startDate', () => {
  assert.equal(getStreak(['2026-07-06', '2026-07-05'], DAILY, [], '2026-07-06', TODAY), 1)
})

// ---------- getBestStreak ----------
test('getBestStreak — brak wykonań to 0', () => {
  assert.equal(getBestStreak([], DAILY, [], null, TODAY), 0)
})

test('getBestStreak — najdłuższy nieprzerwany ciąg (codzienny)', () => {
  const done = ['2026-07-01', '2026-07-02', '2026-07-03'] // po nich luka
  assert.equal(getBestStreak(done, DAILY, [], null, TODAY), 3)
})

test('getBestStreak — weekend (off) łączy ciąg tygodni roboczych', () => {
  // pełny tydzień roboczy 29.06–03.07, weekend pominięty nie zeruje
  const done = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03']
  assert.equal(getBestStreak(done, WEEKDAYS, [], null, TODAY), 5)
})

// ---------- checklist (kroki nawyku) ----------
test('toggleStepDone — dodaje i zdejmuje krok bez mutacji wejścia', () => {
  const before = ['a']
  const plus = toggleStepDone(before, 'b')
  assert.deepEqual(plus, ['a', 'b'])
  assert.deepEqual(before, ['a'])
  assert.deepEqual(toggleStepDone(plus, 'a'), ['b'])
  assert.deepEqual(toggleStepDone(undefined, 'x'), ['x'])
})

test('isChecklistComplete — komplet kroków zalicza, pusta checklista nie', () => {
  const checklist = [{ id: 'a', title: 'Krok A' }, { id: 'b', title: 'Krok B' }]
  assert.equal(isChecklistComplete(checklist, ['a']), false)
  assert.equal(isChecklistComplete(checklist, ['a', 'b']), true)
  assert.equal(isChecklistComplete(checklist, ['b', 'a', 'c']), true)
  assert.equal(isChecklistComplete([], []), false)
  assert.equal(isChecklistComplete(undefined, undefined), false)
})

// ---------- pauzy (kolory / powody) ----------
test('pauseReasonMeta — zwraca powód po id, „inne" jako fallback', () => {
  assert.equal(pauseReasonMeta('vacation').label, 'Wyjazd')
  assert.equal(pauseReasonMeta('illness').label, 'Choroba')
  assert.equal(pauseReasonMeta('nieznane').id, 'other')
  PAUSE_REASONS.forEach(r => assert.match(r.color, /^#[0-9A-Fa-f]{6}$/))
})

test('pauseForDay — zwraca pauzę obejmującą dzień albo null', () => {
  const pauses = [{ from: '2026-07-04', to: '2026-07-06', reason: 'illness' }]
  assert.equal(pauseForDay('2026-07-05', pauses)?.reason, 'illness')
  assert.equal(pauseForDay('2026-07-03', pauses), null)
  assert.equal(pauseForDay('2026-07-05', []), null)
})

// ---------- byHabitOrder ----------
test('byHabitOrder — sortuje wg order, brak order na koniec, remis wg createdAt', () => {
  const a = { id: 'a', order: 2 }
  const b = { id: 'b', order: 0 }
  const c = { id: 'c' } // brak order
  const d = { id: 'd', order: 0, createdAt: { seconds: 50 } }
  const e = { id: 'e', order: 0, createdAt: { seconds: 10 } }
  assert.deepEqual([a, b, c].sort(byHabitOrder).map(x => x.id), ['b', 'a', 'c'])
  assert.deepEqual([d, e].sort(byHabitOrder).map(x => x.id), ['e', 'd'])
})

// ---------- eachDayStr ----------
test('eachDayStr — lista dni włącznie z krańcami', () => {
  assert.deepEqual(eachDayStr('2026-07-04', '2026-07-06'), ['2026-07-04', '2026-07-05', '2026-07-06'])
  assert.deepEqual(eachDayStr('2026-07-06', '2026-07-06'), ['2026-07-06'])
  assert.deepEqual(eachDayStr('2026-07-07', '2026-07-06'), [])
})

// ---------- rangeStats ----------
test('rangeStats — liczy expected/done/pct dla nawyku codziennego', () => {
  // codzienny, zrobiony 2 z 3 dni
  const h = { frequencyDays: DAILY, completedDates: ['2026-07-04', '2026-07-06'] }
  const s = rangeStats([h], [], '2026-07-04', '2026-07-06')
  assert.equal(s.expected, 3)
  assert.equal(s.done, 2)
  assert.equal(s.pct, 67)
  assert.equal(s.completions, 2)
})

test('rangeStats — dni 100% tylko gdy wszystkie obowiązkowe zrobione', () => {
  const h1 = { frequencyDays: DAILY, completedDates: ['2026-07-04', '2026-07-05'] }
  const h2 = { frequencyDays: DAILY, completedDates: ['2026-07-04'] }
  const s = rangeStats([h1, h2], [], '2026-07-04', '2026-07-05')
  // 04: oba zrobione → 100%; 05: tylko h1 → nie
  assert.equal(s.perfectDays, 1)
  assert.equal(s.dueDays, 2)
})

test('rangeStats — wykonanie w pauzie (wyjazd) liczy się jako zrobione i podbija procent', () => {
  const pauses = [{ from: '2026-07-05', to: '2026-07-05', reason: 'vacation' }]
  const h = { frequencyDays: DAILY, completedDates: ['2026-07-05'] }
  const s = rangeStats([h], pauses, '2026-07-05', '2026-07-05')
  assert.equal(s.expected, 1)    // wykonane w wyjeździe wchodzi do bilansu
  assert.equal(s.done, 1)
  assert.equal(s.completions, 1)
  assert.equal(s.pct, 100)
})

test('rangeStats — pauza bez wykonania nie jest karą (pomijana)', () => {
  const pauses = [{ from: '2026-07-05', to: '2026-07-05', reason: 'illness' }]
  const h = { frequencyDays: DAILY, completedDates: [] }
  const s = rangeStats([h], pauses, '2026-07-05', '2026-07-05')
  assert.equal(s.expected, 0)
  assert.equal(s.done, 0)
  assert.equal(s.pct, 0)
})

test('rangeStats — pusty zakres nawyków to zera', () => {
  const s = rangeStats([], [], '2026-07-04', '2026-07-06')
  assert.deepEqual(s, { expected: 0, done: 0, completions: 0, perfectDays: 0, dueDays: 0, pct: 0 })
})

// ── habitDayKind — wspólny język stanów dnia (w tym „zrobione mimo wyjazdu") ──

test('habitDayKind — zrobione w trakcie wyjazdu ma własny stan', () => {
  const habit = { completedDates: ['2026-08-27'], frequencyDays: [0,1,2,3,4,5,6] }
  const pauses = [{ from: '2026-08-25', to: '2026-08-29', reason: 'vacation' }]
  assert.equal(habitDayKind({ habit, dateStr: '2026-08-27', pauses, today: '2026-08-31' }), 'done-paused')
  // ten sam nawyk, ten sam dzień, ale bez pauzy → zwykłe „zrobione"
  assert.equal(habitDayKind({ habit, dateStr: '2026-08-27', pauses: [], today: '2026-08-31' }), 'done')
})

test('habitDayKind — dzień przerwy bez wykonania to nie pominięcie', () => {
  const habit = { completedDates: [], frequencyDays: [0,1,2,3,4,5,6] }
  const pauses = [{ from: '2026-08-25', to: '2026-08-29', reason: 'illness' }]
  assert.equal(habitDayKind({ habit, dateStr: '2026-08-27', pauses, today: '2026-08-31' }), 'paused')
  assert.equal(habitDayKind({ habit, dateStr: '2026-08-30', pauses, today: '2026-08-31' }), 'missed')
})

test('habitDayKind — zrobione poza planem to bonus', () => {
  // nawyk tylko w poniedziałki (1); 2026-08-27 to czwartek
  const habit = { completedDates: ['2026-08-27'], frequencyDays: [1] }
  assert.equal(habitDayKind({ habit, dateStr: '2026-08-27', pauses: [], today: '2026-08-31' }), 'done-bonus')
})

test('habitDayKind — przyszłość, w tym zaplanowany wyjazd', () => {
  const habit = { completedDates: [], frequencyDays: [0,1,2,3,4,5,6] }
  const pauses = [{ from: '2026-09-10', to: '2026-09-14', reason: 'vacation' }]
  assert.equal(habitDayKind({ habit, dateStr: '2026-09-12', pauses, today: '2026-08-31' }), 'future-paused')
  assert.equal(habitDayKind({ habit, dateStr: '2026-09-20', pauses, today: '2026-08-31' }), 'future')
})

test('habitDayKind — isDone można podać z zewnątrz', () => {
  const habit = { completedDates: [], frequencyDays: [0,1,2,3,4,5,6] }
  assert.equal(habitDayKind({ habit, dateStr: '2026-08-27', pauses: [], today: '2026-08-31', isDone: true }), 'done')
})

test('isDoneKind — wszystkie warianty zrobionego', () => {
  assert.ok(isDoneKind('done'))
  assert.ok(isDoneKind('done-paused'))
  assert.ok(isDoneKind('done-bonus'))
  assert.ok(!isDoneKind('paused'))
  assert.ok(!isDoneKind('missed'))
})

// ── Wymagane vs dodatkowe: podstawa dnia i nadprogramowa robota ──────────────

test('isRequiredHabit — brak pola znaczy wymagany', () => {
  assert.ok(isRequiredHabit({}))
  assert.ok(isRequiredHabit({ optional: false }))
  assert.ok(!isRequiredHabit({ optional: true }))
})

test('dayScore — mianownik to tylko wymagane na dziś', () => {
  const every = [0,1,2,3,4,5,6]
  const habits = [
    { name: 'a', frequencyDays: every },                    // wymagany, niezrobiony
    { name: 'b', frequencyDays: every, completedDates: ['2026-08-29'] },
    { name: 'c', frequencyDays: every, optional: true },    // dodatkowy — poza celem
    { name: 'd', frequencyDays: [3] },                      // nie wypada dziś (sobota)
  ]
  const s = dayScore(habits, '2026-08-29', [])
  assert.equal(s.required, 2, 'tylko wymagane wypadające dziś')
  assert.equal(s.doneRequired, 1)
  assert.equal(s.doneTotal, 1)
})

test('dayScore — nadprogramowe podbijają licznik ponad cel (11 z 8)', () => {
  const every = [0,1,2,3,4,5,6]
  const day = '2026-08-29'
  const habits = []
  for (let i = 0; i < 8; i++) habits.push({ frequencyDays: every, completedDates: [day] })
  // trzy dodatkowe, poza celem, też zrobione
  for (let i = 0; i < 3; i++) habits.push({ frequencyDays: every, optional: true, completedDates: [day] })
  const s = dayScore(habits, day, [])
  assert.equal(s.required, 8)
  assert.equal(s.doneTotal, 11, 'licznik ma pokazać 11 przy celu 8')
  assert.equal(s.extra, 3)
  assert.equal(s.pct, 100, 'pasek nie przekracza pełna')
})

test('dayScore — nawyk zrobiony poza harmonogramem liczy się na plus', () => {
  const habits = [
    { frequencyDays: [1], completedDates: ['2026-08-29'] }, // sobota, plan na poniedziałek
    { frequencyDays: [0,1,2,3,4,5,6] },                     // wymagany, niezrobiony
  ]
  const s = dayScore(habits, '2026-08-29', [])
  assert.equal(s.required, 1)
  assert.equal(s.doneRequired, 0)
  assert.equal(s.doneTotal, 1)
  assert.equal(s.extra, 1)
})

test('dayScore — dzień bez wymaganych', () => {
  assert.deepEqual(dayScore([], '2026-08-29', []), { required: 0, doneRequired: 0, doneTotal: 0, extra: 0, pct: 0 })
  // nic nie było wymagane, ale coś zrobione → pełny pasek, nie dzielenie przez zero
  const s = dayScore([{ frequencyDays: [1], completedDates: ['2026-08-29'] }], '2026-08-29', [])
  assert.equal(s.pct, 100)
})

test('dayScore — przerwa zdejmuje wymagania, ale robota nadal się liczy', () => {
  const every = [0,1,2,3,4,5,6]
  const pauses = [{ from: '2026-08-28', to: '2026-08-30', reason: 'vacation' }]
  const habits = [
    { frequencyDays: every, completedDates: ['2026-08-29'] },
    { frequencyDays: every },
  ]
  const s = dayScore(habits, '2026-08-29', pauses)
  assert.equal(s.required, 0, 'w przerwie nic nie jest wymagane')
  assert.equal(s.doneTotal, 1, 'ale zrobione nadal widać')
})

test('habitLifecycle: nawyk ze startem w przyszłości jest „zaplanowany"', () => {
  const today = '2026-09-01'
  assert.equal(habitLifecycle({ startDate: '2026-09-08' }, today), 'planned')
  assert.equal(habitLifecycle({ startDate: '2026-09-01' }, today), 'active')
  assert.equal(habitLifecycle({ startDate: '2026-08-01' }, today), 'active')
  assert.equal(habitLifecycle({}, today), 'active')
})

test('habitLifecycle: koniec i archiwum', () => {
  const today = '2026-09-01'
  assert.equal(habitLifecycle({ endDate: '2026-08-31' }, today), 'ended')
  assert.equal(habitLifecycle({ endDate: '2026-09-01' }, today), 'active')
  // Archiwum wygrywa z datami — inaczej zarchiwizowany nawyk gubiłby się w „zakończonych".
  assert.equal(habitLifecycle({ archived: true, startDate: '2026-09-08' }, today), 'archived')
  assert.equal(habitLifecycle({ archived: true, endDate: '2026-08-31' }, today), 'archived')
})
