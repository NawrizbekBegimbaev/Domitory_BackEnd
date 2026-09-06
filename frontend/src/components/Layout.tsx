import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import type { User } from '../types'

interface Props {
  user: User
  onLogout: () => void
}

export default function Layout({ user, onLogout }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-dark-card border-b border-dark-border flex items-center px-4 z-40">
        <button onClick={() => setSidebarOpen(true)} className="text-text-muted hover:text-accent">
          <Menu size={24} />
        </button>
        <span className="ml-3 font-bold text-accent tracking-wide text-sm">EDormitory</span>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar user={user} onLogout={onLogout} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-56 p-4 lg:p-6">
        {/* Spacer for mobile fixed header */}
        <div className="h-12 lg:h-0" />
        <Outlet />
      </main>
    </div>
  )
}
