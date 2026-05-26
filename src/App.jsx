import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Header from './components/Header'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (!user) {
    return <Login />
  }

  return (
    <div className="app">
      <Header user={user} />
      <main className="main-content">
        <Dashboard user={user} />
      </main>
    </div>
  )
}
