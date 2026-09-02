import { test } from 'node:test'
import assert from 'node:assert/strict'

const {
  PRIORITY_CFG, NEGLECT_LEVELS, PERSON_COLORS,
  findPrio, getNeglect, daysSince, podsumowanieOkresu, statystykiOsob,
} = await import('../src/utils/prayerStats.js')

const TERAZ = new Date('2026-09-03T12:00:00')

test('PRIORITY_CFG — unikalne wartości, komplet pól', () => {
  const v = PRIORITY_CFG.map(p => p.v)
  assert.equal(new Set(v).size, v.length)
  for (const p of PRIORITY_CFG) assert.ok(p.label && p.color)
})

test('findPrio — nieznany priorytet wpada na średni, nie na undefined', () => {
  assert.equal(findPrio(5).label, 'Pilna')
  assert.equal(findPrio(1).label, 'Mała')
  assert.equal(findPrio(undefined).label, 'Średnia')
  assert.equal(findPrio(99).label, 'Średnia')
})

test('NEGLECT_LEVELS — progi stykają się bez dziur', () => {
  // Dziura między przedziałami oznaczałaby dzień, dla którego getNeglect
  // wpada w wariant awaryjny i pokazuje „zapomniana" bez powodu.
  for (let i = 1; i < NEGLECT_LEVELS.length; i++) {
    assert.equal(NEGLECT_LEVELS[i].min, NEGLECT_LEVELS[i - 1].max + 1,
      `dziura między poziomem ${i} a ${i + 1}`)
  }
})

test('getNeglect — każdy dzień z zakresu ma poziom', () => {
  assert.equal(getNeglect(0).level, 1)
  assert.equal(getNeglect(2).level, 1)
  assert.equal(getNeglect(3).level, 2)
  assert.equal(getNeglect(13).level, 3)
  assert.equal(getNeglect(14).level, 4)
  assert.equal(getNeglect(30).level, 5)
  assert.equal(getNeglect(5000).level, 5)
})

test('getNeglect — „nigdy" to osobny przypadek, nie zero dni', () => {
  assert.equal(getNeglect(null).label, 'nigdy')
  assert.equal(getNeglect(undefined).label, 'nigdy')
  assert.equal(getNeglect(0).label, 'niedawno')
})

test('daysSince — liczy od NAJNOWSZEJ daty, niezależnie od kolejności', () => {
  assert.equal(daysSince(['2026-09-01', '2026-08-01'], TERAZ), 2)
  assert.equal(daysSince(['2026-08-01', '2026-09-01'], TERAZ), 2)
  assert.equal(daysSince(['2026-09-03'], TERAZ), 0)
})

test('daysSince — brak dat daje null, nie zero', () => {
  // Zero znaczyłoby „modlono się dzisiaj" — dokładnie odwrotnie niż prawda.
  assert.equal(daysSince([], TERAZ), null)
  assert.equal(daysSince(null, TERAZ), null)
  assert.equal(daysSince(undefined, TERAZ), null)
})

const INTENCJE = [
  { id: 'a', personId: 'ola',  status: 'active', prayedDates: ['2026-09-01', '2026-09-02'] },
  { id: 'b', personId: 'ola',  status: 'active', prayedDates: ['2026-09-02'] },
  { id: 'c', personId: 'jan',  status: 'ended',  prayedDates: ['2026-08-15'] },
  { id: 'd', personId: 'jan',  prayedDates: [] },              // brak status = aktywna
  { id: 'e', personId: 'zosia', status: 'active' },            // brak prayedDates
]

test('podsumowanieOkresu — dni modlitwy liczy unikalne daty, modlitwy wszystkie wpisy', () => {
  // 2026-09: daty to 09-01, 09-02, 09-02 → 2 dni, 3 modlitwy
  const [dni, modlitw, osoby, aktywne] = podsumowanieOkresu(INTENCJE, '2026-09')
  assert.equal(dni.value, 2)
  assert.equal(modlitw.value, 3)
  assert.equal(osoby.value, 1)       // tylko Ola
  assert.equal(aktywne.value, 4)     // a, b, d (brak status), e
})

test('podsumowanieOkresu — prefiks roku obejmuje wszystkie miesiące', () => {
  const [dni, modlitw, osoby] = podsumowanieOkresu(INTENCJE, '2026')
  assert.equal(dni.value, 3)         // 09-01, 09-02, 08-15
  assert.equal(modlitw.value, 4)
  assert.equal(osoby.value, 2)       // Ola i Jan
})

test('podsumowanieOkresu — okres bez modlitw daje zera, nie wywala się', () => {
  const [dni, modlitw, osoby] = podsumowanieOkresu(INTENCJE, '2025')
  assert.equal(dni.value, 0)
  assert.equal(modlitw.value, 0)
  assert.equal(osoby.value, 0)
})

test('podsumowanieOkresu — pusta lista intencji', () => {
  const wynik = podsumowanieOkresu([], '2026-09')
  assert.deepEqual(wynik.map(w => w.value), [0, 0, 0, 0])
})

const OSOBY = [{ id: 'ola' }, { id: 'jan' }, { id: 'zosia' }]

test('statystykiOsob — sumuje modlitwy i intencje per osoba', () => {
  const s = statystykiOsob(OSOBY, INTENCJE, '2026-09-03', TERAZ)
  const ola = s.find(p => p.id === 'ola')
  assert.equal(ola.totalPrays, 3)
  assert.equal(ola.totalIntentions, 2)
  assert.equal(ola.activeCount, 2)

  const jan = s.find(p => p.id === 'jan')
  assert.equal(jan.totalPrays, 1)
  assert.equal(jan.activeCount, 1)   // 'd' bez pola status liczy się jako aktywna
})

test('statystykiOsob — najbardziej zaniedbani na górze', () => {
  // Zosia: nigdy (null → 999), Jan: 2026-08-15, Ola: 2026-09-02.
  const s = statystykiOsob(OSOBY, INTENCJE, '2026-09-03', TERAZ)
  assert.deepEqual(s.map(p => p.id), ['zosia', 'jan', 'ola'])
})

test('statystykiOsob — odhaczeni dzisiaj spadają na dół', () => {
  // Lista ma podpowiadać, za kogo modlić się TERAZ — nie chwalić za zrobione.
  const dzis = '2026-09-03'
  const intencje = [
    { id: 'x', personId: 'ola', prayedDates: [dzis] },
    { id: 'y', personId: 'jan', prayedDates: ['2026-09-02'] },
  ]
  const s = statystykiOsob([{ id: 'ola' }, { id: 'jan' }], intencje, dzis, TERAZ)
  assert.deepEqual(s.map(p => p.id), ['jan', 'ola'])
  assert.equal(s.find(p => p.id === 'ola').prayedToday, true)
})

test('statystykiOsob — osoba bez żadnej intencji nie znika z listy', () => {
  const s = statystykiOsob([{ id: 'nowa' }], [], '2026-09-03', TERAZ)
  assert.equal(s.length, 1)
  assert.equal(s[0].totalPrays, 0)
  assert.equal(s[0].days, null)
  assert.equal(s[0].prayedToday, false)
})

test('PERSON_COLORS — unikalne, wspólne z Kalendarzem', () => {
  assert.equal(new Set(PERSON_COLORS).size, PERSON_COLORS.length)
  assert.ok(PERSON_COLORS.length >= 12)
})
