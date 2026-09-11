import { test } from 'node:test'
import assert from 'node:assert/strict'
import { archiwalnaLista, archiwalneNotatki, odmianaNotatek, przeszukiwalneTeksty, zawartoscArchiwalna } from '../src/utils/prayerArchive.js'

// Prośba, przy której zapisywało się notatki przez pół roku, po archiwizacji
// pokazywała sam tytuł — dane były w bazie, ale widok ich nie czytał.
// Te testy pilnują, że archiwum wyciąga z dokumentu wszystko, co niesie.

const prosba = {
  title: 'O zdrowie taty',
  note: 'opis',
  endedNote: 'wyszedł ze szpitala',
  notes: [
    { id: 'a', text: 'rozmowa po badaniach', date: '2026-01-10' },
    { id: 'b', text: 'lepsze wyniki', date: '2026-03-02' },
  ],
}

test('notatki: od najnowszej', () => {
  assert.deepEqual(archiwalneNotatki(prosba).map(n => n.id), ['b', 'a'])
})

test('notatki: brak pola i puste wpisy nie wywracają archiwum', () => {
  assert.deepEqual(archiwalneNotatki({}), [])
  assert.deepEqual(archiwalneNotatki({ notes: null }), [])
  assert.deepEqual(archiwalneNotatki({ notes: [{ text: '   ' }, null, { text: 'realna' }] }).map(n => n.text), ['realna'])
})

test('notatki: starsze wpisy bez id i bez daty przechodzą, ale lądują na końcu', () => {
  const wynik = archiwalneNotatki({ notes: [
    { text: 'bez daty' },
    { id: 'x', text: 'z datą', date: '2026-02-01' },
  ] })
  assert.deepEqual(wynik.map(n => n.text), ['z datą', 'bez daty'])
  assert.equal(new Set(wynik.map(n => n.id)).size, 2, 'każda notatka musi mieć unikalny klucz do listy')
})

test('lista: punkty niosą stan odhaczenia z chwili archiwizacji', () => {
  const item = {
    noteMode: 'list',
    checklist: [{ id: '1', text: 'operacja' }, { id: '2', text: 'rehabilitacja' }],
    checklistDone: ['1'],
  }
  const lista = archiwalnaLista(item)
  assert.deepEqual(lista.punkty.map(p => p.zrobione), [true, false])
  assert.equal(lista.done, 1)
  assert.equal(lista.total, 2)
})

test('lista: prośba w trybie opisu nie ma listy', () => {
  assert.equal(archiwalnaLista({ noteMode: 'text', note: 'opis' }), null)
  assert.equal(archiwalnaLista({ noteMode: 'list', checklist: [] }), null)
})

test('zawartosc: opis pokazujemy tylko wtedy, gdy nie ma listy', () => {
  assert.equal(zawartoscArchiwalna({ note: 'opis' }).maOpis, true)
  assert.equal(zawartoscArchiwalna({
    note: 'stary opis', noteMode: 'list', checklist: [{ id: '1', text: 'punkt' }],
  }).maOpis, false)
})

test('zawartosc: prośba z samym tytułem nie ma czego pokazywać', () => {
  assert.equal(zawartoscArchiwalna({ title: 'sama' }).maCokolwiek, false)
  assert.equal(zawartoscArchiwalna(prosba).maCokolwiek, true)
})

test('szukanie obejmuje notatki, opis, punkty listy i notatkę końcową', () => {
  const teksty = przeszukiwalneTeksty(prosba)
  assert.ok(teksty.includes('lepsze wyniki'), 'notatka z dziennika')
  assert.ok(teksty.includes('wyszedł ze szpitala'), 'notatka końcowa')
  assert.ok(teksty.includes('opis'))

  const zListą = przeszukiwalneTeksty({
    title: 'x', noteMode: 'list', checklist: [{ id: '1', text: 'rehabilitacja' }],
  })
  assert.ok(zListą.includes('rehabilitacja'))
})

test('odmiana: 1 notatka, 2 notatki, 5 notatek, 12 notatek', () => {
  assert.equal(odmianaNotatek(1), 'notatka')
  assert.equal(odmianaNotatek(2), 'notatki')
  assert.equal(odmianaNotatek(5), 'notatek')
  assert.equal(odmianaNotatek(12), 'notatek')
  assert.equal(odmianaNotatek(22), 'notatki')
})
