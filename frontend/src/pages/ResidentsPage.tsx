import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { residentsApi } from '../api/endpoints'
import type { Resident, PaginatedResponse } from '../types'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import { statusLabels, statusColors, getInitials } from '../utils/format'

const tabs = [
  { key: '', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'evicted', label: 'Выселенные' },
  { key: 'graduated', label: 'Выпустились' },
]

export default function ResidentsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<PaginatedResponse<Resident>>({ count: 0, next: null, previous: null, results: [] })
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const params: Record<string, string> = { page: String(page) }
    if (tab) params.status = tab
    if (search) params.search = search
    residentsApi.list(params).then((r) => setData(r.data)).catch(() => {})
  }, [tab, search, page])

  const totalPages = Math.ceil(data.count / 20)

  const columns = [
    {
      key: 'avatar',
      label: '',
      className: 'w-10',
      render: (r: Resident) => (
        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
          {getInitials(r.full_name)}
        </div>
      ),
    },
    {
      key: 'full_name',
      label: 'ФИО',
      render: (r: Resident) => (
        <div>
          <div className="font-medium">{r.full_name}</div>
          <div className="text-xs text-text-muted">{r.email}</div>
        </div>
      ),
    },
    { key: 'university_id', label: 'Студ. ID' },
    { key: 'faculty', label: 'Факультет' },
    {
      key: 'status',
      label: 'Статус',
      render: (r: Resident) => (
        <span className={`text-sm font-medium ${statusColors[r.status] || ''}`}>
          {statusLabels[r.status] || r.status}
        </span>
      ),
    },
    { key: 'phone_number', label: 'Телефон' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Жильцы</h1>
          <p className="text-text-muted text-sm">{data.count} жильцов в системе</p>
        </div>
        <button
          onClick={() => navigate('/residents/new')}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Добавить жильца
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 bg-dark-card border border-dark-border rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1) }}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                tab === t.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Поиск по имени или ID"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9"
          />
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl">
        <DataTable
          columns={columns}
          data={data.results}
          onRowClick={(r) => navigate(`/residents/${r.id}`)}
        />
        <div className="px-4 py-3 border-t border-dark-border flex items-center justify-between">
          <span className="text-sm text-text-muted">
            Показано {data.results.length} из {data.count}
          </span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
