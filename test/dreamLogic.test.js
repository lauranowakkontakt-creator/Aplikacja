import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DREAM_EMOTIONS, DREAM_CATEGORIES, SYMBOL_COLORS,
  getEmotion, getCategory, parseMentions, parseSymbols, dreamPeopleIds, nameStem,
} from '../src/utils/dreamLogic.js'

const people = [
  { id: 'p1', name: 'Kasia' },
  { id: 'p2', name: 'Przyjaciel Paweł' },
  { id: 'p3', name: 'Ola' },
]

test('parseMentions — znajduje osobę po @Imię', () => {
  assert.deepEqual(parseMentions('Śniła mi się @Kasia w domu', people), ['p1'])
})

test('parseMentions — imię wielowyrazowe (najdłuższe dopasowanie)', () => {
  assert.deepEqual(parseMentions('był tam @Przyjaciel Paweł', people), ['p2'])
})

test('parseMentions — granica słowa: @Kasiaziom nie pasuje do Kasia', () => {
  assert.deepEqual(parseMentions('@Kasiaziom', people), [])
})

test('parseMentions — pusty/brak tekstu', () => {
  assert.deepEqual(parseMentions('', people), [])
  assert.deepEqual(parseMentions('nic ciekawego', people), [])
})

test('parseMentions — wiele osób', () => {
  const r = parseMentions('@Kasia i @Ola', people)
  assert.equal(r.length, 2)
  assert.ok(r.includes('p1') && r.includes('p3'))
})

test('parseSymbols — znajduje #symbol', () => {
  const symbols = [{ id: 's1', name: 'drzewo' }, { id: 's2', name: 'dom' }]
  assert.deepEqual(parseSymbols('rosło #drzewo obok #dom', symbols), ['s1', 's2'])
})

test('parseSymbols — granica słowa', () => {
  const symbols = [{ id: 's1', name: 'dom' }]
  assert.deepEqual(parseSymbols('#domek', symbols), [])
})

test('dreamPeopleIds — suma uczestników i wspomnianych, bez duplikatów', () => {
  assert.deepEqual(dreamPeopleIds({ peopleIds: ['a', 'b'], mentionIds: ['b', 'c'] }), ['a', 'b', 'c'])
  assert.deepEqual(dreamPeopleIds({}), [])
})

test('nameStem — odmiana imion żeńskich', () => {
  assert.equal(nameStem('Kasia'), 'Kasi')
  assert.equal(nameStem('Ola'), 'Ol')
})

test('nameStem — imię zakończone spółgłoską bez zmian', () => {
  assert.equal(nameStem('Marek'), 'Marek')
})

test('nameStem — bardzo krótkie / puste', () => {
  assert.equal(nameStem('Ka'), 'Ka')
  assert.equal(nameStem(''), '')
  assert.equal(nameStem(undefined), '')
})

test('getCategory / getEmotion — trafienie i brak', () => {
  assert.equal(getCategory('koszmar').label, 'Koszmar')
  assert.equal(getEmotion('lek').label, 'Lęk')
  assert.equal(getCategory('nie-istnieje'), undefined)
})

test('stałe mają unikalne id i poprawne kolory hex', () => {
  for (const list of [DREAM_EMOTIONS, DREAM_CATEGORIES]) {
    const ids = list.map(x => x.id)
    assert.equal(new Set(ids).size, ids.length, 'id muszą być unikalne')
    for (const item of list) assert.match(item.color, /^#[0-9A-Fa-f]{6}$/)
  }
  for (const c of SYMBOL_COLORS) assert.match(c, /^#[0-9A-Fa-f]{6}$/)
})

// Strażnik wymagania: w kategoriach/emocjach snów NIE MA emotek
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u
test('kategorie i emocje snów nie zawierają emotek', () => {
  for (const item of [...DREAM_EMOTIONS, ...DREAM_CATEGORIES]) {
    assert.ok(!EMOJI.test(item.label + item.id), `emotka w: ${item.label}`)
  }
})
