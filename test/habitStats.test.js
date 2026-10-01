import { test } from 'node:test'
import assert from 'node:assert/strict'

const { ymd, statRange, statBuckets, dayAggregate, getPauseIcon, getPauseColor, habitPeriodLabel,
  optionalRange, optionalBuckets, habitSpan, timelineLanes, timelineTicks } =
  await import('../src/utils/habitStats.js')
const { rangeStats, isRequiredHabit } = await import('../src/utils/habitLogic.js')

const D = (s) => new Date(`${s}T12:00:00`)

test('ymd formatuje datę lokalnie jako yyyy-MM-dd', () => {
  assert.equal(ymd(D('2026-09-03')), '2026-09-03')
  assert.equal(ymd(D('2026-01-05')), '2026-01-05')
})

test('statRange — tydzień liczy się od poniedziałku do niedzieli', () => {
  // 2026-09-03 to czwartek; tydzień musi objąć pon 31.08 – nd 06.09.
  const r = statRange('week', { weekAnchor: D('2026-09-03') })
  assert.deepEqual(r, { start: '2026-08-31', end: '2026-09-06' })
})

test('statRange — tydzień zaczepiony w niedzielę nie ucieka do przodu', () => {
  // Klasyczna pułapka: domyślny startOfWeek to niedziela, więc bez
  // weekStartsOn: 1 niedziela zaczynałaby NOWY tydzień zamiast kończyć stary.
  const r = statRange('week', { weekAnchor: D('2026-09-06') })
  assert.deepEqual(r, { start: '2026-08-31', end: '2026-09-06' })
})

test('statRange — miesiąc obejmuje pierwszy i ostatni dzień', () => {
  assert.deepEqual(statRange('month', { monthAnchor: D('2026-02-15') }),
    { start: '2026-02-01', end: '2026-02-28' })
  assert.deepEqual(statRange('month', { monthAnchor: D('2024-02-15') }),
    { start: '2024-02-01', end: '2024-02-29' })  // rok przestępny
})

test('statRange — rok', () => {
  assert.deepEqual(statRange('year', { year: 2026 }),
    { start: '2026-01-01', end: '2026-12-31' })
})

// Nawyk codzienny bez pauz — najprostszy przypadek do liczenia procentów.
const NAWYK = [{ id: 'h1', name: 'Woda', frequency: 'daily', createdAt: null,
                 doneDates: ['2026-08-31', '2026-09-01'] }]

test('statBuckets — tydzień daje siedem słupków z etykietami dni', () => {
  const b = statBuckets(NAWYK, [], 'week', { weekAnchor: D('2026-09-03') }, [], D('2026-09-03'))
  assert.equal(b.length, 7)
  assert.equal(b.filter(x => x.active).length, 1, 'dokładnie jeden słupek to dziś')
})

test('statBuckets — przyszłe dni mają zero, nie liczą się jako niezrobione', () => {
  // Bez tego reszta tygodnia od razu po poniedziałku ciągnęłaby wynik w dół,
  // choć te dni jeszcze nie nadeszły.
  const b = statBuckets(NAWYK, [], 'week', { weekAnchor: D('2026-09-03') }, [], D('2026-09-03'))
  // czwartek = indeks 3; piątek, sobota, niedziela to przyszłość
  for (const przyszly of b.slice(4)) assert.equal(przyszly.value, 0)
})

test('statBuckets — miesiąc dzieli się na tygodnie T1..Tn', () => {
  const b = statBuckets(NAWYK, [], 'month', { monthAnchor: D('2026-09-15') }, [], D('2026-09-30'))
  assert.equal(b[0].label, 'T1')
  assert.ok(b.length >= 4 && b.length <= 5)
})

test('statBuckets — rok daje słupek na każdy rok z danymi', () => {
  const b = statBuckets(NAWYK, [], 'year', { year: 2026 }, [2024, 2025, 2026], D('2026-09-03'))
  assert.deepEqual(b.map(x => x.label), ['2024', '2025', '2026'])
  assert.deepEqual(b.map(x => x.active), [false, false, true])
})

test('statBuckets — brak lat z danymi daje pustą listę, nie wywala się', () => {
  assert.deepEqual(statBuckets(NAWYK, [], 'year', { year: 2026 }, [], D('2026-09-03')), [])
})

test('dayAggregate — zwraca cel, wykonane i ułamek', () => {
  const a = dayAggregate(NAWYK, [], '2026-09-01')
  assert.ok(typeof a.due === 'number')
  assert.ok(typeof a.done === 'number')
  assert.ok(a.pct >= 0 && a.pct <= 1, 'ułamek musi mieścić się w 0..1')
  assert.equal(a.paused, false)
})

test('dayAggregate — dzień pauzy jest oznaczony', () => {
  const pauzy = [{ from: '2026-09-10', to: '2026-09-12', reason: 'wyjazd' }]
  assert.equal(dayAggregate(NAWYK, pauzy, '2026-09-11').paused, true)
  assert.equal(dayAggregate(NAWYK, pauzy, '2026-09-13').paused, false)
})

test('getPauseIcon i getPauseColor — null poza pauzą', () => {
  const pauzy = [{ from: '2026-09-10', to: '2026-09-12', reason: 'choroba', reasonIcon: 'pill' }]
  assert.equal(getPauseIcon(pauzy, '2026-09-11'), 'pill')
  assert.equal(getPauseIcon(pauzy, '2026-09-20'), null)
  assert.ok(getPauseColor(pauzy, '2026-09-11'))
  assert.equal(getPauseColor(pauzy, '2026-09-20'), null)
})

test('getPauseIcon — pauza bez ikony daje null, nie undefined', () => {
  const pauzy = [{ from: '2026-09-10', to: '2026-09-12', reason: 'wyjazd' }]
  assert.equal(getPauseIcon(pauzy, '2026-09-11'), null)
})

// Okres w archiwum: stary nawyk bez daty końca pokazywał tylko licznik odhaczeń,
// więc nie było widać, z jakich to w ogóle lat.
test('habitPeriodLabel: jeden miesiąc nie powtarza się dwa razy', () => {
  assert.equal(habitPeriodLabel('2026-08-02', '2026-08-29'), 'sie 2026')
})

test('habitPeriodLabel: ten sam rok podaje rok raz, na końcu', () => {
  assert.equal(habitPeriodLabel('2026-03-04', '2026-07-30'), 'mar – lip 2026')
})

test('habitPeriodLabel: przez przełom roku widać oba lata', () => {
  assert.equal(habitPeriodLabel('2025-08-11', '2026-08-03'), 'sie 2025 – sie 2026')
  // Ten sam miesiąc, ale inny rok — skrót do „sie 2026" zgubiłby cały rok.
  assert.notEqual(habitPeriodLabel('2025-08-11', '2026-08-03'), 'sie 2025')
})

test('habitPeriodLabel: bez granic nie ma czego pokazać', () => {
  assert.equal(habitPeriodLabel(null, '2026-08-03'), null)
  assert.equal(habitPeriodLabel('2026-08-03', null), null)
  assert.equal(habitPeriodLabel(null, null), null)
  assert.equal(habitPeriodLabel('bzdura', '2026-08-03'), null)
})

test('habitPeriodLabel: jeden dzień to po prostu jego miesiąc', () => {
  assert.equal(habitPeriodLabel('2026-08-03', '2026-08-03'), 'sie 2026')
})

// ---------- wyzwania nie psuja glownych procentow ----------
// Regresja: dayScore pomijal nawyki dodatkowe w mianowniku, ale statBuckets
// podawal rangeStats WSZYSTKIE nawyki. Cel dnia pokazywal 100%, a slupek tego
// samego dnia 50%, bo nieodhaczone wyzwanie wchodzilo do "expected".
const every = [0, 1, 2, 3, 4, 5, 6]

test('statBuckets: nieodhaczone wyzwanie nie zaniza slupka', () => {
  const dzien = '2026-09-02'
  const habits = [
    { frequencyDays: every, startDate: '2026-09-01', completedDates: [dzien] },
    { frequencyDays: every, startDate: '2026-09-01', optional: true, completedDates: [] },
  ]
  const ctx = { weekAnchor: D(dzien), monthAnchor: D(dzien), year: 2026 }
  const buckets = statBuckets(habits, [], 'week', ctx, [2026], D(dzien))
  const srodaBucket = buckets.find(b => b.active)
  assert.equal(srodaBucket.value, 100, 'wymagany nawyk zrobiony => pelne 100%')
})

test('statBuckets: wyzwanie odhaczone tez nie rusza slupka', () => {
  // Wyzwanie jest poza rachunkiem w obie strony — nie karze i nie nagradza.
  const dzien = '2026-09-02'
  const bez = [{ frequencyDays: every, startDate: '2026-09-01', completedDates: [] }]
  const zWyzwaniem = [
    ...bez,
    { frequencyDays: every, startDate: '2026-09-01', optional: true, completedDates: [dzien] },
  ]
  const ctx = { weekAnchor: D(dzien), monthAnchor: D(dzien), year: 2026 }
  const val = (h) => statBuckets(h, [], 'week', ctx, [2026], D(dzien)).find(b => b.active).value
  assert.equal(val(zWyzwaniem), val(bez))
  assert.equal(val(bez), 0)
})

test('rangeStats liczy to, co mu dano — filtrowanie nalezy do wywolujacego', () => {
  // Swiadomy podzial odpowiedzialnosci: rangeStats sluzy tez do procentu
  // POJEDYNCZEGO nawyku (takze wyzwania), wiec sam nie moze nic odsiewac.
  const habits = [
    { frequencyDays: every, startDate: '2026-09-01', completedDates: ['2026-09-01'] },
    { frequencyDays: every, startDate: '2026-09-01', optional: true, completedDates: [] },
  ]
  assert.equal(rangeStats(habits, [], '2026-09-01', '2026-09-01').pct, 50)
  assert.equal(rangeStats(habits.filter(isRequiredHabit), [], '2026-09-01', '2026-09-01').pct, 100)
})

// ---------- ekran Wyzwan: zakresy i wykres ----------
// Zakres liczymy od WYBRANEGO dnia, bo ekran ma nawigator dni: cofniecie sie
// do wrzesnia ma pokazac wrzesien, nie biezacy miesiac.

test('optionalRange: tydzien idzie od poniedzialku do niedzieli', () => {
  // 2026-09-02 to sroda.
  assert.deepEqual(optionalRange('week', '2026-09-02'),
    { start: '2026-08-31', end: '2026-09-06' })
})

test('optionalRange: miesiac i rok obejmuja caly okres wybranego dnia', () => {
  assert.deepEqual(optionalRange('month', '2026-09-17'), { start: '2026-09-01', end: '2026-09-30' })
  assert.deepEqual(optionalRange('year', '2026-09-17'), { start: '2026-01-01', end: '2026-12-31' })
  // Luty 2028 jest przestepny — koniec miesiaca nie moze byc na sztywno 28.
  assert.deepEqual(optionalRange('month', '2028-02-10'), { start: '2028-02-01', end: '2028-02-29' })
})

test('optionalBuckets: wartoscia jest LICZBA zaliczen, nie procent', () => {
  // Wyzwanie nie ma planu, wiec nie ma z czego liczyc procentu.
  const habits = [
    { completedDates: ['2026-09-02', '2026-09-02'] },   // ten sam dzien dwa razy w danych
    { completedDates: ['2026-09-02', '2026-09-04'] },
  ]
  const b = optionalBuckets(habits, 'week', '2026-09-02')
  const sroda = b.find(x => x.active)
  assert.equal(sroda.label.length > 0, true)
  assert.equal(sroda.value, 3, 'trzy zaliczenia w srode')
  assert.equal(b.reduce((s, x) => s + x.value, 0), 4, 'caly tydzien to cztery zaliczenia')
})

test('optionalBuckets: tydzien ma 7 slupkow, rok 12', () => {
  assert.equal(optionalBuckets([], 'week', '2026-09-02').length, 7)
  assert.equal(optionalBuckets([], 'year', '2026-09-02').length, 12)
  // Miesiac dzielimy na tygodnie T1..T5 — wrzesien 2026 ma 30 dni.
  assert.equal(optionalBuckets([], 'month', '2026-09-02').length, 5)
})

test('optionalBuckets: rok zlicza po miesiacach i zaznacza wybrany', () => {
  const habits = [{ completedDates: ['2026-03-01', '2026-03-20', '2026-09-05'] }]
  const b = optionalBuckets(habits, 'year', '2026-09-17')
  assert.equal(b[2].value, 2, 'marzec')
  assert.equal(b[8].value, 1, 'wrzesien')
  assert.equal(b[8].active, true, 'wybrany dzien zaznacza swoj miesiac')
  assert.equal(b.filter(x => x.active).length, 1)
})

test('optionalBuckets: dane z innego roku nie wchodza do slupkow', () => {
  const habits = [{ completedDates: ['2025-09-05', '2026-09-05'] }]
  const b = optionalBuckets(habits, 'year', '2026-09-17')
  assert.equal(b[8].value, 1)
})

test('optionalBuckets: pusta lista daje same zera, bez NaN', () => {
  for (const okres of ['week', 'month', 'year']) {
    for (const b of optionalBuckets([], okres, '2026-09-02')) {
      assert.equal(b.value, 0)
      assert.ok(Number.isFinite(b.value))
    }
  }
})

// ---------- os czasu archiwum ----------

test('habitSpan: granice bierze z odhaczen, nie z planu', () => {
  // Pokazujemy, kiedy nawyk NAPRAWDE byl robiony, nie kiedy byl zaplanowany.
  const h = { startDate: '2026-01-01', endDate: '2026-12-31', completedDates: ['2026-05-10', '2026-03-02'] }
  assert.deepEqual(habitSpan(h), { from: '2026-03-02', to: '2026-05-10' })
})

test('habitSpan: bez odhaczen spada na startDate/endDate', () => {
  assert.deepEqual(habitSpan({ startDate: '2026-01-01', endDate: '2026-02-01' }),
    { from: '2026-01-01', to: '2026-02-01' })
  // Sam startDate — nawyk, ktorego nigdy nie odhaczono: punkt, nie przedzial.
  assert.deepEqual(habitSpan({ startDate: '2026-01-01' }), { from: '2026-01-01', to: '2026-01-01' })
  assert.equal(habitSpan({}), null)
  assert.equal(habitSpan(undefined), null)
})

test('timelineLanes: wspolna skala od najstarszego do najnowszego dnia', () => {
  const habits = [
    { id: 'a', name: 'A', completedDates: ['2026-01-01', '2026-01-31'] },
    { id: 'b', name: 'B', completedDates: ['2026-02-01', '2026-03-02'] },
  ]
  const t = timelineLanes(habits)
  assert.equal(t.from, '2026-01-01')
  assert.equal(t.to, '2026-03-02')
  // Pierwszy pas startuje na zerze, drugi za nim.
  assert.equal(t.lanes[0].leftPct, 0)
  assert.ok(t.lanes[1].leftPct > t.lanes[0].widthPct - 1)
  // Zaden pas nie wychodzi za prawa krawedz.
  for (const l of t.lanes) assert.ok(l.leftPct + l.widthPct <= 100.001, `${l.id} wyjechal za os`)
})

test('timelineLanes: krotki nawyk dostaje minimalna szerokosc', () => {
  // Jeden dzien na osi dwoch lat to 0,1% — pas byłby niewidoczny.
  const habits = [
    { id: 'dlugi', name: 'D', completedDates: ['2025-01-01', '2026-12-31'] },
    { id: 'krotki', name: 'K', completedDates: ['2026-06-15'] },
  ]
  const t = timelineLanes(habits, { minWidthPct: 2 })
  const krotki = t.lanes.find(l => l.id === 'krotki')
  assert.equal(krotki.widthPct, 2)
  assert.ok(krotki.leftPct + krotki.widthPct <= 100.001)
})

test('timelineLanes: najdluzszy nawyk wskazany, remis rozstrzygany stabilnie', () => {
  const habits = [
    { id: 'a', name: 'A', completedDates: ['2026-01-01', '2026-06-01'] },
    { id: 'b', name: 'B', completedDates: ['2026-01-01', '2026-03-01'] },
  ]
  assert.equal(timelineLanes(habits).longest.id, 'a')
  // Ten sam czas trwania — wygrywa ten z wieksza liczba odhaczen.
  const remis = [
    { id: 'x', name: 'X', completedDates: ['2026-01-01', '2026-02-01'] },
    { id: 'y', name: 'Y', completedDates: ['2026-01-01', '2026-01-15', '2026-02-01'] },
  ]
  assert.equal(timelineLanes(remis).longest.id, 'y')
})

test('timelineLanes: nawyki bez historii sa pomijane, pusto nie wybucha', () => {
  const t = timelineLanes([{ id: 'a', name: 'A' }, { id: 'b', name: 'B', completedDates: ['2026-01-01'] }])
  assert.equal(t.lanes.length, 1)
  assert.deepEqual(timelineLanes([]), { from: null, to: null, lanes: [], longest: null })
  assert.deepEqual(timelineLanes(), { from: null, to: null, lanes: [], longest: null })
})

test('timelineLanes: policzone dni i liczba odhaczen', () => {
  const t = timelineLanes([{ id: 'a', name: 'A', completedDates: ['2026-01-01', '2026-01-10', '2026-01-05'] }])
  assert.equal(t.lanes[0].days, 10, 'od 1 do 10 stycznia to 10 dni')
  assert.equal(t.lanes[0].total, 3)
})

test('timelineTicks: dluga historia podpisana latami, krotka miesiacami', () => {
  const lata = timelineTicks('2024-05-01', '2026-08-01')
  assert.deepEqual(lata.map(t => t.label), ['2024', '2025', '2026'])
  const miesiace = timelineTicks('2026-03-02', '2026-06-10')
  assert.deepEqual(miesiace.map(t => t.label), ['mar', 'kwi', 'maj', 'cze'])
})

test('timelineTicks: podpisy mieszcza sie w osi', () => {
  for (const t of timelineTicks('2024-05-01', '2026-08-01')) {
    assert.ok(t.leftPct >= 0 && t.leftPct <= 100, `${t.label} poza osia`)
  }
  assert.deepEqual(timelineTicks(null, '2026-01-01'), [])
})
