import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { contractsApi } from '../api/endpoints'
import type { Contract, PaginatedResponse } from '../types'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import { formatDate, statusColors, getStatusLabel } from '../utils/format'
import NewContractModal from '../components/NewContractModal'
import { useTranslation } from '../i18n'

export default function ContractsPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<PaginatedResponse<Contract>>({ count: 0, next: null, previous: null, results: [] })
  const [tab, setTab] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Contract | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  const tabs = [
    { key: '', label: t('all') },
    { key: 'active', label: t('tabActive') },
    { key: 'expired', label: t('statusExpired') },
    { key: 'terminated', label: t('statusTerminated') },
  ]

  const reload = () => {
    const params: Record<string, string> = { page: String(page) }
    if (tab) params.status = tab
    contractsApi.list(params).then((r) => setData(r.data)).catch(() => {})
  }

  useEffect(() => { reload() }, [tab, page])

  const totalPages = Math.ceil(data.count / 20)

  const columns = [
    { key: 'contract_number', label: t('contractNumber') },
    {
      key: 'resident_name',
      label: t('resident'),
      render: (c: Contract) => c.resident_name || c.resident,
    },
    {
      key: 'start_date',
      label: t('startDate'),
      render: (c: Contract) => formatDate(c.start_date),
    },
    {
      key: 'end_date',
      label: t('endDate'),
      render: (c: Contract) => formatDate(c.end_date),
    },
    {
      key: 'status',
      label: t('status'),
      render: (c: Contract) => (
        <span className={`font-medium ${statusColors[c.status]}`}>
          {getStatusLabel(c.status, t)}
        </span>
      ),
    },
  ]

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('contractsTitle')}</h1>
            <p className="text-text-muted text-sm">{data.count} {t('contractsTitle').toLowerCase()}</p>
          </div>
        </div>

        <div className="flex gap-1 mb-4 bg-dark-card border border-dark-border rounded-lg p-1 w-fit">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => { setTab(tb.key); setPage(1) }}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                tab === tb.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'
              }`}
            >
              {tb.label}
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
              <h3 className="font-semibold text-sm text-text-muted">{t('contractsTitle').toUpperCase()}</h3>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-white">x</button>
            </div>
            <div className="text-lg font-bold mb-1">{selected.contract_number}</div>
            <span className={`text-sm font-medium ${statusColors[selected.status]}`}>
              {getStatusLabel(selected.status, t)}
            </span>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">{t('resident')}:</span>
                <span>{selected.resident_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t('startDate')}:</span>
                <span>{formatDate(selected.start_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t('endDate')}:</span>
                <span>{formatDate(selected.end_date)}</span>
              </div>
            </div>
            {selected.status === 'active' && (
              <button
                onClick={async () => {
                  if (!confirm(t('terminate') + '?')) return
                  await contractsApi.terminate(selected.id).catch(() => alert(t('error')))
                  setSelected(null)
                  reload()
                }}
                className="w-full mt-6 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
              >
                {t('terminate')}
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
