import { test } from 'node:test'
import assert from 'node:assert/strict'
import { byAccountOrder } from '../src/utils/accountOrder.js'

test('sortuje wg pola order rosnąco', () => {
  const a = { id: 'a', order: 2 }
  const b = { id: 'b', order: 0 }
  const c = { id: 'c', order: 1 }
  const sorted = [a, b, c].sort(byAccountOrder).map(x => x.id)
  assert.deepEqual(sorted, ['b', 'c', 'a'])
})

test('konta bez order trafiają na koniec, wg createdAt', () => {
  const withOrder = { id: 'first', order: 0 }
  const older     = { id: 'older', createdAt: { seconds: 100 } }
  const newer     = { id: 'newer', createdAt: { seconds: 200 } }
  const sorted = [newer, older, withOrder].sort(byAccountOrder).map(x => x.id)
  assert.deepEqual(sorted, ['first', 'older', 'newer'])
})

test('stabilne przy równym order — decyduje createdAt', () => {
  const a = { id: 'a', order: 1, createdAt: { seconds: 50 } }
  const b = { id: 'b', order: 1, createdAt: { seconds: 10 } }
  const sorted = [a, b].sort(byAccountOrder).map(x => x.id)
  assert.deepEqual(sorted, ['b', 'a'])
})
