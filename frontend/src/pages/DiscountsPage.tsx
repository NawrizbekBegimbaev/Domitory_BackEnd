import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import api from '../api/client'
import { formatMoney, formatDate, getInitials } from '../utils/format'
import AddDiscountModal from '../components/AddDiscountModal'

interface Discount {
  id: string
  resident: string
  resident_name?: string
  discount_type: string
  value: string
  reason: string
  start_date: string
  end_date: string | null
  approved_by: string | null
}

const tabs = ['Все', 'Активные', 'Архив']

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [tab, setTab] = useState('Все')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    api.get('/discounts/', { params: { page_size: '100' } }).then((r) => {
      setDiscounts(r.data.results || r.data)
    }).catch(() => {})
  }, [])

  const now = new Date().toISOString().split('T')[0]
  const filtered = tab === 'Все' ? discounts :
    tab === 'Активные' ? discounts.filter((d) => !d.end_date || d.end_date >= now) :
    discounts.filter((d) => d.end_date && d.end_date < now)

  const typeBadge = (reason: string) => {
    const colors: Record<string, string> = {
      social: 'bg-blue-500/20 text-blue-400',
      academic: 'bg-green-500/20 text-green-400',
      veteran: 'bg-purple-500/20 text-purple-400',
    }
    return colors[reason] || 'bg-dark-border text-text-secondary'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-text-muted text-sm">Финансы &gt; Скидки</div>
          <h1 className="text-2xl font-bold mt-1">Скидки</h1>
          <p className="text-text-muted text-sm">Индивидуальные льготы и скидки для резидентов</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
          <Plus size={16} /> Добавить скидку
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-dark-card border border-dark-border rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              tab === t ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
              <th className="text-left py-3 px-4">Жилец</th>
              <th className="text-left py-3 px-4">Тип</th>
              <th className="text-center py-3 px-4">Размер</th>
              <th className="text-left py-3 px-4">Срок действия</th>
              <th className="text-left py-3 px-4">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                      {d.resident_name ? getInitials(d.resident_name) : '?'}
                    </div>
                    <span className="font-medium">{d.resident_name || d.resident}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${typeBadge(d.reason)}`}>
                    {d.reason}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-accent font-semibold">
                    {d.discount_type === 'percentage' ? `${d.value}%` : `${formatMoney(d.value)} UZS`}
                  </span>
                </td>
                <td className="py-3 px-4 text-text-secondary text-sm">
                  {d.end_date ? formatDate(d.end_date) : 'Бессрочно'}
                </td>
                <td className="py-3 px-4">
                  {(!d.end_date || d.end_date >= now) ? (
                    <span className="text-green-400 text-sm flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Активна</span>
                  ) : (
                    <span className="text-text-muted text-sm">Истекла</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-text-muted">Нет скидок</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddDiscountModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            api.get('/discounts/', { params: { page_size: '100' } }).then((r) => {
              setDiscounts(r.data.results || r.data)
            }).catch(() => {})
          }}
        />
      )}
    </div>
  )
}
