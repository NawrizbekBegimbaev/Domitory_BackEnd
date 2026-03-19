import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { usersApi } from '../api/endpoints'
import { useAuth } from '../hooks/useAuth'
import type { User, PaginatedResponse } from '../types'
import Pagination from '../components/Pagination'
import { getInitials, formatDate } from '../utils/format'
import AddUserModal from '../components/AddUserModal'
import { useTranslation } from '../i18n'

export default function UsersPage() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const canDelete = currentUser?.role?.name === 'platform_admin' || currentUser?.role?.name === 'university_admin'
  const [data, setData] = useState<PaginatedResponse<User>>({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)

  const roleLabels: Record<string, string> = {
    platform_admin: t('rolePlatformAdmin'),
    university_admin: t('roleUniversityAdmin'),
    dorm_manager: t('roleDormManager'),
    accountant: t('roleAccountant'),
    security_staff: t('roleSecurityStaff'),
  }

  const reload = () => {
    usersApi.list({ page: String(page) }).then((r) => setData(r.data)).catch(() => {})
  }

  useEffect(() => { reload() }, [page])

  const totalPages = Math.ceil(data.count / 20)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('usersTitle')}</h1>
          <p className="text-text-muted text-sm">{data.count} {t('navUsers').toLowerCase()}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
          <Plus size={16} /> {t('addUser')}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <div className="bg-dark-card border border-dark-border rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
                  <th className="text-left py-3 px-4" colSpan={2}>{t('fullName')}</th>
                  <th className="text-left py-3 px-4">{t('role')}</th>
                  <th className="text-left py-3 px-4">{t('phone')}</th>
                  <th className="text-left py-3 px-4">{t('status')}</th>
                  {canDelete && <th className="py-3 px-4 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {data.results.map((u) => (
                  <tr key={u.id} onClick={() => setSelected(u)}
                    className={`border-b border-dark-border/50 hover:bg-dark-hover cursor-pointer transition-colors ${selected?.id === u.id ? 'bg-dark-hover' : ''}`}>
                    <td className="py-3 px-4 w-12">
                      {u.photo ? (
                        <img src={u.photo} alt="" style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%' }} className="bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                          {getInitials(u.full_name)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-0">
                      <div className="font-medium">{u.full_name}</div>
                      <div className="text-xs text-text-muted">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-accent">{u.role ? roleLabels[u.role.name] || u.role.name : '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">{u.phone_number || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.is_active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                        {u.is_active ? t('statusActive') : t('statusSuspended')}
                      </span>
                    </td>
                    {canDelete && (
                      <td className="py-3 px-4">
                        {u.role?.name !== 'platform_admin' && (
                          <button onClick={async (e) => {
                            e.stopPropagation()
                            if (!confirm(`${t('delete')} ${u.full_name}?`)) return
                            try { await usersApi.delete(u.id); if (selected?.id === u.id) setSelected(null); reload() } catch { alert(t('error')) }
                          }} className="text-text-muted hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {data.results.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-text-muted">{t('noData')}</td></tr>
                )}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-dark-border">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-full lg:w-80 lg:shrink-0">
            <div className="bg-dark-card border border-dark-border rounded-xl p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-text-muted uppercase">{t('details')}</span>
                <button onClick={() => setSelected(null)} className="text-text-muted hover:text-white"><X size={16} /></button>
              </div>

              {/* Photo */}
              <div className="flex justify-center mb-4">
                {selected.photo ? (
                  <img src={selected.photo} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: '50%' }} className="bg-accent/20 text-accent flex items-center justify-center text-2xl font-bold">
                    {getInitials(selected.full_name)}
                  </div>
                )}
              </div>

              <div className="text-center mb-4">
                <h3 className="font-bold text-lg">{selected.full_name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${selected.is_active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                  {selected.is_active ? t('statusActive') : t('statusSuspended')}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('role')}</span>
                  <span className="text-accent">{selected.role ? roleLabels[selected.role.name] || selected.role.name : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('email')}</span>
                  <span>{selected.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('phone')}</span>
                  <span>{selected.phone_number || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">{t('startDate')}</span>
                  <span>{formatDate(selected.date_joined)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddUserModal onClose={() => setShowAddModal(false)} onCreated={reload} />
      )}
    </div>
  )
}
