import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Receipt, Calculator, Tag } from 'lucide-react'
import { paymentsApi } from '../api/endpoints'
import type { Payment, PaginatedResponse } from '../types'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import { formatMoney, formatDate } from '../utils/format'

export default function FinancePage() {
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
      label: 'Дата',
      render: (p: Payment) => formatDate(p.payment_date),
    },
    {
      key: 'amount',
      label: 'Сумма',
      render: (p: Payment) => (
        <span className="text-green-400 font-medium">{formatMoney(p.amount)} UZS</span>
      ),
    },
    {
      key: 'payment_method',
      label: 'Способ',
      render: (p: Payment) => p.payment_method === 'cash' ? 'Наличные' : 'Банковский перевод',
    },
    { key: 'status', label: 'Статус', render: (p: Payment) => p.status === 'completed' ? 'Завершён' : p.status },
    { key: 'notes', label: 'Заметки' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Финансы</h1>
          <p className="text-text-muted text-sm">Оплаты и начисления</p>
        </div>
        <button
          onClick={() => navigate('/finance/payment/new')}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Внести оплату
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <Link to="/finance/tariffs" className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-sm hover:border-accent/50 transition-colors">
          <Receipt size={16} className="text-accent" /> Тарифы
        </Link>
        <Link to="/finance/charges/generate" className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-sm hover:border-accent/50 transition-colors">
          <Calculator size={16} className="text-accent" /> Начисление
        </Link>
        <Link to="/finance/discounts" className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-sm hover:border-accent/50 transition-colors">
          <Tag size={16} className="text-accent" /> Скидки
        </Link>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl">
        <DataTable columns={columns} data={data.results} />
        <div className="px-4 py-3 border-t border-dark-border">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
