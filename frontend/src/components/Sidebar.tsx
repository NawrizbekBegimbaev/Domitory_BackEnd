import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, DoorOpen, FileText,
  Wallet, BarChart3, Shield, UserCog, LogOut, Building2, Globe, ScanLine, GraduationCap, CalendarCheck,
} from 'lucide-react'
import type { User, University } from '../types'
import { getInitials } from '../utils/format'
import { useTranslation } from '../i18n'
import { universitiesApi } from '../api/endpoints'
import { isGlobalRole, getScopeUniversity, setScopeUniversity } from '../hooks/useCurrentUser'
import type { LucideIcon } from 'lucide-react'
import type { Translations } from '../i18n'

interface NavItem {
  to: string
  icon: LucideIcon
  labelKey: keyof Translations
  roles: string[]
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'navHome', roles: ['platform_admin', 'university_admin', 'dorm_manager', 'accountant', 'security_staff', 'ministry'] },
  { to: '/universities', icon: GraduationCap, labelKey: 'navUniversities', roles: ['platform_admin'] },
  { to: '/residents', icon: Users, labelKey: 'navResidents', roles: ['platform_admin', 'university_admin', 'dorm_manager', 'security_staff', 'ministry'] },
  { to: '/buildings', icon: Building2, labelKey: 'navBuildings', roles: ['platform_admin', 'university_admin', 'dorm_manager', 'ministry'] },
  { to: '/rooms', icon: DoorOpen, labelKey: 'navRooms', roles: ['platform_admin', 'university_admin', 'dorm_manager', 'security_staff', 'ministry'] },
  { to: '/contracts', icon: FileText, labelKey: 'navContracts', roles: ['platform_admin', 'university_admin', 'dorm_manager'] },
  { to: '/admission', icon: CalendarCheck, labelKey: 'navAdmission', roles: ['platform_admin', 'university_admin', 'dorm_manager'] },
  { to: '/finance', icon: Wallet, labelKey: 'navFinance', roles: ['platform_admin', 'university_admin', 'accountant', 'ministry'] },
  { to: '/reports', icon: BarChart3, labelKey: 'navReports', roles: ['platform_admin', 'university_admin', 'dorm_manager', 'accountant', 'security_staff', 'ministry'] },
  { to: '/access', icon: ScanLine, labelKey: 'navAccess', roles: ['platform_admin', 'university_admin', 'dorm_manager', 'security_staff'] },
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
  const global = isGlobalRole(user)
  const [universities, setUniversities] = useState<University[]>([])
  const [scope, setScope] = useState(getScopeUniversity())

  useEffect(() => {
    if (!global) return
    universitiesApi.list().then((r) => setUniversities(r.data.results)).catch(() => {})
  }, [global])

  const changeScope = (id: string) => {
    setScopeUniversity(id)
    setScope(id)
    window.location.reload()
  }

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <aside className={`fixed left-0 top-0 bottom-0 w-56 bg-dark-card border-r border-dark-border flex flex-col z-50 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-dark-border">
        <div>
          <div className="font-bold text-base tracking-wide text-accent leading-tight">EDormitory</div>
          <div className="text-[10px] text-text-muted uppercase mt-1">{roleName.replace('_', ' ')}</div>
          {!global && user.university && (
            <div className="text-[11px] text-text-secondary mt-1 truncate max-w-40" title={user.university.name}>{user.university.short_name || user.university.name}</div>
          )}
        </div>
      </div>

      {global && (
        <div className="px-3 pt-3">
          <select value={scope} onChange={(e) => changeScope(e.target.value)} className="w-full text-xs">
            <option value="">{t('allUniversities')}</option>
            {universities.map((u) => <option key={u.id} value={u.id}>{u.short_name || u.name}</option>)}
          </select>
        </div>
      )}

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-accent/10 text-accent font-medium' : 'text-text-secondary hover:bg-dark-hover hover:text-accent'
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
            {(['ru', 'uz', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  lang === l ? 'bg-accent text-white' : 'text-text-muted hover:text-accent'
                }`}
              >
                {l === 'ru' ? 'RU' : l === 'uz' ? 'UZ' : 'EN'}
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
