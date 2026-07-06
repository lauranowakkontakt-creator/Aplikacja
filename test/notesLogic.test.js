import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalize, parseTags, filterNotes, sortNotes, collectTags, preview } from '../src/utils/notesLogic.js'

test('normalize — małe litery i bez polskich znaków', () => {
  assert.equal(normalize('Święta Bożego Narodzenia'), 'swieta bozego narodzenia')
  assert.equal(normalize('ŁÓDŹ żółć'), 'lodz zolc')
  assert.equal(normalize(''), '')
  assert.equal(normalize(null), '')
})

test('parseTags — przecinki, #, duplikaty, puste', () => {
  assert.deepEqual(parseTags('dom, praca , #wiara'), ['dom', 'praca', 'wiara'])
  assert.deepEqual(parseTags('Dom, dom, DOM'), ['Dom'])
  assert.deepEqual(parseTags(' , ,, '), [])
  assert.deepEqual(parseTags(''), [])
})

test('filterNotes — szuka w tytule, treści i tagach bez diakrytyków', () => {
  const notes = [
    { id: 1, title: 'Zakupy na święta', content: 'kupić choinkę', tags: [] },
    { id: 2, title: 'Praca', content: 'spotkanie w środę', tags: ['wazne'] },
    { id: 3, title: 'Pomysły', content: '', tags: ['Święta'] },
  ]
  assert.deepEqual(filterNotes(notes, 'swieta').map(n => n.id), [1, 3])
  assert.deepEqual(filterNotes(notes, 'CHOINKE').map(n => n.id), [1])
  assert.deepEqual(filterNotes(notes, '', 'święta').map(n => n.id), [3])
  assert.deepEqual(filterNotes(notes, 'spotkanie', 'wazne').map(n => n.id), [2])
  assert.equal(filterNotes(notes, 'spotkanie', 'święta').length, 0)
  assert.equal(filterNotes(notes, '').length, 3)
})

test('sortNotes — przypięte najpierw, potem ostatnio edytowane', () => {
  const d = (day) => new Date(2026, 6, day)
  const notes = [
    { id: 'a', pinned: false, updatedAt: d(1) },
    { id: 'b', pinned: true,  updatedAt: d(1) },
    { id: 'c', pinned: false, updatedAt: d(3) },
    { id: 'd', pinned: true,  updatedAt: d(2) },
    { id: 'e', createdAt: d(4) }, // brak updatedAt — użyj createdAt
  ]
  assert.deepEqual(sortNotes(notes).map(n => n.id), ['d', 'b', 'e', 'c', 'a'])
})

test('sortNotes — akceptuje Firestore Timestamp (toMillis)', () => {
  const fsTs = (ms) => ({ toMillis: () => ms })
  const notes = [
    { id: 'old', updatedAt: fsTs(1000) },
    { id: 'new', updatedAt: fsTs(2000) },
  ]
  assert.deepEqual(sortNotes(notes).map(n => n.id), ['new', 'old'])
})

test('collectTags — unikalne wg liczby użyć, pierwsza pisownia wygrywa', () => {
  const notes = [
    { tags: ['Dom'] },
    { tags: ['praca', 'dom'] },
    { tags: ['dom', 'wiara'] },
  ]
  assert.deepEqual(collectTags(notes), ['Dom', 'praca', 'wiara'])
})

test('preview — skraca i skleja białe znaki', () => {
  assert.equal(preview('linia1\n\nlinia2   dalej'), 'linia1 linia2 dalej')
  const long = 'x'.repeat(200)
  assert.equal(preview(long).length, 161) // 160 + wielokropek
  assert.ok(preview(long).endsWith('…'))
  assert.equal(preview(''), '')
})
