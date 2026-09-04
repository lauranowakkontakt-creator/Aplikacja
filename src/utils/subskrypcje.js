import { onSnapshot as onSnapshotFirestore } from 'firebase/firestore'
import { zPonawianiem } from './ponawianie.js'

// Firestore'owy onSnapshot z jedną różnicą: gdy dostanie handler błędu
// zrobiony przez bladSubskrypcji(), sam kasuje wpis o awarii po udanym
// snapshocie i ponawia subskrypcję zerwaną przez sieć. Cała logika siedzi
// w ponawianie.js — ten moduł tylko wiąże ją z SDK, żeby testy nie musiały
// importować firebase (import samego firebase/firestore w Node trwa dziesiątki
// sekund i zamieniłby szybkie testy jednostkowe w mękę).
//
// Nazwa eksportu jest celowo taka sama jak w SDK: moduły podmieniają wyłącznie
// ścieżkę importu, a wywołania zostają bez zmian.
export function onSnapshot(zapytanie, przyDanych, przyBledzie) {
  return zPonawianiem(onSnapshotFirestore, zapytanie, przyDanych, przyBledzie)
}
