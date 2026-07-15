import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// UZUPEŁNIJ te dane po stworzeniu projektu Firebase (patrz instrukcja poniżej)
const firebaseConfig = {
  apiKey: "AIzaSyDIuO8Q_gjmbWrUQc_pnigWfrEfT8FmGA0",
  authDomain: "aplikacja-0.firebaseapp.com",
  projectId: "aplikacja-0",
  storageBucket: "aplikacja-0.firebasestorage.app",
  messagingSenderId: "781228324479",
  appId: "1:781228324479:web:ea109051fbea2f30ebf14a"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Firestore z twardszym transportem i lokalnym cache — leczy „czasami nic się
// nie ładuje, a odświeżanie nie pomaga":
//  - experimentalAutoDetectLongPolling: gdy sieć/proxy/bloker/VPN blokuje
//    strumień WebChannel (typowa przyczyna wiszącego onSnapshot), SDK sam
//    wykrywa problem i przechodzi na long-polling, zamiast wisieć w nieskończoność.
//  - persistentLocalCache (IndexedDB, wiele kart): dane z poprzedniej wizyty
//    pokazują się od razu z cache — nawet zanim sieć odpowie i nawet offline —
//    więc moduł nie zostaje pusty, dopóki połączenie się nie odświeży.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
