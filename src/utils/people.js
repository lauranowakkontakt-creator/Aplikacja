import { collection, query, where, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'

// Osoba jest współdzielona przez wszystkie moduły (kolekcja `calendarPeople`).
// Widoczność jest sterowana per moduł: `hiddenInCalendar`, `hiddenInPrayer`.
// Osoba zawsze zostaje w centralnej bazie (zakładka „Osoby"), nawet gdy ukryta w module.

const FIELD = { calendar: 'hiddenInCalendar', prayer: 'hiddenInPrayer' }

// Ukryj / pokaż osobę w danym module ('calendar' | 'prayer').
export async function setPersonHidden(uid, personId, module, hidden) {
  const field = FIELD[module]
  if (!field) return
  await updateDoc(doc(db, 'users', uid, 'calendarPeople', personId), { [field]: hidden })
}

// Trwałe usunięcie — kasuje osobę ORAZ wszystkie jej wydarzenia i prośby modlitewne.
export async function purgePerson(uid, personId) {
  for (const col of ['calendarEvents', 'prayerIntentions']) {
    const snap = await getDocs(query(collection(db, 'users', uid, col), where('personId', '==', personId)))
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  }
  await deleteDoc(doc(db, 'users', uid, 'calendarPeople', personId))
}
