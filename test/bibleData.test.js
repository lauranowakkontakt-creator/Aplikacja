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

test('księgi — unikalne id bez kropek, nazwy i dodatnie liczby rozdziałów', () => {
  const ids = BIBLE_BOOKS.map(b => b.id)
  assert.equal(new Set(ids).size, ids.length, 'id muszą być unikalne')
  for (const b of BIBLE_BOOKS) {
    assert.ok(b.name, `brak nazwy: ${b.id}`)
    // Firestore nie pozwala na kropki w kluczach mapy — id trafia do klucza postępu
    assert.ok(!b.id.includes('.'), `kropka w id: ${b.id}`)
    assert.ok(Number.isInteger(b.chapters) && b.chapters >= 1, `zła liczba rozdziałów: ${b.id}`)
  }
})

test('kolejność kanonu — Rodzaju pierwsza, Apokalipsa ostatnia, Psalmy 150', () => {
  assert.equal(BIBLE_BOOKS[0].id, 'rdz')
  assert.equal(BIBLE_BOOKS.at(-1).id, 'ap')
  assert.equal(BIBLE_BOOKS.find(b => b.id === 'ps').chapters, 150)
})

test('wyrywkowa liczba rozdziałów (Psalmy 150, Rodzaju 50, Apokalipsa 22)', () => {
  const by = Object.fromEntries(BIBLE_BOOKS.map(b => [b.id, b.chapters]))
  assert.equal(by.ps, 150)
  assert.equal(by.rdz, 50)
  assert.equal(by.ap, 22)
  assert.equal(by.jud, 1)
})

test('chapterKey — format klucza postępu i unikalność w całym kanonie', () => {
  assert.equal(chapterKey('rdz', 1), 'rdz_1')
  assert.equal(chapterKey('ap', 22), 'ap_22')
  const all = new Set()
  for (const b of BIBLE_BOOKS)
    for (let c = 1; c <= b.chapters; c++) all.add(chapterKey(b.id, c))
  assert.equal(all.size, TOTAL_CHAPTERS)
})
