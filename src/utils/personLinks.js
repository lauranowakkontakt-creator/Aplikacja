// Czysta logika powiązań osób z innymi modułami (długi, zadania).
// Bez Firebase, żeby dała się testować.
//
// Dług (kolekcja `debtors`) może mieć `personId` wskazujący na osobę z bazy
// `calendarPeople`. Zadanie (kolekcja `todos`) może mieć listę `peopleIds`.

// Długi powiązane z daną osobą.
export function debtsForPerson(debts, personId) {
  if (!personId) return []
  return (debts || []).filter(d => d.personId === personId)
}

// Podsumowanie kwot dla listy długów — liczymy tylko nierozliczone.
//   theyOwe — ktoś jest winien mnie
//   iOwe    — ja jestem winna
//   net     — saldo (dodatnie = na moją korzyść)
export function debtSummary(debts) {
  const active = (debts || []).filter(d => !d.settled)
  const theyOwe = active.filter(d => d.direction === 'theyOwe').reduce((s, d) => s + (d.amount || 0), 0)
  const iOwe    = active.filter(d => d.direction === 'iOwe').reduce((s, d) => s + (d.amount || 0), 0)
  return { theyOwe, iOwe, net: theyOwe - iOwe }
}

// Zadania dotyczące danej osoby.
export function todosForPerson(todos, personId) {
  if (!personId) return []
  return (todos || []).filter(t => (t.peopleIds || []).includes(personId))
}

// Zliczenie aktywnych powiązań per osoba — do etykiet w bazie osób.
export function linkCountsByPerson(people, debts, todos) {
  const m = {}
  ;(people || []).forEach(p => { m[p.id] = { debts: 0, todos: 0 } })
  ;(debts || []).forEach(d => {
    if (!d.settled && d.personId && m[d.personId]) m[d.personId].debts++
  })
  ;(todos || []).forEach(t => {
    if (t.done) return
    ;(t.peopleIds || []).forEach(pid => { if (m[pid]) m[pid].todos++ })
  })
  return m
}
