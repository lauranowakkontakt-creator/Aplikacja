import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// polaczenie.js podpina się pod zdarzenia online/offline okna. W Node okna nie
// ma, więc podstawiamy atrapę PRZED importem — inaczej moduł pominąłby
// rejestrację i nie dałoby się przetestować reakcji na utratę sieci.
const sluchaczeOkna = {}
globalThis.window = {
  addEventListener: (nazwa, fn) => { sluchaczeOkna[nazwa] = fn },
}
// navigator w nowszych Node jest tylko do odczytu (getter) — podmieniamy
// przez defineProperty, a nie przypisaniem.
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true }, configurable: true, writable: true,
})

const { bladSubskrypcji, awariaMinela, usunWszystkieAwarie, _rejestrAwarii,
  jestKodemSieciowym, zrodloHandlera } =
  await import('../src/utils/polaczenie.js')

// Nazwy źródeł, które aktualnie są w stanie awarii — to samo, co widzi baner
// przez usePolaczenie(), tylko bez renderera Reacta.
const zrodlaAwarii = () => _rejestrAwarii().map(a => a.zrodlo).sort()
const { odczytajLogi, wyczyscLogi } = await import('../src/utils/logger.js')

// Migawki nie czytamy przez hooka Reacta (to wymagałoby renderera) — testujemy
// warstwę pod nim: rejestr awarii i log, które hook tylko podaje dalej.

beforeEach(() => {
  // Kolejność ma znaczenie: przywrócenie sieci samo dopisuje wpis do logu,
  // więc czyścimy log DOPIERO po nim — inaczej każdy test zaczynałby
  // od cudzego „sieć wróciła" na pierwszej pozycji.
  sluchaczeOkna.online?.()
  usunWszystkieAwarie()
  wyczyscLogi()
})

test('błąd subskrypcji trafia do logu z kodem i nazwą źródła', () => {
  const blad = Object.assign(new Error('Missing or insufficient permissions'), {
    code: 'permission-denied',
  })

  bladSubskrypcji('nawyki')(blad)

  const [w] = odczytajLogi()
  assert.equal(w.poziom, 'error')
  assert.equal(w.zrodlo, 'firestore')
  assert.match(w.wiadomosc, /nawyki/)
  assert.equal(w.dane.kod, 'permission-denied')
  assert.equal(w.dane.sieciowy, false)
})

test('kody transportowe są oznaczane jako sieciowe, nie jako awaria aplikacji', () => {
  bladSubskrypcji('budzet')(Object.assign(new Error('x'), { code: 'unavailable' }))
  assert.equal(odczytajLogi()[0].dane.sieciowy, true)

  wyczyscLogi()
  bladSubskrypcji('budzet')(Object.assign(new Error('x'), { code: 'deadline-exceeded' }))
  assert.equal(odczytajLogi()[0].dane.sieciowy, true)
})

test('przyBledzie dostaje błąd — moduł może zgasić spinner zamiast wisieć', () => {
  let zlapany = null
  const blad = Object.assign(new Error('padło'), { code: 'unavailable' })

  bladSubskrypcji('todo', { przyBledzie: (e) => { zlapany = e } })(blad)

  assert.equal(zlapany, blad)
})

test('wyjątek w przyBledzie nie wychodzi na zewnątrz', () => {
  // Ten callback woła setState modułu. Gdyby jego wyjątek przeleciał wyżej,
  // wysadziłby wnętrze SDK Firestore w miejscu bez żadnego catcha.
  const wybuchowy = bladSubskrypcji('sen', {
    przyBledzie: () => { throw new Error('setState na odmontowanym') },
  })

  assert.doesNotThrow(() => wybuchowy(new Error('x')))

  // ...ale zostaje ślad w logu, żeby nie zniknęło bez śladu.
  const wpisy = odczytajLogi()
  assert.ok(wpisy.some(w => w.zrodlo === 'polaczenie' && /przyBledzie/.test(w.wiadomosc)))
})

test('błąd sieciowy przy wyłączonej sieci nie dokłada osobnej awarii', () => {
  // Offline to informacja, nie awaria — baner offline już to mówi. Drugi
  // komunikat („nie udało się pobrać nawyków") byłby tylko szumem.
  sluchaczeOkna.offline()
  wyczyscLogi()

  bladSubskrypcji('nawyki')(Object.assign(new Error('x'), { code: 'unavailable' }))

  // Log jest zawsze — do diagnostyki. Sprawdzamy tylko, że został oznaczony.
  assert.equal(odczytajLogi()[0].dane.sieciowy, true)
})

test('błąd NIEsieciowy przy wyłączonej sieci nadal jest awarią', () => {
  sluchaczeOkna.offline()
  wyczyscLogi()

  bladSubskrypcji('nawyki')(Object.assign(new Error('x'), { code: 'permission-denied' }))

  assert.equal(odczytajLogi()[0].dane.sieciowy, false)
})

test('zmiana stanu sieci jest odnotowana w logu', () => {
  wyczyscLogi()
  sluchaczeOkna.offline()
  sluchaczeOkna.online()

  const wiadomosci = odczytajLogi().map(w => w.wiadomosc)
  assert.ok(wiadomosci.some(m => /brak sieci/.test(m)))
  assert.ok(wiadomosci.some(m => /sieć wróciła/.test(m)))
})

test('awariaMinela i usunWszystkieAwarie nie rzucają dla nieznanych źródeł', () => {
  assert.doesNotThrow(() => awariaMinela('czegoś-takiego-nie-ma'))
  assert.doesNotThrow(() => usunWszystkieAwarie())
})

test('powrót sieci kasuje awarie sieciowe, ale zostawia te realne', () => {
  // Firestore sam ponawia subskrypcje po powrocie łącza, więc baner o nieudanym
  // pobraniu byłby od tego momentu nieprawdą. Ale permission-denied powrót
  // sieci nie naprawia — ta awaria musi zostać widoczna.
  bladSubskrypcji('todos')(Object.assign(new Error('x'), { code: 'unavailable' }))
  bladSubskrypcji('habits')(Object.assign(new Error('x'), { code: 'permission-denied' }))
  assert.deepEqual(zrodlaAwarii().sort(), ['habits', 'todos'])

  sluchaczeOkna.online()

  assert.deepEqual(zrodlaAwarii(), ['habits'])
})


test('handler błędu niesie nazwę źródła', () => {
  // Na tym znaczniku stoi całe kasowanie awarii w ponawianie.js: opakowany
  // onSnapshot nie dostaje nazwy modułu osobno, tylko odczytuje ją z handlera.
  const handler = bladSubskrypcji('accounts')
  assert.equal(zrodloHandlera(handler), 'accounts')
})

test('zrodloHandlera znosi to, co nie jest oznaczonym handlerem', () => {
  assert.equal(zrodloHandlera(() => {}), undefined)
  assert.equal(zrodloHandlera(undefined), undefined)
  assert.equal(zrodloHandlera(null), undefined)
})

test('kody sieciowe są odróżniane od trwałych', () => {
  // Rozstrzyga o tym, czy w ogóle ponawiamy subskrypcję.
  assert.equal(jestKodemSieciowym('unavailable'), true)
  assert.equal(jestKodemSieciowym('deadline-exceeded'), true)
  assert.equal(jestKodemSieciowym('permission-denied'), false)
  assert.equal(jestKodemSieciowym(undefined), false)
})
