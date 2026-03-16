import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import type { User } from '../types'

interface Props {
  user: User
  onLogout: () => void
}

export default function Layout({ user, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-dark-bg">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="ml-56 p-6">
        <Outlet />
      </main>
    </div>
  )
}
