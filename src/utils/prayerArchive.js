import { checklistProgress, hasChecklist } from './prayerList.js'

// Co zostaje po prośbie, gdy trafi do archiwum.
//
// Archiwizacja niczego nie kasuje — ustawia tylko status i endedAt — ale do tej
// pory archiwum umiało pokazać wyłącznie `note` i `endedNote`. Dziennik notatek
// (`notes[]`, dopisywany przy kolejnych modlitwach) i listy do odhaczania
// znikały z oczu, więc wyglądało to jak utrata danych: prośba, przy której
// zapisało się pół roku myśli, w archiwum była samym tytułem.
//
// Te funkcje zbierają wszystko, co prośba niesie, i są odporne na starsze
// dokumenty — notatki bez `id` czy bez `date` istnieją w bazie od czasów, gdy
// zapisywał je inny widok, a archiwum nie może się o nie wywracać.

/** Dziennik notatek prośby, od najnowszej. Notatki bez daty lądują na końcu. */
export function archiwalneNotatki(item) {
  const notatki = Array.isArray(item?.notes) ? item.notes : []
  return notatki
    .filter(n => n && String(n.text || '').trim())
    .map((n, i) => ({
      id: n.id != null ? String(n.id) : `bez-id-${i}`,
      text: String(n.text).trim(),
      date: typeof n.date === 'string' ? n.date : '',
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Lista do odhaczania wraz z tym, co było odhaczone w chwili archiwizacji. */
export function archiwalnaLista(item) {
  if (!hasChecklist(item)) return null
  const odhaczone = item.checklistDone || []
  const { done, total } = checklistProgress(item.checklist, odhaczone)
  return {
    done,
    total,
    punkty: item.checklist.map(p => ({ ...p, zrobione: odhaczone.includes(p.id) })),
  }
}

/**
 * Ile treści niesie zarchiwizowana prośba poza tytułem — do etykiety przycisku
 * i do ostrzeżenia przy trwałym usuwaniu, żeby nie kasowało się w ciemno.
 */
export function zawartoscArchiwalna(item) {
  const notatki = archiwalneNotatki(item)
  const lista = archiwalnaLista(item)
  return {
    notatki,
    lista,
    maOpis: !lista && !!String(item?.note || '').trim(),
    maCokolwiek: notatki.length > 0 || !!lista || !!String(item?.note || '').trim() || !!String(item?.endedNote || '').trim(),
  }
}

export const odmianaNotatek = (n) =>
  n === 1 ? 'notatka' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'notatki' : 'notatek'

/** Teksty prośby, po których ma działać szukanie w archiwum. */
export function przeszukiwalneTeksty(item) {
  const lista = archiwalnaLista(item)
  return [
    item?.title,
    item?.endedNote,
    ...(lista ? lista.punkty.map(p => p.text) : [item?.note]),
    ...archiwalneNotatki(item).map(n => n.text),
  ].filter(t => typeof t === 'string' && t.trim())
}
