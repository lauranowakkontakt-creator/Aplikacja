import { useSyncExternalStore } from 'react'
import { log } from './logger.js'

// Stan połączenia z danymi — dwie osobne rzeczy, które użytkownik widzi jako
// jedną „apka nie działa":
//
//  1. brak sieci (navigator.onLine) — Firestore serwuje wtedy dane z cache
//     w IndexedDB, więc apka DZIAŁA, tylko pokazuje ostatnio pobrany stan.
//     To informacja, nie awaria.
//  2. subskrypcja Firestore padła (onSnapshot zawołał onError) — np. wygasła
//     sesja, reguły odmówiły dostępu albo transport został zablokowany.
//     Tu dane w module NIE dojdą i trzeba to powiedzieć wprost.
//
// Bez tego rozróżnienia oba przypadki wyglądały tak samo: wieczne „Ładowanie…".

let online = typeof navigator === 'undefined' ? true : navigator.onLine !== false

// zrodlo -> { kod, komunikat, czas }. Mapa, a nie licznik, bo gdy padnie pięć
// subskrypcji naraz (typowe przy wygasłej sesji), chcemy jeden komunikat
// z listą modułów, a nie pięć nachodzących na siebie banerów.
const awarie = new Map()

const sluchacze = new Set()
let migawka = zbudujMigawke()

function zbudujMigawke() {
  return {
    online,
    // Awarie sortowane od najnowszej — jeśli baner pokaże tylko jedną,
    // niech to będzie ta, która właśnie się wydarzyła.
    awarie: [...awarie.entries()]
      .map(([zrodlo, info]) => ({ zrodlo, ...info }))
      .sort((a, b) => b.czas - a.czas),
  }
}

function powiadom() {
  // useSyncExternalStore porównuje migawki przez ===, więc musi to być NOWY
  // obiekt przy każdej zmianie; jednocześnie ten sam obiekt między zmianami,
  // inaczej React wpada w pętlę renderowania.
  migawka = zbudujMigawke()
  for (const s of sluchacze) {
    try { s() } catch {}
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online = true
    log.info('polaczenie', 'sieć wróciła')
    // Awarie z powodu zerwanego transportu kasujemy same — Firestore ponawia
    // subskrypcje po powrocie łącza, więc baner „nie udało się pobrać" byłby
    // od tej chwili nieprawdą i wisiałby do przeładowania strony.
    // Awarii NIEsieciowych (np. permission-denied) nie ruszamy: powrót sieci
    // ich nie naprawia i użytkownik musi je zobaczyć.
    for (const [zrodlo, info] of awarie) {
      if (info.sieciowy) awarie.delete(zrodlo)
    }
    powiadom()
  })
  window.addEventListener('offline', () => {
    online = false
    log.warn('polaczenie', 'brak sieci — dane z lokalnego cache')
    powiadom()
  })
}

// Kody, które oznaczają „nie ma sieci / transport zablokowany", a nie realny
// błąd aplikacji. Firestore i tak ponawia próbę sam, więc nie ma sensu straszyć
// użytkownika awarią — wystarczy informacja o trybie offline.
const KODY_SIECIOWE = new Set(['unavailable', 'deadline-exceeded', 'cancelled', 'resource-exhausted'])

/**
 * Callback błędu dla onSnapshot.
 *
 * Bez niego padnięta subskrypcja jest całkowicie niema: onSnapshot po prostu
 * przestaje wołać callback, moduł zostaje na „Ładowanie…" w nieskończoność,
 * a w konsoli nie ma nic. To była najczęstsza przyczyna „czasami nic się nie
 * ładuje, a odświeżanie nie pomaga".
 *
 * @param {string} zrodlo   nazwa modułu/kolekcji do logu i komunikatu
 * @param {{przyBledzie?: (blad: Error) => void}} [opcje]
 *        przyBledzie — np. zgaszenie spinnera, żeby moduł pokazał pusty stan
 *        zamiast wisieć
 */
export function bladSubskrypcji(zrodlo, opcje = {}) {
  return (blad) => {
    const kod = blad?.code
    const sieciowy = KODY_SIECIOWE.has(kod)

    log.blad('firestore', `subskrypcja „${zrodlo}" przerwana`, blad, { zrodlo, sieciowy })

    // Błąd sieciowy przy wyłączonej sieci to nie awaria, tylko tryb offline —
    // baner offline już to mówi, drugi komunikat byłby szumem.
    if (!(sieciowy && !online)) {
      awarie.set(zrodlo, {
        kod: kod || 'nieznany',
        komunikat: blad?.message || 'Nie udało się pobrać danych',
        czas: Date.now(),
        sieciowy,
      })
      powiadom()
    }

    try { opcje.przyBledzie?.(blad) } catch (e) {
      log.blad('polaczenie', 'przyBledzie rzuciło wyjątek', e, { zrodlo })
    }
  }
}

// Wołane, gdy subskrypcja znów dostarczy dane — kasuje wpis o awarii,
// żeby baner znikał sam, bez odświeżania strony.
export function awariaMinela(zrodlo) {
  if (awarie.delete(zrodlo)) powiadom()
}

export function usunWszystkieAwarie() {
  if (awarie.size) { awarie.clear(); powiadom() }
}

function subskrybuj(fn) {
  sluchacze.add(fn)
  return () => sluchacze.delete(fn)
}

const migawkaSerwera = { online: true, awarie: [] }

// Wgląd w rejestr awarii dla testów. Komponenty używają usePolaczenie().
export function _rejestrAwarii() {
  return migawka.awarie
}

export function usePolaczenie() {
  return useSyncExternalStore(subskrybuj, () => migawka, () => migawkaSerwera)
}
