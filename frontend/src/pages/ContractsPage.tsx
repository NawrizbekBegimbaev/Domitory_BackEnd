import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { contractsApi } from '../api/endpoints'
import type { Contract, PaginatedResponse } from '../types'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import { formatDate, statusLabels, statusColors } from '../utils/format'
import NewContractModal from '../components/NewContractModal'

const tabs = [
  { key: '', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'expired', label: 'Истёк срок' },
  { key: 'terminated', label: 'Расторгнутые' },
]

export default function ContractsPage() {
  const [data, setData] = useState<PaginatedResponse<Contract>>({ count: 0, next: null, previous: null, results: [] })
  const [tab, setTab] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Contract | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  const reload = () => {
    const params: Record<string, string> = { page: String(page) }
    if (tab) params.status = tab
    contractsApi.list(params).then((r) => setData(r.data)).catch(() => {})
  }

  useEffect(() => { reload() }, [tab, page])

  const totalPages = Math.ceil(data.count / 20)

  const columns = [
    { key: 'contract_number', label: 'Договор' },
    {
      key: 'resident_name',
      label: 'Жилец',
      render: (c: Contract) => c.resident_name || c.resident,
    },
    {
      key: 'start_date',
      label: 'Начало',
      render: (c: Contract) => formatDate(c.start_date),
    },
    {
      key: 'end_date',
      label: 'Окончание',
      render: (c: Contract) => formatDate(c.end_date),
    },
    {
      key: 'status',
      label: 'Статус',
      render: (c: Contract) => (
        <span className={`font-medium ${statusColors[c.status]}`}>
          {statusLabels[c.status] || c.status}
        </span>
      ),
    },
  ]

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Договоры</h1>
            <p className="text-text-muted text-sm">{data.count} договоров в системе</p>
          </div>
          <button onClick={() => setShowNewModal(true)} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus size={16} /> Новый договор
          </button>
        </div>

        <div className="flex gap-1 mb-4 bg-dark-card border border-dark-border rounded-lg p-1 w-fit">
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

        <div className="bg-dark-card border border-dark-border rounded-xl">
          <DataTable
            columns={columns}
            data={data.results}
            onRowClick={(c) => setSelected(c)}
          />
          <div className="px-4 py-3 border-t border-dark-border">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 shrink-0">
          <div className="bg-dark-card border border-dark-border rounded-xl p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-text-muted">ДЕТАЛИ ДОГОВОРА</h3>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-white">x</button>
            </div>
            <div className="text-lg font-bold mb-1">{selected.contract_number}</div>
            <span className={`text-sm font-medium ${statusColors[selected.status]}`}>
              {statusLabels[selected.status]}
            </span>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Жилец:</span>
                <span>{selected.resident_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Начало:</span>
                <span>{formatDate(selected.start_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Окончание:</span>
                <span>{formatDate(selected.end_date)}</span>
              </div>
            </div>
            {selected.status === 'active' && (
              <button
                onClick={async () => {
                  if (!confirm('Расторгнуть договор?')) return
                  await contractsApi.terminate(selected.id).catch(() => alert('Ошибка'))
                  setSelected(null)
                  reload()
                }}
                className="w-full mt-6 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
              >
                Расторгнуть договор
              </button>
            )}
          </div>
        </div>
      )}

      {showNewModal && (
        <NewContractModal onClose={() => setShowNewModal(false)} onCreated={reload} />
      )}
    </div>
  )
}
