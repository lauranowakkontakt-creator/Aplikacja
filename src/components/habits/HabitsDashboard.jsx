import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { format, startOfWeek, addDays, subDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import HabitForm from './HabitForm'

const TODAY = format(new Date(), 'yyyy-MM-dd')

function getStreak(completedDates) {
  if (!completedDates?.length) return 0
  let streak = 0
  let day = new Date()
  if (!completedDates.includes(format(day, 'yyyy-MM-dd'))) {
    day = subDays(day, 1)
  }
  while (completedDates.includes(format(day, 'yyyy-MM-dd'))) {
    streak++
    day = subDays(day, 1)
  }
  return streak
}

export default function HabitsDashboard({ user }) {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editHabit, setEditHabit] = useState(null)

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE', { locale: pl }), dayNum: format(d, 'd') }
  })

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'habits'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user.uid])

  const toggleDay = async (habit, date) => {
    const ref = doc(db, 'users', user.uid, 'habits', habit.id)
    const done = habit.completedDates?.includes(date)
    await updateDoc(ref, {
      completedDates: done ? arrayRemove(date) : arrayUnion(date)
    })
  }

  const doneToday = habits.filter(h => h.completedDates?.includes(TODAY)).length
  const totalToday = habits.length

  if (loading) return <div className="list-loading">Ładowanie...</div>

  return (
    <div className="habits-dashboard">
      {/* Nagłówek */}
      <div className="habits-header">
        <div>
          <h2 className="habits-title">Nawyki</h2>
          <p className="habits-subtitle">
            {totalToday === 0 ? 'Dodaj swój pierwszy nawyk' : `Dziś: ${doneToday} / ${totalToday}`}
          </p>
        </div>
        <button className="btn-add-habit" onClick={() => setShowForm(true)}>+ Nowy</button>
      </div>

      {/* Pasek postępu */}
      {totalToday > 0 && (
        <div className="progress-bar-wrap">
          <div className="progress-bar" style={{ width: `${(doneToday / totalToday) * 100}%` }} />
        </div>
      )}

      {/* Lista nawyków */}
      {habits.length === 0 ? (
        <div className="list-empty">
          <p>Brak nawyków</p>
          <p className="list-empty-hint">Kliknij "+ Nowy" aby dodać pierwszy nawyk</p>
        </div>
      ) : (
        <div className="habits-list">
          {/* Nagłówek tygodnia */}
          <div className="week-header">
            <div className="habit-name-col" />
            {weekDays.map(d => (
              <div key={d.date} className={`week-day-col ${d.date === TODAY ? 'today' : ''}`}>
                <span className="week-day-name">{d.label}</span>
                <span className="week-day-num">{d.dayNum}</span>
              </div>
            ))}
          </div>

          {/* Wiersze nawyków */}
          {habits.map(habit => {
            const streak = getStreak(habit.completedDates)
            return (
              <div key={habit.id} className="habit-row">
                <div className="habit-name-col" onClick={() => { setEditHabit(habit); setShowForm(true) }}>
                  <span className="habit-emoji">{habit.emoji}</span>
                  <div className="habit-info">
                    <span className="habit-name">{habit.name}</span>
                    {streak > 0 && <span className="habit-streak">🔥 {streak}</span>}
                  </div>
                </div>
                {weekDays.map(d => {
                  const done = habit.completedDates?.includes(d.date)
                  const isFuture = d.date > TODAY
                  return (
                    <button
                      key={d.date}
                      className={`habit-check ${done ? 'done' : ''} ${isFuture ? 'future' : ''} ${d.date === TODAY ? 'today' : ''}`}
                      onClick={() => !isFuture && toggleDay(habit, d.date)}
                      disabled={isFuture}
                    >
                      {done ? '✓' : ''}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <HabitForm
          user={user}
          onClose={() => { setShowForm(false); setEditHabit(null) }}
          editData={editHabit}
        />
      )}
    </div>
  )
}
