import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { usersApi } from '../api/endpoints'
import type { User, PaginatedResponse } from '../types'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import { getInitials } from '../utils/format'
import AddUserModal from '../components/AddUserModal'

const roleLabels: Record<string, string> = {
  platform_admin: 'Платформ админ',
  university_admin: 'Админ университета',
  dorm_manager: 'Комендант',
  accountant: 'Бухгалтер',
  security_staff: 'Охрана',
}

export default function UsersPage() {
  const [data, setData] = useState<PaginatedResponse<User>>({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    usersApi.list({ page: String(page) }).then((r) => setData(r.data)).catch(() => {})
  }, [page])

  const totalPages = Math.ceil(data.count / 20)

  const columns = [
    {
      key: 'avatar',
      label: '',
      className: 'w-10',
      render: (u: User) => (
        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
          {getInitials(u.full_name)}
        </div>
      ),
    },
    {
      key: 'full_name',
      label: 'ФИО',
      render: (u: User) => (
        <div>
          <div className="font-medium">{u.full_name}</div>
          <div className="text-xs text-text-muted">{u.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Роль',
      render: (u: User) => (
        <span className="text-sm text-accent">{u.role ? roleLabels[u.role.name] || u.role.name : '—'}</span>
      ),
    },
    { key: 'phone_number', label: 'Телефон' },
    {
      key: 'is_active',
      label: 'Статус',
      render: (u: User) => (
        <span className={u.is_active ? 'text-green-400' : 'text-red-400'}>
          {u.is_active ? 'Активен' : 'Неактивен'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <p className="text-text-muted text-sm">{data.count} пользователей</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
          <Plus size={16} /> Добавить
        </button>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl">
        <DataTable columns={columns} data={data.results} />
        <div className="px-4 py-3 border-t border-dark-border">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            usersApi.list({ page: String(page) }).then((r) => setData(r.data)).catch(() => {})
          }}
        />
      )}
    </div>
  )
}
