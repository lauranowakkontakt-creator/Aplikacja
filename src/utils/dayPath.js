// Logika „ścieżki dnia" — wspólny język Nawyków i To-do.
// Czyste funkcje (bez Reacta/Firebase) — łatwe do testowania.

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

// Podsumowanie dowolnej listy stacji [{ done }].
// Zwraca ile zrobione, ile łącznie i procent ukończenia (0 gdy brak stacji).
export function pathSummary(steps = []) {
  const total = steps.length
  const doneCount = steps.filter(s => s.done).length
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
  return { doneCount, total, pct }
}

// Buduje model ścieżki dla To-do na wybrany dzień.
// tasks: [{ title, done, dueDate, priority }], today: 'yyyy-MM-dd'.
// Priorytet: zadania z terminem = dziś. Gdy takich brak — bierzemy aktywne (bez terminu też),
// żeby karta zawsze była użyteczna. Kolejność: najpierw niezrobione (wg priorytetu), zrobione na końcu.
export function todoDayPath(tasks = [], today, { max = 6 } = {}) {
  const dueToday = tasks.filter(t => t.dueDate === today)
  const usingDue = dueToday.length > 0
  const source = usingDue ? dueToday : tasks.filter(t => !t.done)

  const sorted = [...source].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1
    return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  })

  const steps = sorted.slice(0, max)
  const { doneCount, total, pct } = pathSummary(steps)
  const remaining = steps.filter(s => !s.done).map(s => s.title)
  return { steps, doneCount, total, pct, remaining, usingDue }
}

// Zdanie „zostały: A, B, C" (+ „i N innych" gdy lista długa). Zwraca '' gdy nic nie zostało.
export function remainingText(titles = [], { max = 3 } = {}) {
  if (titles.length === 0) return ''
  if (titles.length <= max) return titles.join(', ')
  const shown = titles.slice(0, max).join(', ')
  const rest = titles.length - max
  return `${shown} i ${rest} ${rest === 1 ? 'inne' : 'innych'}`
}
