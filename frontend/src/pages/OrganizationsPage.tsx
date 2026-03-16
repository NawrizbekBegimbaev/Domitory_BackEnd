import { useEffect, useState } from 'react'
import { Plus, Building2 } from 'lucide-react'
import { organizationsApi } from '../api/endpoints'
import type { Organization, PaginatedResponse } from '../types'
import { formatDate, getInitials } from '../utils/format'

const orgTypeLabels: Record<string, string> = {
  university: 'Университет',
  college: 'Колледж',
  academy: 'Академия',
  institute: 'Институт',
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [selected, setSelected] = useState<Organization | null>(null)

  useEffect(() => {
    organizationsApi.list({ page_size: '100' }).then((r) => {
      const list = (r.data as PaginatedResponse<Organization>).results
      setOrgs(list)
      if (list.length > 0) setSelected(list[0])
    }).catch(() => {})
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Организации</h1>
          <p className="text-text-muted text-sm">Управление университетами и учебными заведениями</p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
          <Plus size={16} /> Добавить организацию
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Table */}
        <div className="col-span-2 bg-dark-card border border-dark-border rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
                <th className="text-left py-3 px-4">Организация</th>
                <th className="text-left py-3 px-4">Краткое название</th>
                <th className="text-left py-3 px-4">Тип</th>
                <th className="text-right py-3 px-4">Корпусов</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className={`border-b border-dark-border/50 cursor-pointer transition-colors ${selected?.id === o.id ? 'bg-accent/5' : 'hover:bg-dark-hover'}`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                        {getInitials(o.short_name || o.name)}
                      </div>
                      <div>
                        <div className="font-medium">{o.name}</div>
                        <div className="text-xs text-text-muted">{o.contact_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-text-secondary">{o.short_name}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs">{orgTypeLabels[o.org_type] || o.org_type}</span>
                  </td>
                  <td className="py-3 px-4 text-right">—</td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-text-muted">Нет организаций</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="bg-dark-card border border-dark-border rounded-xl p-6">
            <div className="text-center mb-6">
              <span className="text-xs font-medium px-2 py-1 rounded bg-accent/10 text-accent uppercase">
                {orgTypeLabels[selected.org_type] || selected.org_type}
              </span>
              <div className="w-14 h-14 rounded-xl bg-accent/20 text-accent flex items-center justify-center text-xl font-bold mx-auto mt-3 mb-2">
                {getInitials(selected.short_name || selected.name)}
              </div>
              <h3 className="font-bold">{selected.name}</h3>
              <div className="text-xs text-text-muted mt-1">ID: {selected.id.slice(0, 12)}</div>
            </div>

            <div className="space-y-3 text-sm mb-6">
              {selected.address && (
                <div>
                  <div className="text-text-muted text-xs uppercase">Адрес</div>
                  <div>{selected.address}</div>
                </div>
              )}
              {selected.contact_phone && (
                <div>
                  <div className="text-text-muted text-xs uppercase">Телефон</div>
                  <div>{selected.contact_phone}</div>
                </div>
              )}
              {selected.contact_email && (
                <div>
                  <div className="text-text-muted text-xs uppercase">Email</div>
                  <div>{selected.contact_email}</div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover transition-colors">
                Редактировать
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">
                Заблокировать
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
