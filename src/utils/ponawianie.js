import { awariaMinela, jestKodemSieciowym, zrodloHandlera } from './polaczenie.js'
import { log } from './logger.js'

// Ponawianie martwych subskrypcji Firestore.
//
// Sedno problemu: gdy onSnapshot zawoła onError, ta subskrypcja jest SKOŃCZONA.
// SDK nie próbuje jej wskrzesić — callback z danymi już nigdy nie zostanie
// zawołany. Do tej pory oznaczało to dwie rzeczy naraz:
//   1. moduł pokazywał dane sprzed awarii i nic więcej,
//   2. baner „Nie udało się pobrać części danych" wisiał do przeładowania
//      strony, bo nikt nie wołał awariaMinela() — nie było komu, skoro żaden
//      snapshot już nie przychodził.
//
// Tu naprawiamy oba: po błędzie sieciowym subskrybujemy od nowa, a pierwszy
// udany snapshot kasuje wpis o awarii, więc baner znika sam.
//
// Ponawiamy WYŁĄCZNIE błędy sieciowe. permission-denied po wygaśnięciu sesji
// ponowiony sto razy nadal będzie permission-denied — tam jedynym wyjściem jest
// zalogowanie się od nowa i o tym baner mówi osobnym komunikatem.

// Rosnące odstępy: pierwsza próba szybka (typowa czkawka transportu mija
// w sekundę), kolejne rzadsze, żeby telefon w tunelu nie dobijał się co chwilę.
export const OPOZNIENIA = [2000, 6000, 15000]

/**
 * Opakowuje subskrypcję w kasowanie awarii i ponawianie.
 *
 * @param {Function} subskrybuj  odpowiednik onSnapshot(zapytanie, przyDanych, przyBledzie)
 *                               zwracający funkcję odsubskrybowania
 * @param {*} zapytanie          przekazywane bez zmian do `subskrybuj`
 * @param {Function} przyDanych  callback z danymi
 * @param {Function} przyBledzie handler z bladSubskrypcji() — musi nieść nazwę źródła
 * @returns {Function} odsubskrybowanie (bezpieczne do wołania wielokrotnie)
 */
export function zPonawianiem(subskrybuj, zapytanie, przyDanych, przyBledzie) {
  const zrodlo = zrodloHandlera(przyBledzie)

  // Bez znacznika źródła nie ma czego kasować ani jak nazwać awarii w logu —
  // przepuszczamy wywołanie bez zmian, żeby opakowanie nigdy nie było gorsze
  // od gołego onSnapshot.
  if (!zrodlo) return subskrybuj(zapytanie, przyDanych, przyBledzie)

  let aktywna = true
  let odsubskrybuj = null
  let timer = null
  let proba = 0
  let czekaNaSiec = null

  const odepnijOdSieci = () => {
    if (czekaNaSiec && typeof window !== 'undefined') {
      window.removeEventListener('online', czekaNaSiec)
    }
    czekaNaSiec = null
  }

  const daneZKasowaniemAwarii = (migawka) => {
    // Dane doszły, więc awaria — jeśli jakaś była — jest już historią.
    // awariaMinela() dla źródła bez wpisu nic nie robi, więc nie ma sensu
    // sprawdzać tego tutaj.
    proba = 0
    awariaMinela(zrodlo)
    przyDanych(migawka)
  }

  const bladZPonowieniem = (blad) => {
    // Subskrypcja właśnie umarła — nie ma czego odsubskrybowywać.
    odsubskrybuj = null

    // Rejestracja awarii i sprzątanie po stronie modułu (np. zgaszenie
    // spinnera) muszą się wydarzyć niezależnie od tego, czy ponawiamy.
    przyBledzie(blad)

    if (!aktywna || !jestKodemSieciowym(blad?.code)) return

    if (proba < OPOZNIENIA.length) {
      const zwloka = OPOZNIENIA[proba]
      proba += 1
      log.info('polaczenie', `ponawiam subskrypcję „${zrodlo}"`, { proba, zwloka })
      timer = setTimeout(() => {
        timer = null
        if (aktywna) start()
      }, zwloka)
      // Ponowienie nie może trzymać procesu przy życiu (Node) ani opóźniać
      // uśpienia karty — to tło, nie zadanie.
      timer?.unref?.()
      return
    }

    // Próby wyczerpane. Dalsze dobijanie się w kółko nic nie da, ale powrót
    // sieci to realna zmiana warunków — wtedy warto spróbować jeszcze raz.
    if (typeof window !== 'undefined' && !czekaNaSiec) {
      log.warn('polaczenie', `„${zrodlo}" czeka na powrót sieci`, { proba })
      czekaNaSiec = () => {
        czekaNaSiec = null
        proba = 0
        if (aktywna) start()
      }
      window.addEventListener('online', czekaNaSiec, { once: true })
    }
  }

  function start() {
    odsubskrybuj = subskrybuj(zapytanie, daneZKasowaniemAwarii, bladZPonowieniem)
  }

  start()

  return () => {
    aktywna = false
    if (timer) { clearTimeout(timer); timer = null }
    odepnijOdSieci()
    const stop = odsubskrybuj
    odsubskrybuj = null
    stop?.()
  }
}
