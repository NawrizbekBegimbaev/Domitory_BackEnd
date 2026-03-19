import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, DoorOpen, FileText,
  Wallet, BarChart3, Shield, UserCog, LogOut, Building2, Globe,
} from 'lucide-react'
import type { User } from '../types'
import { getInitials } from '../utils/format'
import { useTranslation } from '../i18n'
import type { LucideIcon } from 'lucide-react'
import type { Translations } from '../i18n'

interface NavItem {
  to: string
  icon: LucideIcon
  labelKey: keyof Translations
  roles: string[]
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'navHome', roles: ['platform_admin', 'university_admin', 'dorm_manager', 'accountant', 'security_staff'] },
  { to: '/residents', icon: Users, labelKey: 'navResidents', roles: ['platform_admin', 'university_admin', 'dorm_manager', 'security_staff'] },
  { to: '/buildings', icon: Building2, labelKey: 'navBuildings', roles: ['platform_admin', 'university_admin', 'dorm_manager'] },
  { to: '/rooms', icon: DoorOpen, labelKey: 'navRooms', roles: ['platform_admin', 'university_admin', 'dorm_manager', 'security_staff'] },
  { to: '/contracts', icon: FileText, labelKey: 'navContracts', roles: ['platform_admin', 'university_admin', 'dorm_manager'] },
  { to: '/finance', icon: Wallet, labelKey: 'navFinance', roles: ['platform_admin', 'university_admin', 'accountant'] },
  { to: '/reports', icon: BarChart3, labelKey: 'navReports', roles: ['platform_admin', 'university_admin', 'dorm_manager', 'accountant', 'security_staff'] },
  { to: '/audit', icon: Shield, labelKey: 'navAudit', roles: ['platform_admin', 'university_admin'] },
  { to: '/users', icon: UserCog, labelKey: 'navUsers', roles: ['platform_admin', 'university_admin'] },
]

interface Props {
  user: User
  onLogout: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ user, onLogout, mobileOpen = false, onMobileClose }: Props) {
  const navigate = useNavigate()
  const { t, lang, setLang } = useTranslation()
  const roleName = user.role?.name || ''
  const visibleItems = navItems.filter((item) => item.roles.includes(roleName))

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <aside className={`fixed left-0 top-0 bottom-0 w-56 bg-dark-card border-r border-dark-border flex flex-col z-50 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="flex items-center gap-2 px-5 py-5 border-b border-dark-border">
        <Building2 size={24} className="text-accent" />
        <div>
          <div className="font-bold text-sm tracking-widest text-accent">DORMITORY</div>
          <div className="text-[10px] text-text-muted uppercase">{roleName.replace('_', ' ')}</div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-accent/10 text-accent font-medium' : 'text-text-secondary hover:bg-dark-hover hover:text-white'
              }`
            }
          >
            <item.icon size={18} />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-dark-border p-3">
        {/* Language switcher */}
        <div className="flex items-center gap-1 px-2 py-1.5 mb-2">
          <Globe size={14} className="text-text-muted" />
          <div className="flex gap-1 ml-1">
            {(['ru', 'uz', 'kk'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  lang === l ? 'bg-accent text-white' : 'text-text-muted hover:text-white'
                }`}
              >
                {l === 'ru' ? 'RU' : l === 'uz' ? 'UZ' : 'QQ'}
              </button>
            ))}
          </div>
        </div>

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
          {t('logout')}
        </button>
      </div>
    </aside>
  )
}
