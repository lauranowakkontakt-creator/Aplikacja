import { test } from 'node:test'
import assert from 'node:assert/strict'

const {
  MAX_TAGS, NEGLECT_FILTERS, SORT_MODES, DEFAULT_FILTERS,
  parseTags, normalizeTags, toggleTag, tagsToText, collectTags, hasAnyTag,
  isTemporary, findNeglectFilter, neglectDays, matchesNeglect,
  filterIntentions, sortIntentions, groupByPerson,
  normalizeFilters, isDefaultFilters,
} = await import('../src/utils/prayerFilters.js')

const TERAZ = new Date('2026-09-03T12:00:00')
const DZIS = '2026-09-03'

// Skrót do budowania prośby — domyślnie codzienna, priorytet średni, nietknięta.
const p = (over = {}) => ({ id: over.id || Math.random().toString(36).slice(2), title: 'x', priority: 3, prayedDates: [], ...over })

test('normalizeTags — puste znikają, powtórki scalają się bez względu na wielkość liter', () => {
  assert.deepEqual(normalizeTags(['Zdrowie', ' praca ', '', '  ', 'ZDROWIE']), ['Zdrowie', 'praca'])
})

test('normalizeTags — limit tagów trzyma w ryzach', () => {
  const dużo = Array.from({ length: MAX_TAGS + 5 }, (_, i) => `t${i}`)
  assert.equal(normalizeTags(dużo).length, MAX_TAGS)
})

test('parseTags — przecinki i nowe linie, obie formy naraz', () => {
  assert.deepEqual(parseTags('Zdrowie, Praca\nRodzina'), ['Zdrowie', 'Praca', 'Rodzina'])
  assert.deepEqual(parseTags(''), [])
  assert.deepEqual(tagsToText(['Zdrowie', 'Praca']), 'Zdrowie, Praca')
})

test('toggleTag — dokłada i zdejmuje, ignorując wielkość liter', () => {
  assert.deepEqual(toggleTag(['Zdrowie'], 'Praca'), ['Zdrowie', 'Praca'])
  assert.deepEqual(toggleTag(['Zdrowie', 'Praca'], 'zdrowie'), ['Praca'])
})

test('collectTags — liczy wystąpienia, najczęstszy na górze', () => {
  const out = collectTags([
    p({ tags: ['Zdrowie', 'Praca'] }),
    p({ tags: ['zdrowie'] }),
    p({ tags: [] }),
    p({}),
  ])
  assert.deepEqual(out, [{ tag: 'Zdrowie', count: 2 }, { tag: 'Praca', count: 1 }])
})

test('hasAnyTag — brak wyboru przepuszcza wszystko, wybór działa jak „którykolwiek z”', () => {
  const item = p({ tags: ['Zdrowie'] })
  assert.equal(hasAnyTag(item, []), true)
  assert.equal(hasAnyTag(item, ['zdrowie']), true)
  assert.equal(hasAnyTag(item, ['Praca', 'Zdrowie']), true)
  assert.equal(hasAnyTag(item, ['Praca']), false)
  assert.equal(hasAnyTag(p({}), ['Praca']), false)
})

test('isTemporary — okno, data końca albo wydarzenie; codzienna prośba nie', () => {
  assert.equal(isTemporary(p({ scheduleFrom: '2026-09-01' })), true)
  assert.equal(isTemporary(p({ scheduleTo: '2026-09-10' })), true)
  assert.equal(isTemporary(p({ dateTo: '2026-09-10' })), true)
  assert.equal(isTemporary(p({ eventId: 'e1' })), true)
  assert.equal(isTemporary(p({})), false)
})

test('neglectDays — „nigdy” to nieskończenie dawno, nie zero', () => {
  assert.equal(neglectDays(p({}), TERAZ), Infinity)
  assert.equal(neglectDays(p({ prayedDates: [DZIS] }), TERAZ), 0)
  assert.equal(neglectDays(p({ prayedDates: ['2026-08-27', '2026-08-20'] }), TERAZ), 7)
})

test('matchesNeglect — próg łapie od podanej liczby dni w górę', () => {
  const tydzien = p({ prayedDates: ['2026-08-27'] })
  assert.equal(matchesNeglect(tydzien, 0, TERAZ), true)
  assert.equal(matchesNeglect(tydzien, 7, TERAZ), true)
  assert.equal(matchesNeglect(tydzien, 14, TERAZ), false)
  // Prośba, o którą nikt się nie modlił, musi wejść w każdy próg zaniedbania.
  assert.equal(matchesNeglect(p({}), 30, TERAZ), true)
})

test('NEGLECT_FILTERS / findNeglectFilter — progi rosną, nieznane id wpada na „Wszystkie”', () => {
  const dni = NEGLECT_FILTERS.map(f => f.minDays)
  assert.deepEqual(dni, [...dni].sort((a, b) => a - b))
  assert.equal(findNeglectFilter('nie-ma').id, 'all')
  assert.equal(findNeglectFilter('d14').minDays, 14)
})

test('filterIntentions — tag, zaniedbanie i osoba działają razem', () => {
  const items = [
    p({ id: 'a', tags: ['Zdrowie'], personId: 'os1', prayedDates: ['2026-08-20'] }),
    p({ id: 'b', tags: ['Zdrowie'], personId: 'os2', prayedDates: [DZIS] }),
    p({ id: 'c', tags: ['Praca'],   personId: 'os1' }),
  ]
  const ids = (f) => filterIntentions(items, f, TERAZ).map(i => i.id)
  assert.deepEqual(ids({ tags: ['Zdrowie'] }), ['a', 'b'])
  assert.deepEqual(ids({ tags: ['Zdrowie'], neglect: 'd7' }), ['a'])
  assert.deepEqual(ids({ personId: 'os1' }), ['a', 'c'])
  assert.deepEqual(ids({}), ['a', 'b', 'c'])
})

test('sortIntentions — chwilowe na górze, odhaczone dziś na dole', () => {
  const items = [
    p({ id: 'codzienna', priority: 4 }),
    p({ id: 'chwilowa', priority: 1, dateTo: '2026-09-10' }),
    p({ id: 'chwilowa-zrobiona', priority: 5, dateTo: '2026-09-10', prayedDates: [DZIS] }),
  ]
  const out = sortIntentions(items, { mode: 'smart', date: DZIS, teraz: TERAZ })
  assert.deepEqual(out.map(i => i.id), ['chwilowa', 'codzienna', 'chwilowa-zrobiona'])
})

test('sortIntentions — bez przypinania chwilowych decyduje sam tryb', () => {
  const items = [
    p({ id: 'chwilowa', priority: 1, dateTo: '2026-09-10' }),
    p({ id: 'codzienna', priority: 4 }),
  ]
  const out = sortIntentions(items, { mode: 'priority', date: DZIS, teraz: TERAZ, pinTemporary: false })
  assert.deepEqual(out.map(i => i.id), ['codzienna', 'chwilowa'])
})

test('sortIntentions — tryb „priorytet” schodzi po priorytecie, „domyślnie” wypycha P5', () => {
  const items = [p({ id: 'p2', priority: 2 }), p({ id: 'p5', priority: 5 }), p({ id: 'p4', priority: 4 })]
  assert.deepEqual(sortIntentions(items, { mode: 'priority', date: DZIS, teraz: TERAZ }).map(i => i.id), ['p5', 'p4', 'p2'])
  assert.deepEqual(sortIntentions(items, { mode: 'smart', date: DZIS, teraz: TERAZ }).map(i => i.id), ['p5', 'p4', 'p2'])
})

test('sortIntentions — tryb „najdawniej” ustawia nietknięte przed dawnymi', () => {
  const items = [
    p({ id: 'tydzien', priority: 5, prayedDates: ['2026-08-27'] }),
    p({ id: 'nigdy', priority: 1 }),
    p({ id: 'wczoraj', priority: 5, prayedDates: ['2026-09-02'] }),
  ]
  const out = sortIntentions(items, { mode: 'neglect', date: DZIS, teraz: TERAZ, pinTemporary: false })
  assert.deepEqual(out.map(i => i.id), ['nigdy', 'tydzien', 'wczoraj'])
})

test('sortIntentions — nie rusza tablicy wejściowej', () => {
  const items = [p({ id: 'a', priority: 1 }), p({ id: 'b', priority: 5 })]
  sortIntentions(items, { date: DZIS, teraz: TERAZ })
  assert.deepEqual(items.map(i => i.id), ['a', 'b'])
})

test('groupByPerson — prośby jednej osoby razem, potem następna', () => {
  const people = [{ id: 'os1', name: 'Ania' }, { id: 'os2', name: 'Basia' }]
  const items = [
    p({ id: 'a1', personId: 'os1', prayedDates: ['2026-09-02'] }),
    p({ id: 'b1', personId: 'os2', prayedDates: ['2026-08-20'] }),
    p({ id: 'a2', personId: 'os1', priority: 5, prayedDates: ['2026-09-02'] }),
  ]
  const g = groupByPerson(items, people, { date: DZIS, teraz: TERAZ })
  // Basia niemodlona od 14 dni idzie przed Anię sprzed jednego dnia.
  assert.deepEqual(g.map(x => x.label), ['Basia', 'Ania'])
  assert.deepEqual(g[1].items.map(i => i.id), ['a2', 'a1'])
})

test('groupByPerson — osoba odhaczona w całości spada na koniec', () => {
  const people = [{ id: 'os1', name: 'Ania' }, { id: 'os2', name: 'Basia' }]
  const items = [
    p({ id: 'a1', personId: 'os1', prayedDates: [DZIS] }),
    p({ id: 'b1', personId: 'os2', prayedDates: ['2026-09-02'] }),
  ]
  const g = groupByPerson(items, people, { date: DZIS, teraz: TERAZ })
  assert.deepEqual(g.map(x => x.label), ['Basia', 'Ania'])
  assert.equal(g[1].done, true)
})

test('groupByPerson — osoba z czymś chwilowym wychodzi na górę', () => {
  const people = [{ id: 'os1', name: 'Ania' }, { id: 'os2', name: 'Basia' }]
  const items = [
    p({ id: 'a1', personId: 'os1', dateTo: '2026-09-10' }),
    p({ id: 'b1', personId: 'os2', prayedDates: ['2026-01-01'] }),
  ]
  const g = groupByPerson(items, people, { date: DZIS, teraz: TERAZ })
  assert.deepEqual(g.map(x => x.label), ['Ania', 'Basia'])
})

test('groupByPerson — prośba bez osoby dostaje własną grupę, nie wypada', () => {
  const items = [p({ id: 'x', personId: null, prayedDates: ['2026-09-02'] })]
  const g = groupByPerson(items, [], { date: DZIS, teraz: TERAZ })
  assert.equal(g.length, 1)
  assert.equal(g[0].label, 'Bez osoby')
  assert.equal(g[0].person, null)
})

test('groupByPerson — osoba bez próśb po filtrach w ogóle się nie pokazuje', () => {
  const people = [{ id: 'os1', name: 'Ania' }, { id: 'os2', name: 'Basia' }]
  const g = groupByPerson([p({ id: 'a1', personId: 'os1' })], people, { date: DZIS, teraz: TERAZ })
  assert.deepEqual(g.map(x => x.label), ['Ania'])
})

test('normalizeFilters — śmieci z pamięci dają komplet znanych wartości', () => {
  assert.deepEqual(normalizeFilters(null), DEFAULT_FILTERS)
  assert.deepEqual(normalizeFilters({ tags: 'nie-tablica', neglect: 'xx', sort: 'xx' }), DEFAULT_FILTERS)
  assert.deepEqual(normalizeFilters({ tags: ['Zdrowie', 'zdrowie'], neglect: 'd7', sort: 'person', pinTemporary: false }),
    { tags: ['Zdrowie'], neglect: 'd7', sort: 'person', pinTemporary: false })
})

test('isDefaultFilters — rozpoznaje stan wyjściowy i każdą zmianę', () => {
  assert.equal(isDefaultFilters(DEFAULT_FILTERS), true)
  assert.equal(isDefaultFilters({ ...DEFAULT_FILTERS, tags: ['Zdrowie'] }), false)
  assert.equal(isDefaultFilters({ ...DEFAULT_FILTERS, neglect: 'd7' }), false)
  assert.equal(isDefaultFilters({ ...DEFAULT_FILTERS, sort: 'person' }), false)
  assert.equal(isDefaultFilters({ ...DEFAULT_FILTERS, pinTemporary: false }), false)
})

test('SORT_MODES — unikalne id, komplet etykiet', () => {
  const ids = SORT_MODES.map(m => m.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const m of SORT_MODES) assert.ok(m.label)
})
