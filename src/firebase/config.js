import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// UZUPEŁNIJ te dane po stworzeniu projektu Firebase (patrz instrukcja poniżej)
const firebaseConfig = {
  apiKey: "AIzaSyDIu08Q_gjmbWrUQc_pnigWfrEfT8FmGA0",
  authDomain: "aplikacja-0.firebaseapp.com",
  projectId: "aplikacja-0",
  storageBucket: "aplikacja-0.firebasestorage.app",
  messagingSenderId: "781228324479",
  appId: "1:781228324479:web:ea109051fbea2f30ebf14a"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
