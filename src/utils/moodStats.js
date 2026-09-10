// Statystyki nastroju dla wybranego okresu.
//
// Wydzielone z MoodDashboard, bo kafelki nad wykresami liczyły się zawsze ze
// WSZYSTKICH wpisów — niezależnie od tego, czy patrzysz na miesiąc, rok, czy
// całość. Średnia z całego życia aplikacji praktycznie nie drgała, więc nic
// z niej nie wynikało.

// Wpisy z okresu. `tryb`: 'month' | 'year' | 'all'.
// `prefiks` to 'yyyy-MM' dla miesiąca i 'yyyy' dla roku (przy 'all' ignorowany).
export const wpisyOkresu = (logs, tryb, prefiks) =>
  tryb === 'all' ? logs : logs.filter(l => (l.date || '').startsWith(prefiks))

/**
 * Liczba wpisów, liczba DNI z wpisem i średnia ocena nastroju (skala 1–5).
 *
 * Dni liczymy osobno od wpisów, bo jednego dnia można zapisać kilka razy —
 * „7 wpisów" i „4 dni" to dwie różne informacje. Do średniej wchodzą tylko
 * wpisy z oceną; wpis z samymi emocjami jej nie zaniża. Brak takich wpisów
 * daje `srednia: null`, żeby dało się odróżnić „brak danych" od zera.
 */
export function statystykiNastroju(logs) {
  const zOcena = logs.filter(l => l.moodValue)
  return {
    wpisy: logs.length,
    dni: new Set(logs.map(l => l.date).filter(Boolean)).size,
    srednia: zOcena.length ? zOcena.reduce((s, l) => s + l.moodValue, 0) / zOcena.length : null,
  }
}

// Podsumowanie rok po roku, od najnowszego — pod widok „Łącznie".
export function podsumowanieLat(logs) {
  const wgLat = {}
  for (const l of logs) {
    const rok = (l.date || '').slice(0, 4)
    if (rok.length === 4) (wgLat[rok] ||= []).push(l)
  }
  return Object.keys(wgLat).sort((a, b) => b.localeCompare(a))
    .map(rok => ({ rok, ...statystykiNastroju(wgLat[rok]) }))
}
