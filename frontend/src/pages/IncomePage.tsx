import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Receipt } from 'lucide-react'
import { reportsApi } from '../api/endpoints'
import type { PaymentsReport, Payment } from '../types'
import DataTable from '../components/DataTable'
import StatCard from '../components/StatCard'
import { formatMoney, formatDate } from '../utils/format'
import { useTranslation } from '../i18n'

type Period = 'month' | 'quarter' | 'year'

export default function IncomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>(() => (localStorage.getItem('income_period') as Period) || 'quarter')
  const [report, setReport] = useState<PaymentsReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem('income_period', period)
    setLoading(true)
    reportsApi.payments({ period })
      .then((r) => setReport(r.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [period])

  const periods: { key: Period; label: string }[] = [
    { key: 'month', label: t('periodMonth') },
    { key: 'quarter', label: t('periodQuarter') },
    { key: 'year', label: t('periodYear') },
  ]

  const methodLabel = (m: string) => (m === 'cash' ? t('paymentCash') : m === 'bank_transfer' ? t('paymentTransfer') : m)

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
        <span className="text-xs px-2 py-1 rounded-full bg-dark-bg text-text-secondary">{methodLabel(p.payment_method)}</span>
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
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-text-muted hover:text-accent"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold">{t('incomeTitle')}</h1>
            <p className="text-text-muted text-sm">
              {t('incomeDesc')}
              {report?.date_from && report?.date_to && (
                <span className="ml-2 text-text-secondary">{formatDate(report.date_from)} — {formatDate(report.date_to)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex bg-dark-card border border-dark-border rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-accent'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<TrendingUp size={18} className="text-green-400" />}
          label={t('totalCollected')}
          value={report ? `${formatMoney(report.total)} UZS` : '—'}
        />
        <StatCard
          icon={<Receipt size={18} className="text-accent" />}
          label={t('paymentsCount')}
          value={report ? report.count : '—'}
        />
        <div className="bg-dark-card border border-dark-border rounded-xl p-5">
          <div className="text-text-secondary text-sm mb-3">{t('byMethod')}</div>
          <div className="space-y-1.5">
            {report?.by_method.map((m) => (
              <div key={m.payment_method} className="flex justify-between text-sm">
                <span className="text-text-muted">{methodLabel(m.payment_method)} · {m.count}</span>
                <span className="font-semibold tabular-nums">{formatMoney(m.total)}</span>
              </div>
            ))}
            {(!report || report.by_method.length === 0) && <div className="text-text-muted text-sm">{t('noData')}</div>}
          </div>
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl">
        {loading ? (
          <div className="py-8 text-center text-text-muted">{t('loading')}</div>
        ) : (
          <DataTable columns={columns} data={report?.payments ?? []} />
        )}
        <div className="px-4 py-3 border-t border-dark-border text-sm text-text-muted">
          {t('showing')} {report?.payments.length ?? 0} {t('of')} {report?.count ?? 0}
        </div>
      </div>
    </div>
  )
}
