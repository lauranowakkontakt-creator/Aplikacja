import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pathSummary, todoDayPath, remainingText } from '../src/utils/dayPath.js'

const TODAY = '2026-07-06'

// ---------- pathSummary ----------
test('pathSummary — pusta lista to zera', () => {
  assert.deepEqual(pathSummary([]), { doneCount: 0, total: 0, pct: 0 })
})

test('pathSummary — liczy zrobione i procent', () => {
  const s = pathSummary([{ done: true }, { done: false }, { done: true }, { done: false }])
  assert.equal(s.doneCount, 2)
  assert.equal(s.total, 4)
  assert.equal(s.pct, 50)
})

// ---------- todoDayPath ----------
test('todoDayPath — bierze zadania z terminem dziś', () => {
  const tasks = [
    { title: 'A', done: false, dueDate: TODAY, priority: 'low' },
    { title: 'B', done: true, dueDate: TODAY, priority: 'high' },
    { title: 'C', done: false, dueDate: '2026-07-10', priority: 'high' },
  ]
  const r = todoDayPath(tasks, TODAY)
  assert.equal(r.usingDue, true)
  assert.equal(r.total, 2)
  assert.deepEqual(r.steps.map(s => s.title), ['A', 'B']) // niezrobione przed zrobionymi
  assert.equal(r.doneCount, 1)
  assert.deepEqual(r.remaining, ['A'])
})

test('todoDayPath — sortuje niezrobione wg priorytetu, zrobione na koniec', () => {
  const tasks = [
    { title: 'low', done: false, dueDate: TODAY, priority: 'low' },
    { title: 'high', done: false, dueDate: TODAY, priority: 'high' },
    { title: 'done', done: true, dueDate: TODAY, priority: 'high' },
    { title: 'med', done: false, dueDate: TODAY, priority: 'medium' },
  ]
  const r = todoDayPath(tasks, TODAY)
  assert.deepEqual(r.steps.map(s => s.title), ['high', 'med', 'low', 'done'])
})

test('todoDayPath — bez zadań na dziś używa aktywnych (fallback)', () => {
  const tasks = [
    { title: 'X', done: false, dueDate: null, priority: 'medium' },
    { title: 'Y', done: true, dueDate: null, priority: 'high' },
  ]
  const r = todoDayPath(tasks, TODAY)
  assert.equal(r.usingDue, false)
  assert.deepEqual(r.steps.map(s => s.title), ['X']) // zrobione pominięte w fallbacku
  assert.equal(r.doneCount, 0)
})

test('todoDayPath — ogranicza liczbę stacji do max', () => {
  const tasks = Array.from({ length: 10 }, (_, i) => ({ title: `T${i}`, done: false, dueDate: TODAY, priority: 'low' }))
  const r = todoDayPath(tasks, TODAY, { max: 4 })
  assert.equal(r.total, 4)
  assert.equal(r.steps.length, 4)
})

// ---------- remainingText ----------
test('remainingText — pusta lista to pusty string', () => {
  assert.equal(remainingText([]), '')
})

test('remainingText — krótka lista wypisana wprost', () => {
  assert.equal(remainingText(['a', 'b', 'c']), 'a, b, c')
})

test('remainingText — długa lista skraca z licznikiem', () => {
  assert.equal(remainingText(['a', 'b', 'c', 'd'], { max: 3 }), 'a, b, c i 1 inne')
  assert.equal(remainingText(['a', 'b', 'c', 'd', 'e'], { max: 3 }), 'a, b, c i 2 innych')
})
