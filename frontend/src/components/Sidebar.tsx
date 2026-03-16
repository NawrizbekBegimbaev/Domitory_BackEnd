import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, DoorOpen, FileText,
  Wallet, BarChart3, Shield, UserCog, LogOut, Building2, Landmark,
} from 'lucide-react'
import type { User } from '../types'
import { getInitials } from '../utils/format'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Главная' },
  { to: '/residents', icon: Users, label: 'Жильцы' },
  { to: '/buildings', icon: Building2, label: 'Корпуса' },
  { to: '/rooms', icon: DoorOpen, label: 'Комнаты' },
  { to: '/contracts', icon: FileText, label: 'Договоры' },
  { to: '/finance', icon: Wallet, label: 'Финансы' },
  { to: '/reports', icon: BarChart3, label: 'Отчёты' },
  { to: '/audit', icon: Shield, label: 'Аудит' },
  { to: '/organizations', icon: Landmark, label: 'Организации' },
  { to: '/users', icon: UserCog, label: 'Пользователи' },
]

interface Props {
  user: User
  onLogout: () => void
}

export default function Sidebar({ user, onLogout }: Props) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-dark-card border-r border-dark-border flex flex-col z-50">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-dark-border">
        <Building2 size={24} className="text-accent" />
        <div>
          <div className="font-bold text-sm tracking-widest text-accent">DORMITORY</div>
          <div className="text-[10px] text-text-muted">Панель управления</div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:bg-dark-hover hover:text-white'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-dark-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
            {getInitials(user.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.full_name}</div>
            <div className="text-[10px] text-text-muted">Online</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-2 mt-1 text-sm text-red-400 hover:bg-dark-hover rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
    </aside>
  )
}
