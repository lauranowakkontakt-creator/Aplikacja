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
    assert.ok(!b.id.includes('.'), `kropka w id: ${b.id}`)
    assert.ok(Number.isInteger(b.chapters) && b.chapters >= 1, `zła liczba rozdziałów: ${b.id}`)
  }
})

test('kolejność kanonu — Rodzaju pierwsza, Apokalipsa ostatnia, Psalmy 150', () => {
  assert.equal(BIBLE_BOOKS[0].id, 'rdz')
  assert.equal(BIBLE_BOOKS.at(-1).id, 'ap')
  assert.equal(BIBLE_BOOKS.find(b => b.id === 'ps').chapters, 150)
})

test('chapterKey — klucz postępu w formacie id_rozdział', () => {
  assert.equal(chapterKey('rdz', 1), 'rdz_1')
  assert.equal(chapterKey('ap', 22), 'ap_22')
})
