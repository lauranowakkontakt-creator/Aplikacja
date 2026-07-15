import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isPausedDay, isHabitDue, getStreak, getBestStreak, toggleStepDone, isChecklistComplete,
  PAUSE_REASONS, pauseReasonMeta, pauseForDay, byHabitOrder, eachDayStr, rangeStats } from '../src/utils/habitLogic.js'

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
