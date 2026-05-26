import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import Login from './components/Login'
import Navigation from './components/Navigation'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import HabitsDashboard from './components/habits/HabitsDashboard'

const MODULES = {
  BUDGET: 'budget',
  HABITS: 'habits',
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState(MODULES.BUDGET)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Ładowanie...</p>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="app">
      <Header user={user} />
      <div className="app-body">
        <Navigation active={activeModule} onChange={setActiveModule} />
        <main className="main-content">
          {activeModule === MODULES.BUDGET && <Dashboard user={user} />}
          {activeModule === MODULES.HABITS && <HabitsDashboard user={user} />}
        </main>
      </div>
    </div>
  )
}
