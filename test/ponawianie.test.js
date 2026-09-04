import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'

// Ten sam zabieg co w polaczenie.test.js: atrapa okna PRZED importem modułów,
// bo polaczenie.js podpina się pod online/offline już przy ładowaniu.
// Tutaj potrzebujemy też removeEventListener — ponawianie odpina swojego
// słuchacza przy odsubskrybowaniu i chcemy móc to sprawdzić.
const sluchaczeOkna = {}
globalThis.window = {
  addEventListener: (nazwa, fn) => { sluchaczeOkna[nazwa] = fn },
  removeEventListener: (nazwa, fn) => {
    if (sluchaczeOkna[nazwa] === fn) delete sluchaczeOkna[nazwa]
  },
}
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true }, configurable: true, writable: true,
})

const { zPonawianiem, OPOZNIENIA } = await import('../src/utils/ponawianie.js')
const { bladSubskrypcji, usunWszystkieAwarie, _rejestrAwarii } =
  await import('../src/utils/polaczenie.js')

const zrodlaAwarii = () => _rejestrAwarii().map(a => a.zrodlo).sort()

const bladZKodem = (kod) => Object.assign(new Error(`test: ${kod}`), { code: kod })

// Atrapa onSnapshot: zapamiętuje każdą subskrypcję, żeby test mógł ręcznie
// podać dane albo wywalić błąd, i liczy odsubskrybowania.
function atrapaSubskrypcji() {
  const wywolania = []
  const subskrybuj = (zapytanie, przyDanych, przyBledzie) => {
    const wpis = { zapytanie, przyDanych, przyBledzie, odsubskrybowana: false }
    wywolania.push(wpis)
    return () => { wpis.odsubskrybowana = true }
  }
  subskrybuj.wywolania = wywolania
  subskrybuj.ostatnia = () => wywolania[wywolania.length - 1]
  return subskrybuj
}

beforeEach(() => {
  usunWszystkieAwarie()
  for (const nazwa of Object.keys(sluchaczeOkna)) delete sluchaczeOkna[nazwa]
})

test('udany snapshot kasuje awarię — baner znika bez przeładowania strony', () => {
  const subskrybuj = atrapaSubskrypcji()
  zPonawianiem(subskrybuj, 'q', () => {}, bladSubskrypcji('accounts'))

  subskrybuj.ostatnia().przyBledzie(bladZKodem('unavailable'))
  assert.deepEqual(zrodlaAwarii(), ['accounts'])

  // Ponowienie dostaje dane — to jedyny moment, w którym apka wie, że jest już dobrze.
  subskrybuj.wywolania[0].przyDanych({ docs: [] })
  assert.deepEqual(zrodlaAwarii(), [])
})

test('dane docierają do wołającego niezmienione', () => {
  const subskrybuj = atrapaSubskrypcji()
  const odebrane = []
  zPonawianiem(subskrybuj, 'q', (s) => odebrane.push(s), bladSubskrypcji('todos'))

  const migawka = { docs: [{ id: 'a' }] }
  subskrybuj.ostatnia().przyDanych(migawka)
  assert.deepEqual(odebrane, [migawka])
})

test('błąd sieciowy ponawia subskrypcję po zwłoce', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const subskrybuj = atrapaSubskrypcji()
    zPonawianiem(subskrybuj, 'q', () => {}, bladSubskrypcji('accounts'))
    assert.equal(subskrybuj.wywolania.length, 1)

    subskrybuj.ostatnia().przyBledzie(bladZKodem('unavailable'))
    assert.equal(subskrybuj.wywolania.length, 1, 'ponowienie nie może być natychmiastowe')

    mock.timers.tick(OPOZNIENIA[0])
    assert.equal(subskrybuj.wywolania.length, 2, 'po zwłoce subskrypcja rusza od nowa')
  } finally {
    mock.timers.reset()
  }
})

test('błąd trwały (permission-denied) nie jest ponawiany', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const subskrybuj = atrapaSubskrypcji()
    zPonawianiem(subskrybuj, 'q', () => {}, bladSubskrypcji('accounts'))

    subskrybuj.ostatnia().przyBledzie(bladZKodem('permission-denied'))
    mock.timers.tick(60_000)

    assert.equal(subskrybuj.wywolania.length, 1, 'ponawianie wygasłej sesji niczego nie naprawia')
    assert.deepEqual(zrodlaAwarii(), ['accounts'], 'awaria zostaje — użytkownik musi się zalogować')
  } finally {
    mock.timers.reset()
  }
})

test('liczba prób jest ograniczona, potem czekamy na powrót sieci', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const subskrybuj = atrapaSubskrypcji()
    zPonawianiem(subskrybuj, 'q', () => {}, bladSubskrypcji('habits'))

    for (const zwloka of OPOZNIENIA) {
      subskrybuj.ostatnia().przyBledzie(bladZKodem('unavailable'))
      mock.timers.tick(zwloka)
    }
    assert.equal(subskrybuj.wywolania.length, 1 + OPOZNIENIA.length)

    // Próby wyczerpane — kolejny błąd nie planuje już nic.
    subskrybuj.ostatnia().przyBledzie(bladZKodem('unavailable'))
    mock.timers.tick(60_000)
    assert.equal(subskrybuj.wywolania.length, 1 + OPOZNIENIA.length, 'bez dobijania się w kółko')

    // ...ale powrót sieci to nowe warunki i wtedy próbujemy jeszcze raz.
    assert.ok(sluchaczeOkna.online, 'czeka na zdarzenie online')
    sluchaczeOkna.online()
    assert.equal(subskrybuj.wywolania.length, 2 + OPOZNIENIA.length)
  } finally {
    mock.timers.reset()
  }
})

test('udany snapshot zeruje licznik prób', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const subskrybuj = atrapaSubskrypcji()
    zPonawianiem(subskrybuj, 'q', () => {}, bladSubskrypcji('mood'))

    // Wyczerpujemy prawie cały limit, a potem dane wracają.
    subskrybuj.ostatnia().przyBledzie(bladZKodem('unavailable'))
    mock.timers.tick(OPOZNIENIA[0])
    subskrybuj.ostatnia().przyDanych({ docs: [] })

    // Po udanym snapshocie znów przysługuje pełna pula prób — inaczej apka
    // otwarta cały dzień przestawałaby się podnosić po kolejnych czkawkach sieci.
    const przed = subskrybuj.wywolania.length
    subskrybuj.ostatnia().przyBledzie(bladZKodem('unavailable'))
    mock.timers.tick(OPOZNIENIA[0])
    assert.equal(subskrybuj.wywolania.length, przed + 1)
  } finally {
    mock.timers.reset()
  }
})

test('odsubskrybowanie anuluje zaplanowane ponowienie', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const subskrybuj = atrapaSubskrypcji()
    const stop = zPonawianiem(subskrybuj, 'q', () => {}, bladSubskrypcji('accounts'))

    subskrybuj.ostatnia().przyBledzie(bladZKodem('unavailable'))
    stop()
    mock.timers.tick(60_000)

    // Bez tego odmontowany komponent wskrzeszałby subskrypcję i wołał setState
    // na nieistniejącym już widoku.
    assert.equal(subskrybuj.wywolania.length, 1)
    assert.equal(sluchaczeOkna.online, undefined, 'słuchacz sieci też ma zniknąć')
  } finally {
    mock.timers.reset()
  }
})

test('odsubskrybowanie zatrzymuje żywą subskrypcję', () => {
  const subskrybuj = atrapaSubskrypcji()
  const stop = zPonawianiem(subskrybuj, 'q', () => {}, bladSubskrypcji('accounts'))

  stop()
  assert.equal(subskrybuj.wywolania[0].odsubskrybowana, true)

  // Powtórne wywołanie zdarza się w Reakcie (StrictMode, szybkie przemontowania)
  // i nie ma prawa rzucić.
  assert.doesNotThrow(() => stop())
})

test('handler bez znacznika źródła przechodzi bez zmian', () => {
  const subskrybuj = atrapaSubskrypcji()
  const golyBlad = () => {}
  const stop = zPonawianiem(subskrybuj, 'q', () => {}, golyBlad)

  assert.equal(subskrybuj.wywolania.length, 1)
  assert.equal(subskrybuj.ostatnia().przyBledzie, golyBlad, 'żadnego opakowania')
  assert.equal(typeof stop, 'function')
})
