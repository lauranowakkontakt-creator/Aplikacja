import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickBySeed, daySeed, neighbors } from '../src/utils/browsing.js'

const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }]

test('pickBySeed — ten sam seed zawsze ten sam wpis', () => {
  const first = pickBySeed(list, 42)
  assert.equal(pickBySeed(list, 42).id, first.id)
  assert.equal(pickBySeed(list, 42).id, first.id)
  assert.ok(list.includes(first))
})

test('pickBySeed — inny seed potrafi dać inny wpis', () => {
  const picks = new Set(Array.from({ length: 40 }, (_, i) => pickBySeed(list, i).id))
  assert.ok(picks.size > 1, 'wybór nie zmienia się mimo zmiany seeda')
})

test('pickBySeed — zawsze zwraca element z listy, nigdy undefined', () => {
  for (let i = 0; i < 200; i++) {
    assert.ok(list.includes(pickBySeed(list, i)), `seed ${i} wypadł poza listę`)
  }
  assert.ok(list.includes(pickBySeed(list, -7)))
  assert.ok(list.includes(pickBySeed(list, 1.9)))
})

test('pickBySeed — pusta lista i śmieci nie wywalają aplikacji', () => {
  assert.equal(pickBySeed([], 1), null)
  assert.equal(pickBySeed(null, 1), null)
  assert.equal(pickBySeed(undefined), null)
  assert.equal(pickBySeed([{ id: 'x' }], 999).id, 'x')
})

test('daySeed — inny dzień, inny seed; ten sam dzień, ten sam', () => {
  assert.equal(daySeed('2026-08-28'), daySeed('2026-08-28'))
  assert.notEqual(daySeed('2026-08-28'), daySeed('2026-08-29'))
  assert.equal(daySeed('bzdura'), 0)
})

test('neighbors — poprzedni i następny wpis', () => {
  const n = neighbors(list, 'c')
  assert.equal(n.index, 2)
  assert.equal(n.total, 5)
  assert.equal(n.prev.id, 'b')
  assert.equal(n.next.id, 'd')
})

test('neighbors — krańce listy nie mają sąsiada', () => {
  const first = neighbors(list, 'a')
  assert.equal(first.prev, null)
  assert.equal(first.next.id, 'b')
  const last = neighbors(list, 'e')
  assert.equal(last.prev.id, 'd')
  assert.equal(last.next, null)
})

test('neighbors — jeden wpis i wpis spoza listy', () => {
  assert.deepEqual(neighbors([{ id: 'x' }], 'x'), { index: 0, total: 1, prev: null, next: null })
  assert.deepEqual(neighbors(list, 'nie-ma'), { index: -1, total: 5, prev: null, next: null })
  assert.deepEqual(neighbors(null, 'a'), { index: -1, total: 0, prev: null, next: null })
})
