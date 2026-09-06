import { useEffect, useState, type ReactNode } from 'react'
import { Building2, Users, BedDouble, ChevronRight } from 'lucide-react'
import { reportsApi } from '../api/endpoints'
import type { UniversityStats } from '../types'
import { useTranslation } from '../i18n'
import { useCurrentUser, isGlobalRole, getScopeUniversity, setScopeUniversity } from '../hooks/useCurrentUser'

/**
 * For global roles (platform_admin, ministry) with no university selected in the
 * sidebar, a page shows the list of universities first; picking one scopes the page.
 * Scoped users and global users with a selected university see the page directly.
 */
export default function UniversityGate({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation()
  const user = useCurrentUser()
  const gated = isGlobalRole(user) && !getScopeUniversity()
  const [items, setItems] = useState<UniversityStats[] | null>(null)

  useEffect(() => {
    if (!gated) return
    reportsApi.universities().then((r) => setItems(r.data.universities)).catch(() => setItems([]))
  }, [gated])

  if (!gated) return <>{children}</>

  const pick = (id: string) => {
    setScopeUniversity(id)
    window.location.reload()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-text-muted text-sm">{t('gateHint')}</p>
      </div>
      {items === null ? (
        <div className="text-text-muted text-sm">{t('loading')}</div>
      ) : items.length === 0 ? (
        <div className="text-text-muted text-sm">{t('noUniversitiesYet')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((u) => (
            <button key={u.university_id} onClick={() => pick(u.university_id)}
              className="text-left bg-dark-card border border-dark-border hover:border-accent rounded-xl p-5 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{u.university_name}</div>
                  <div className="text-xs text-text-muted">{u.short_name}{u.short_name && u.city ? ' · ' : ''}{u.city}</div>
                </div>
                <ChevronRight size={18} className="text-text-muted group-hover:text-accent shrink-0" />
              </div>
              <div className="flex gap-4 mt-4 text-sm text-text-secondary">
                <span className="flex items-center gap-1"><Building2 size={14} /> {u.buildings}</span>
                <span className="flex items-center gap-1"><Users size={14} /> {u.total_residents}</span>
                <span className="flex items-center gap-1"><BedDouble size={14} /> {u.free_beds}</span>
                <span className="ml-auto text-accent font-medium">{u.occupancy_percentage}%</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
