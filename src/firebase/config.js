import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// Konfiguracja środowiska.
//
// Uwaga o „sekretach": klucze webowe Firebase NIE są sekretem — i tak lądują
// w bundlu, który każdy może pobrać. Prawdziwą ochroną danych są reguły
// Firestore (firestore.rules), nie ukrywanie tych wartości. Dlatego domyślne
// wartości zostają w repo: apka działa po `git clone` bez żadnego setupu.
//
// Zmienne VITE_FB_* pozwalają podstawić INNY projekt Firebase bez dotykania
// kodu — po to, żeby dev/staging nie pisały do produkcyjnej bazy. Wystarczy
// plik .env.development.local albo .env.production.local (patrz .env.example);
// te pliki są w .gitignore.
const fromEnv = {
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
}

const DEFAULT_CONFIG = {
  apiKey: "AIzaSyDIuO8Q_gjmbWrUQc_pnigWfrEfT8FmGA0",
  authDomain: "aplikacja-0.firebaseapp.com",
  projectId: "aplikacja-0",
  storageBucket: "aplikacja-0.firebasestorage.app",
  messagingSenderId: "781228324479",
  appId: "1:781228324479:web:ea109051fbea2f30ebf14a"
}

// Podstawiamy komplet albo nic. Wymieszanie połówek dwóch projektów
// (np. apiKey ze stagingu + projectId z produkcji) daje błędy uwierzytelniania,
// które bardzo trudno zdiagnozować — lepiej wymusić spójny zestaw.
const hasFullEnvConfig = Object.values(fromEnv).every(v => typeof v === 'string' && v.length > 0)
export const firebaseConfig = hasFullEnvConfig ? fromEnv : DEFAULT_CONFIG

// Widoczne w konsoli, do którego projektu apka faktycznie pisze — pierwsza
// rzecz, którą chce się wiedzieć przy „czemu nie widzę swoich danych".
if (import.meta.env.DEV) {
  console.info(`[firebase] projekt: ${firebaseConfig.projectId}${hasFullEnvConfig ? ' (z .env)' : ' (domyślny)'}`)
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
