import { usePolaczenie } from '../utils/polaczenie'
import { IconClose, IconBell } from './Icons'

// Pasek stanu połączenia — pokazywany nad zawartością modułu.
//
// Rozwiązuje konkretny problem: gdy subskrypcja Firestore padała, moduł zostawał
// na „Ładowanie…" bez słowa wyjaśnienia i jedyne, co można było zrobić, to
// zgadywać. Teraz aplikacja mówi wprost, czy to brak sieci (dane są, tylko
// sprzed chwili), czy realna awaria (danych nie będzie).
//
// Celowo w normalnym przepływie strony, a nie jako pływająca nakładka:
// nie zasłania treści, nie wymaga liczenia safe-area i nie da się go przeoczyć
// przy przewijaniu w górę.
export default function PasekPolaczenia() {
  const { online, awarie } = usePolaczenie()

  if (online && awarie.length === 0) return null

  // Offline ma pierwszeństwo: to najczęstszy przypadek i najprostszy komunikat.
  // Firestore serwuje wtedy dane z lokalnego cache, więc apka DZIAŁA — mówimy
  // o tym wprost, żeby nie wyglądało na awarię.
  if (!online) {
    return (
      <div className="pasek-polaczenia" data-stan="offline" role="status">
        <IconBell size={14} />
        <span>Brak połączenia — pokazuję ostatnio pobrane dane. Zmiany zapiszą się, gdy sieć wróci.</span>
      </div>
    )
  }

  // Sieć jest, a mimo to subskrypcje padły — to już wymaga uwagi.
  // Najczęściej: wygasła sesja (permission-denied) po dłuższej przerwie.
  const wygaslaSesja = awarie.some(a => a.kod === 'permission-denied' || a.kod === 'unauthenticated')
  const modules = [...new Set(awarie.map(a => a.zrodlo))]

  return (
    <div className="pasek-polaczenia" data-stan="awaria" role="alert">
      <IconClose size={14} />
      <span>
        {wygaslaSesja
          ? 'Brak dostępu do danych — najpewniej wygasło logowanie.'
          : `Nie udało się pobrać części danych (${modules.slice(0, 3).join(', ')}${modules.length > 3 ? '…' : ''}).`}
      </span>
      <button type="button" className="pasek-polaczenia-akcja" onClick={() => window.location.reload()}>
        Odśwież
      </button>
    </div>
  )
}
