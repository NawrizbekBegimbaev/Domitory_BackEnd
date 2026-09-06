import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Building2, Users, BedDouble, Banknote, TrendingUp, X } from 'lucide-react'
import { reportsApi, universitiesApi } from '../api/endpoints'
import type { UniversitiesOverview, University } from '../types'
import StatCard from '../components/StatCard'
import { formatMoney } from '../utils/format'
import { useTranslation } from '../i18n'
import { useCurrentUser, setScopeUniversity } from '../hooks/useCurrentUser'

/**
 * Overview of every university (ministry home page) and, for platform_admin,
 * the place to create / edit universities.
 */
export default function UniversitiesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const canManage = user?.role?.name === 'platform_admin'
  const [overview, setOverview] = useState<UniversitiesOverview | null>(null)
  const [editing, setEditing] = useState<Partial<University> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const reload = () => {
    reportsApi.universities().then((r) => setOverview(r.data)).catch(() => setOverview(null))
  }
  useEffect(() => { reload() }, [])

  const openUniversity = (id: string) => {
    setScopeUniversity(id)
    navigate('/dashboard')
    window.location.reload()
  }

  const save = async () => {
    if (!editing?.name) return
    setSaving(true); setError('')
    try {
      const payload = { name: editing.name, short_name: editing.short_name || '', city: editing.city || '', address: editing.address || '' }
      if (editing.id) await universitiesApi.update(editing.id, payload)
      else await universitiesApi.create(payload)
      setEditing(null)
      reload()
    } catch (err: any) {
      setError(err.response?.data?.name?.[0] || err.response?.data?.error?.message || t('error'))
    } finally { setSaving(false) }
  }

  const totals = overview?.totals

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('universitiesTitle')}</h1>
          <p className="text-text-muted text-sm">{t('universitiesDesc')}</p>
        </div>
        {canManage && (
          <button onClick={() => setEditing({ name: '', short_name: '', city: '' })}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus size={16} /> {t('addUniversity')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={<Building2 size={18} className="text-accent" />} label={t('universitiesTitle')} value={totals?.universities ?? '—'} />
        <StatCard icon={<Users size={18} className="text-accent" />} label={t('dashResidents')} value={totals?.total_residents ?? '—'} />
        <StatCard icon={<BedDouble size={18} className="text-accent" />} label={t('dashFreeBeds')} value={totals?.free_beds ?? '—'} subtitle={totals ? `${t('occupancyLoad')} ${totals.occupancy_percentage}%` : undefined} />
        <StatCard icon={<Banknote size={18} className="text-red-400" />} label={t('dashDebt')} value={totals ? `${formatMoney(totals.total_debt)} UZS` : '—'} />
        <StatCard icon={<TrendingUp size={18} className="text-green-400" />} label={t('dashCollected')} value={totals ? `${formatMoney(totals.collected_this_quarter)} UZS` : '—'} />
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
              <th className="text-left py-3 px-4">{t('university')}</th>
              <th className="text-left py-3 px-4">{t('city')}</th>
              <th className="text-center py-3 px-4">{t('navBuildings')}</th>
              <th className="text-center py-3 px-4">{t('dashResidents')}</th>
              <th className="text-center py-3 px-4">{t('dashCapacity')}</th>
              <th className="py-3 px-4">{t('dashLoad')}</th>
              <th className="text-right py-3 px-4">{t('dashDebt')}</th>
              <th className="text-right py-3 px-4">{t('periodQuarter')}</th>
              <th className="text-right py-3 px-4">{t('periodYear')}</th>
              {canManage && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {overview?.universities.map((u) => (
              <tr key={u.university_id} onClick={() => openUniversity(u.university_id)}
                className="border-b border-dark-border/50 hover:bg-dark-hover cursor-pointer transition-colors">
                <td className="py-3 px-4">
                  <div className="font-medium">{u.university_name}</div>
                  {u.short_name && <div className="text-xs text-text-muted">{u.short_name}</div>}
                </td>
                <td className="py-3 px-4 text-text-secondary">{u.city || '—'}</td>
                <td className="py-3 px-4 text-center text-text-secondary">{u.buildings}</td>
                <td className="py-3 px-4 text-center font-medium">{u.total_residents}</td>
                <td className="py-3 px-4 text-center text-text-secondary">{u.total_occupancy} / {u.total_capacity}</td>
                <td className="py-3 px-4 min-w-36">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${u.occupancy_percentage}%` }} />
                    </div>
                    <span className="text-sm text-text-secondary w-12 text-right">{u.occupancy_percentage}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-red-400 font-semibold tabular-nums">{formatMoney(u.total_debt)}</td>
                <td className="py-3 px-4 text-right text-green-400 font-semibold tabular-nums">{formatMoney(u.collected_this_quarter)}</td>
                <td className="py-3 px-4 text-right text-text-secondary tabular-nums">{formatMoney(u.collected_this_year)}</td>
                {canManage && (
                  <td className="py-3 px-4">
                    <button onClick={(e) => { e.stopPropagation(); setEditing({ id: u.university_id, name: u.university_name, short_name: u.short_name, city: u.city }) }}
                      className="text-text-muted hover:text-accent"><Pencil size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
            {(!overview || overview.universities.length === 0) && (
              <tr><td colSpan={10} className="py-8 text-center text-text-muted">{t('noData')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{editing.id ? t('editUniversity') : t('addUniversity')}</h2>
              <button onClick={() => setEditing(null)} className="text-text-muted hover:text-accent"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('universityName')} *</label>
                <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('shortName')}</label>
                <input value={editing.short_name || ''} onChange={(e) => setEditing({ ...editing, short_name: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('city')}</label>
                <input value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className="w-full" />
              </div>
              {error && <div className="text-red-400 text-sm">{error}</div>}
              <button onClick={save} disabled={saving || !editing.name}
                className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
