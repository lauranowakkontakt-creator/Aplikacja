import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isPausedDay, isHabitDue, getStreak, getBestStreak } from '../src/utils/habitLogic.js'

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
