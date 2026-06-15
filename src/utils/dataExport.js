import { collection, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'

// Wszystkie podkolekcje użytkownika
const COLLECTIONS = [
  'accounts', 'transactions', 'regularPayments', 'savingsGoals', 'shoppingItems',
  'habits', 'habitPauses', 'habitCategories',
  'moodLogs', 'todos', 'todoLists',
  'calendarEvents', 'calendarPeople', 'calendarCategories',
  'prayerIntentions', 'prayerPeople', 'bibleNotes',
]
// Pojedyncze dokumenty
const SINGLE_DOCS = [
  ['bible', 'progress'],
  ['settings', 'categories'],
  ['settings', 'shopCategories'],
  ['settings', 'tithe'],
]

// Firestore Timestamp → ISO string (czytelne i odtwarzalne)
function serialize(value) {
  if (value == null) return value
  if (typeof value?.toDate === 'function') return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(serialize)
  if (typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[k] = serialize(value[k])
    return out
  }
  return value
}

function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const stamp = () => new Date().toISOString().slice(0, 10)

// Pełna kopia wszystkich danych do JSON
export async function exportAllJSON(uid) {
  const data = { exportedAt: new Date().toISOString(), version: 1 }
  for (const name of COLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', uid, name))
    data[name] = snap.docs.map(d => ({ id: d.id, ...serialize(d.data()) }))
  }
  data.singles = {}
  for (const [col, id] of SINGLE_DOCS) {
    const d = await getDoc(doc(db, 'users', uid, col, id))
    if (d.exists()) data.singles[`${col}/${id}`] = serialize(d.data())
  }
  download(`moj-swiat-kopia-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json')
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Eksport transakcji do CSV (np. do Excela)
export async function exportTransactionsCSV(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'transactions'))
  const rows = snap.docs.map(d => {
    const t = d.data()
    const date = t.date?.toDate ? t.date.toDate().toISOString().slice(0, 10) : ''
    return [date, t.type === 'income' ? 'przychód' : 'wydatek', t.amount, t.category, t.subcategoryLabel || '', t.description || '', t.accountId || '']
  }).sort((a, b) => b[0].localeCompare(a[0]))
  const header = ['Data', 'Typ', 'Kwota', 'Kategoria', 'Podkategoria', 'Opis', 'Konto']
  const csv = '﻿' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\n')
  download(`moj-swiat-transakcje-${stamp()}.csv`, csv, 'text/csv;charset=utf-8')
}
