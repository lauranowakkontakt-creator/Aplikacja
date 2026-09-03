import { useState, useEffect } from 'react'
import { odczytajLogi, logiJakoTekst, wyczyscLogi, nasluchujLogow } from '../utils/logger'
import { usePolaczenie } from '../utils/polaczenie'
import { toast } from './Toast'

// Podgląd ostatnich zdarzeń aplikacji.
//
// Powód istnienia: apka chodzi jako PWA na telefonie, gdzie nie ma jak otworzyć
// konsoli. Gdy „Wdzięcznik się nie ładuje", to jest jedyne miejsce, w którym
// widać, co naprawdę się stało — kod błędu Firestore, której kolekcji dotyczył
// i o której godzinie. Przycisk kopiowania jest po to, żeby dało się to
// przekleić gdziekolwiek indziej.
//
// Domyślnie zwinięte: to narzędzie awaryjne, nie codzienne ustawienie.
export default function Diagnostyka() {
  const [otwarte, setOtwarte] = useState(false)
  const [wpisy, setWpisy] = useState([])
  const { online, awarie } = usePolaczenie()

  useEffect(() => {
    if (!otwarte) return
    setWpisy(odczytajLogi())
    // Dopóki panel jest otwarty, nowe wpisy dochodzą na żywo — przy diagnozowaniu
    // chce się widzieć skutek kliknięcia od razu, bez zamykania i otwierania.
    return nasluchujLogow(() => setWpisy(odczytajLogi()))
  }, [otwarte])

  const kopiuj = async () => {
    const tekst = logiJakoTekst()
    try {
      await navigator.clipboard.writeText(tekst)
      toast.success('Logi skopiowane')
    } catch {
      // clipboard API bywa niedostępne (brak HTTPS, odmowa uprawnienia).
      // Zaznaczenie tekstu ręcznie zawsze zadziała, więc mówimy o tym wprost
      // zamiast udawać, że się udało.
      toast.error('Nie udało się skopiować — zaznacz tekst ręcznie')
    }
  }

  const bledy = wpisy.filter(w => w.poziom === 'error').length

  return (
    <div className="diagnostyka">
      <button type="button" className="diagnostyka-naglowek" onClick={() => setOtwarte(o => !o)}>
        <span>Diagnostyka</span>
        <span className="diagnostyka-stan">
          {!online ? 'offline' : awarie.length ? `${awarie.length} awarii` : 'połączono'}
          {' · '}{otwarte ? 'zwiń' : 'rozwiń'}
        </span>
      </button>

      {otwarte && (
        <>
          <div className="diagnostyka-akcje">
            <button type="button" onClick={kopiuj}>Kopiuj logi</button>
            <button type="button" onClick={() => { wyczyscLogi(); setWpisy([]) }}>Wyczyść</button>
            <span className="diagnostyka-licznik">
              {wpisy.length} wpisów{bledy > 0 && `, w tym ${bledy} błędów`}
            </span>
          </div>

          <div className="diagnostyka-lista">
            {wpisy.length === 0 && <p className="diagnostyka-pusto">Brak zdarzeń.</p>}
            {/* Od najnowszych — przy szukaniu przyczyny zaczyna się od tego,
                co wydarzyło się przed chwilą. */}
            {wpisy.slice().reverse().map((w, i) => (
              <div key={`${w.czas}-${i}`} className="diagnostyka-wpis" data-poziom={w.poziom}>
                <span className="diagnostyka-czas">
                  {new Date(w.czas).toLocaleTimeString('pl-PL')}
                </span>
                <span className="diagnostyka-zrodlo">{w.zrodlo}</span>
                <span className="diagnostyka-tresc">
                  {w.wiadomosc}
                  {w.dane?.kod && <em> ({w.dane.kod})</em>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
