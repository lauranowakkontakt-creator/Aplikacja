import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Strażnik regresji: KAŻDE wywołanie onSnapshot musi mieć callback błędu.
//
// Bez niego padnięta subskrypcja jest całkowicie niema — Firestore po prostu
// przestaje wołać callback, moduł zostaje na „Ładowanie…" w nieskończoność,
// a w konsoli nie ma śladu. Tak wyglądało 59 z 74 subskrypcji w tej apce
// i to była najczęstsza przyczyna „czasami nic się nie ładuje".
//
// Test jest tu po to, żeby subskrypcja dopisana za pół roku nie wróciła
// do tego stanu po cichu.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function plikiZrodlowe(katalog) {
  const wynik = []
  for (const nazwa of readdirSync(katalog)) {
    const p = join(katalog, nazwa)
    if (statSync(p).isDirectory()) wynik.push(...plikiZrodlowe(p))
    else if (['.js', '.jsx'].includes(extname(nazwa))) wynik.push(p)
  }
  return wynik
}

// Argumenty wywołania liczymy z uwzględnieniem stringów, szablonów i komentarzy
// — naiwne dzielenie po przecinku myli się na każdej funkcji strzałkowej,
// która sama zawiera przecinek.
function argumentyWywolania(kod, indeksNawiasu) {
  let glebokosc = 0, i = indeksNawiasu, poczatek = indeksNawiasu + 1
  const args = []
  while (i < kod.length) {
    const c = kod[i]
    if (c === "'" || c === '"' || c === '`') {
      const cudzyslow = c
      i++
      while (i < kod.length) {
        if (kod[i] === '\\') { i += 2; continue }
        if (kod[i] === cudzyslow) break
        i++
      }
    } else if (kod.startsWith('//', i)) {
      const koniec = kod.indexOf('\n', i)
      if (koniec < 0) break
      i = koniec
    } else if (kod.startsWith('/*', i)) {
      i = kod.indexOf('*/', i) + 1
    } else if ('([{'.includes(c)) {
      glebokosc++
    } else if (')]}'.includes(c)) {
      glebokosc--
      if (glebokosc === 0 && c === ')') { args.push(kod.slice(poczatek, i)); return args }
    } else if (c === ',' && glebokosc === 1) {
      args.push(kod.slice(poczatek, i))
      poczatek = i + 1
    }
    i++
  }
  return null // niedomknięty nawias — traktujemy jako brak wyniku
}

const zrodla = plikiZrodlowe(join(ROOT, 'src'))

test('każde onSnapshot ma callback błędu', () => {
  const braki = []

  for (const plik of zrodla) {
    const kod = readFileSync(plik, 'utf8')
    if (!kod.includes('onSnapshot')) continue

    for (const m of kod.matchAll(/\bonSnapshot\s*\(/g)) {
      const args = argumentyWywolania(kod, m.index + m[0].length - 1)
      assert.ok(args, `nie udało się sparsować onSnapshot w ${plik}`)
      if (args.length < 3) {
        const linia = kod.slice(0, m.index).split('\n').length
        braki.push(`${plik.replace(ROOT + '/', '')}:${linia}`)
      }
    }
  }

  assert.deepEqual(braki, [], `subskrypcje bez obsługi błędu:\n  ${braki.join('\n  ')}`)
})

test('callback błędu to zawsze wspólne bladSubskrypcji, nie własny wariant', () => {
  // Nie chodzi o styl. bladSubskrypcji jest jedynym miejscem, które zapisuje
  // błąd do logu i zapala pasek połączenia. Własne `err => setLoading(false)`
  // gasi spinner, ale awarię połyka po cichu — a to najgorszy z możliwych
  // wariantów: użytkownik widzi pusty moduł i nie ma po czym poznać dlaczego.
  // Potrzebę „zrób coś dodatkowo" pokrywa opcja przyBledzie.
  const wlasne = []

  for (const plik of zrodla) {
    const kod = readFileSync(plik, 'utf8')
    if (!kod.includes('onSnapshot')) continue

    for (const m of kod.matchAll(/\bonSnapshot\s*\(/g)) {
      const args = argumentyWywolania(kod, m.index + m[0].length - 1)
      if (!args || args.length < 3) continue
      if (!args[2].includes('bladSubskrypcji')) {
        const linia = kod.slice(0, m.index).split('\n').length
        wlasne.push(`${plik.replace(ROOT + '/', '')}:${linia}`)
      }
    }
  }

  assert.deepEqual(wlasne, [], `własne callbacki błędu zamiast bladSubskrypcji:\n  ${wlasne.join('\n  ')}`)
})
