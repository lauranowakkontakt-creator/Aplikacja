import { useEffect } from 'react'

// Zabezpieczenie odświeżania: jeśli pierwsza subskrypcja Firestore nie odpowie
// (chwilowy brak sieci, zimny start, cichy błąd), zdejmij spinner po `ms`, żeby
// moduł nie utknął na „Ładowanie…". Gdy dane dotrą później, onSnapshot i tak je
// pokaże na żywo — bez potrzeby ręcznego przełączania zakładek.
export default function useFallbackTimeout(clear, ms = 4000) {
  useEffect(() => {
    const t = setTimeout(clear, ms)
    return () => clearTimeout(t)
    // clear = setter z useState (stabilna tożsamość); efekt ma zadziałać raz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
