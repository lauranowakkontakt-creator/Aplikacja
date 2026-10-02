import { initializeApp } from 'firebase/app'
import { getFirestore, doc, updateDoc, deleteField } from 'firebase/firestore'

const app = initializeApp({ projectId: 'test-walidacji', apiKey: 'x', appId: 'x' })
const db = getFirestore(app)
const ref = doc(db, 'users', 'u1', 'habits', 'h1')

const sprobuj = async (nazwa, dane) => {
  try {
    // Walidacja sciezki dzieje sie LOKALNIE i synchronicznie, zanim poleci zapytanie.
    updateDoc(ref, dane)
    console.log(`OK    ${nazwa}`)
  } catch (e) {
    console.log(`BLAD  ${nazwa}\n      ${e.message.split('\n')[0]}`)
  }
}

await sprobuj("amounts.2026-10-02 (tak jak w kodzie)", { 'amounts.2026-10-02': 5 })
await sprobuj("checklistDone.2026-10-02 (istniejacy wzorzec)", { 'checklistDone.2026-10-02': [] })
await sprobuj("amounts.`2026-10-02` (w backtickach)", { 'amounts.`2026-10-02`': 5 })
await sprobuj("amounts.d2026 (zwykly identyfikator)", { 'amounts.d2026': 5 })
await sprobuj("deleteField na dacie", { 'amounts.2026-10-02': deleteField() })
