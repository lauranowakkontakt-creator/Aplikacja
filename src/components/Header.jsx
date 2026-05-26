import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'

export default function Header({ user }) {
  const handleLogout = () => signOut(auth)

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-logo">💰 Mój Budżet</div>
        <div className="header-user">
          <img src={user.photoURL} alt={user.displayName} className="avatar" />
          <span className="user-name">{user.displayName?.split(' ')[0]}</span>
          <button className="btn-logout" onClick={handleLogout}>Wyloguj</button>
        </div>
      </div>
    </header>
  )
}
