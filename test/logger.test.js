import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const { log, odczytajLogi, wyczyscLogi, logiJakoTekst, nasluchujLogow } =
  await import('../src/utils/logger.js')

beforeEach(() => wyczyscLogi())

test('zapisuje wpisy z poziomem, źródłem i treścią', () => {
  log.info('budzet', 'wczytano konta')
  const [w] = odczytajLogi()
  assert.equal(w.poziom, 'info')
  assert.equal(w.zrodlo, 'budzet')
  assert.equal(w.wiadomosc, 'wczytano konta')
  assert.ok(typeof w.czas === 'number')
})

test('log.blad wyciąga z Error komunikat, kod i stos', () => {
  const blad = Object.assign(new Error('brak dostępu'), { code: 'permission-denied' })
  log.blad('firestore', 'subskrypcja padła', blad, { zrodlo: 'nawyki' })

  const [w] = odczytajLogi()
  assert.equal(w.poziom, 'error')
  assert.equal(w.dane.komunikat, 'brak dostępu')
  assert.equal(w.dane.kod, 'permission-denied')
  assert.ok(w.dane.stos.includes('Error'))
  assert.equal(w.dane.zrodlo, 'nawyki')  // dodatkowy kontekst nie gubi się
})

test('log.blad radzi sobie z tym, co nie jest obiektem Error', () => {
  log.blad('x', 'coś', 'zwykły tekst')
  log.blad('x', 'nic', null)
  log.blad('x', 'obiekt', { dziwne: true })

  const logi = odczytajLogi()
  assert.equal(logi[0].dane.komunikat, 'zwykły tekst')
  assert.equal(logi[1].dane.komunikat, undefined)
  assert.equal(logi[2].dane.komunikat, '[object Object]')
})

test('bufor nie rośnie w nieskończoność', () => {
  // Limit to 200; wrzucamy więcej i sprawdzamy, że zostają NAJNOWSZE wpisy.
  for (let i = 0; i < 260; i++) log.debug('petla', `wpis ${i}`)

  const logi = odczytajLogi()
  assert.equal(logi.length, 200)
  assert.equal(logi[0].wiadomosc, 'wpis 60')
  assert.equal(logi.at(-1).wiadomosc, 'wpis 259')
})

test('odczytajLogi zwraca kopię — widok nie popsuje bufora', () => {
  log.info('a', 'jeden')
  const kopia = odczytajLogi()
  kopia.push({ wiadomosc: 'wstrzyknięte' })
  kopia.length = 0
  assert.equal(odczytajLogi().length, 1)
})

test('logiJakoTekst daje jedną linię na wpis, bez stosu', () => {
  log.warn('siec', 'brak połączenia')
  log.blad('firestore', 'padło', Object.assign(new Error('bum'), { code: 'unavailable' }))

  const linie = logiJakoTekst().split('\n')
  assert.equal(linie.length, 2)
  assert.match(linie[0], /WARN {2}\[siec\] brak połączenia/)
  assert.match(linie[1], /ERROR \[firestore\] padło/)
  assert.match(linie[1], /"kod":"unavailable"/)
  // Stos zostaje w buforze, ale zrzut do wklejenia byłby przez niego nieczytelny.
  assert.ok(!linie[1].includes('at '))
  assert.ok(odczytajLogi()[1].dane.stos.includes('Error'))
})

test('nasłuchujący dostaje nowe wpisy i da się go odpiąć', () => {
  const widziane = []
  const odepnij = nasluchujLogow(w => widziane.push(w.wiadomosc))

  log.info('a', 'pierwszy')
  odepnij()
  log.info('a', 'drugi')

  assert.deepEqual(widziane, ['pierwszy'])
})

test('wyjątek u nasłuchującego nie przewraca logowania', () => {
  // Logger bywa wołany z bloku catch. Gdyby sam rzucał, wysadzałby moduł
  // skuteczniej niż błąd, który miał tylko odnotować.
  nasluchujLogow(() => { throw new Error('zepsuty słuchacz') })
  assert.doesNotThrow(() => log.info('a', 'mimo wszystko'))
  assert.equal(odczytajLogi().length, 1)
})

test('logowanie wartości, której nie da się zserializować, nie rzuca', () => {
  const cykl = {}
  cykl.ja = cykl
  assert.doesNotThrow(() => log.info('a', 'cykl', cykl))
  assert.doesNotThrow(() => logiJakoTekst())
})
