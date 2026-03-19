import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { paymentsApi } from '../api/endpoints'
import type { Payment, PaginatedResponse } from '../types'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import { formatMoney, formatDate, getStatusLabel } from '../utils/format'
import { useTranslation } from '../i18n'

export default function FinancePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState<PaginatedResponse<Payment>>({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)

  useEffect(() => {
    paymentsApi.list({ page: String(page) }).then((r) => setData(r.data)).catch(() => {})
  }, [page])

  const totalPages = Math.ceil(data.count / 20)

  const columns = [
    {
      key: 'payment_date',
      label: t('paymentDate'),
      render: (p: Payment) => <span className="text-text-secondary">{formatDate(p.payment_date)}</span>,
    },
    {
      key: 'resident_name',
      label: t('resident'),
      render: (p: Payment) => <span className="font-medium">{p.resident_name || '—'}</span>,
    },
    {
      key: 'amount',
      label: t('paymentAmount'),
      render: (p: Payment) => (
        <span className={`font-bold tabular-nums ${parseFloat(p.amount) < 0 ? 'text-red-400' : 'text-green-400'}`}>
          {parseFloat(p.amount) > 0 ? '+' : ''}{formatMoney(p.amount)} <span className="text-text-muted font-normal text-xs">UZS</span>
        </span>
      ),
    },
    {
      key: 'payment_method',
      label: t('paymentMethod'),
      render: (p: Payment) => (
        <span className="text-xs px-2 py-1 rounded-full bg-dark-bg text-text-secondary">
          {p.payment_method === 'cash' ? t('paymentCash') : t('paymentTransfer')}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      render: (p: Payment) => (
        <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 font-medium">
          {getStatusLabel(p.status, t)}
        </span>
      ),
    },
    {
      key: 'recorded_by_name',
      label: t('acceptedBy'),
      render: (p: Payment) => p.recorded_by_name || '—',
    },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('financeTitle')}</h1>
          <p className="text-text-muted text-sm">{t('financeDesc')}</p>
        </div>
        <button
          onClick={() => navigate('/finance/payment/new')}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> {t('makePayment')}
        </button>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl">
        <DataTable columns={columns} data={data.results} />
        <div className="px-4 py-3 border-t border-dark-border flex items-center justify-between">
          <span className="text-sm text-text-muted">{t('showing')} {data.results.length} {t('of')} {data.count}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
