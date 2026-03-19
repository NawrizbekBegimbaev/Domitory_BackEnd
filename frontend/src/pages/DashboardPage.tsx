import { useEffect, useState } from 'react'
import { Users, BedDouble, Banknote, TrendingUp } from 'lucide-react'
import { reportsApi } from '../api/endpoints'
import type { SummaryReport, OccupancyBuilding, Debtor } from '../types'
import StatCard from '../components/StatCard'
import { formatMoney } from '../utils/format'
import { useTranslation } from '../i18n'

export default function DashboardPage() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<SummaryReport | null>(null)
  const [occupancy, setOccupancy] = useState<OccupancyBuilding[]>([])
  const [debtors, setDebtors] = useState<Debtor[]>([])

  useEffect(() => {
    reportsApi.summary().then((r) => setSummary(r.data)).catch(() => {})
    reportsApi.occupancy().then((r) => setOccupancy(r.data)).catch(() => {})
    reportsApi.debtors().then((r) => setDebtors(r.data)).catch(() => {})
  }, [])

  const today = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-text-muted text-sm">{t('navHome')}</div>
          <h1 className="text-2xl font-bold mt-1">{t('dashTitle')}</h1>
        </div>
        <div className="text-text-secondary text-sm">{today}</div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Users size={18} className="text-accent" />}
          label={t('dashResidents')}
          value={summary?.total_residents ?? '—'}
        />
        <StatCard
          icon={<BedDouble size={18} className="text-accent" />}
          label={t('dashFreeBeds')}
          value={summary?.free_beds ?? '—'}
        />
        <StatCard
          icon={<Banknote size={18} className="text-red-400" />}
          label={t('dashDebt')}
          value={summary ? `${formatMoney(summary.total_debt)} UZS` : '—'}
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-green-400" />}
          label={t('dashCollected')}
          value={summary ? `${formatMoney(summary.collected_this_month)} UZS` : '—'}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Occupancy */}
        <div className="col-span-2 bg-dark-card border border-dark-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{t('dashOccupancy')}</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-text-muted text-xs uppercase">
                <th className="text-left py-2">{t('building')}</th>
                <th className="text-center py-2">{t('dashCapacity')}</th>
                <th className="text-center py-2">{t('dashOccupied')}</th>
                <th className="py-2">{t('dashLoad')}</th>
              </tr>
            </thead>
            <tbody>
              {occupancy.map((b) => (
                <tr key={b.building_id} className="border-t border-dark-border/50">
                  <td className="py-3 font-medium">{b.building_name}</td>
                  <td className="text-center text-text-secondary">{b.capacity}</td>
                  <td className="text-center text-text-secondary">{b.occupancy}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${b.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-text-secondary w-12 text-right">{b.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {occupancy.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-text-muted">{t('noData')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top debtors */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">{t('dashTopDebtors')}</h2>
          <div className="space-y-3">
            {debtors.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                  {d.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.full_name}</div>
                  <div className="text-xs text-text-muted">{d.faculty}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-red-400">{formatMoney(d.debt)}</div>
                  <div className="text-[10px] text-text-muted">UZS</div>
                </div>
              </div>
            ))}
            {debtors.length === 0 && (
              <div className="text-text-muted text-sm text-center py-4">{t('dashNoDebtors')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
