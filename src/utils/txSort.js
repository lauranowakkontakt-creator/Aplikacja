// Czysta logika sortowania transakcji — BEZ zależności od Firebase.
// Listy transakcji pokazują najnowszą DATĘ transakcji na górze,
// a w obrębie tego samego dnia — ostatnio dodaną najpierw.

// Obsługuje Firestore Timestamp (.toMillis), Date (.getTime) i liczby.
const millis = (v) => v?.toMillis?.() ?? v?.getTime?.() ?? (typeof v === 'number' ? v : 0)

export function sortTransactionsByDate(txs) {
  return [...txs].sort((a, b) =>
    millis(b.date) - millis(a.date) || millis(b.createdAt) - millis(a.createdAt)
  )
}
