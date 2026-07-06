import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BIBLE_BOOKS, TOTAL_CHAPTERS, chapterKey } from '../src/utils/bibleData.js'

test('kanon — 66 ksiąg: 39 ST + 27 NT', () => {
  assert.equal(BIBLE_BOOKS.length, 66)
  assert.equal(BIBLE_BOOKS.filter(b => b.testament === 'ST').length, 39)
  assert.equal(BIBLE_BOOKS.filter(b => b.testament === 'NT').length, 27)
})

test('kanon — łącznie 1189 rozdziałów', () => {
  assert.equal(TOTAL_CHAPTERS, 1189)
})

test('księgi — unikalne id bez kropek, dodatnia liczba rozdziałów', () => {
  const ids = BIBLE_BOOKS.map(b => b.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const b of BIBLE_BOOKS) {
    assert.ok(b.name)
    assert.ok(Number.isInteger(b.chapters) && b.chapters > 0)
    // Firestore nie pozwala na kropki w kluczach mapy — id trafia do klucza postępu
    assert.doesNotMatch(b.id, /[.\s]/)
  }
})

test('wyrywkowa liczba rozdziałów (Psalmy 150, Rodzaju 50, Apokalipsa 22)', () => {
  const by = Object.fromEntries(BIBLE_BOOKS.map(b => [b.id, b.chapters]))
  assert.equal(by.ps, 150)
  assert.equal(by.rdz, 50)
  assert.equal(by.ap, 22)
  assert.equal(by.jud, 1)
})

test('chapterKey — format klucza postępu i unikalność w całym kanonie', () => {
  assert.equal(chapterKey('rdz', 3), 'rdz_3')
  const all = new Set()
  for (const b of BIBLE_BOOKS)
    for (let c = 1; c <= b.chapters; c++) all.add(chapterKey(b.id, c))
  assert.equal(all.size, TOTAL_CHAPTERS)
})
