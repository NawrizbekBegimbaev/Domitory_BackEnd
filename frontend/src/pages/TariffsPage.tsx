import { useEffect, useState } from 'react'
import { Plus, Edit, Archive, BedDouble, Star } from 'lucide-react'
import { tariffsApi } from '../api/endpoints'
import type { TariffPlan, PaginatedResponse } from '../types'
import { formatMoney } from '../utils/format'

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<TariffPlan[]>([])
  const [tab, setTab] = useState<'active' | 'archive'>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('monthly')

  const load = () => {
    tariffsApi.list({ page_size: '100' }).then((r) =>
      setTariffs((r.data as PaginatedResponse<TariffPlan>).results),
    ).catch(() => {})
  }

  useEffect(load, [])

  const filtered = tariffs.filter((t) => tab === 'active' ? t.is_active : !t.is_active)

  const handleCreate = async () => {
    if (!name || !amount) return
    await tariffsApi.create({ name, amount, billing_period: period })
    setShowCreate(false)
    setName('')
    setAmount('')
    load()
  }

  const periodLabel = (p: string) =>
    p === 'monthly' ? 'в месяц' : p === 'semester' ? 'за семестр' : 'в год'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Тарифы</h1>
          <p className="text-text-muted text-sm">Управление планами проживания и ценообразованием</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Добавить тариф
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-dark-border">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${tab === 'active' ? 'border-accent text-accent' : 'border-transparent text-text-secondary'}`}
        >Активные</button>
        <button
          onClick={() => setTab('archive')}
          className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${tab === 'archive' ? 'border-accent text-accent' : 'border-transparent text-text-secondary'}`}
        >Архив</button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {filtered.map((t) => (
          <div key={t.id} className="bg-dark-card border border-dark-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">{t.name}</h3>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-dark-hover text-text-muted"><Edit size={14} /></button>
                <button className="p-1.5 rounded-lg hover:bg-dark-hover text-text-muted"><Archive size={14} /></button>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-400 text-xs">АКТИВЕН</span>
            </div>
            <div className="text-xs text-text-muted uppercase mb-1">Цена {periodLabel(t.billing_period)}</div>
            <div className="text-3xl font-bold text-accent">{formatMoney(t.amount)} <span className="text-lg text-text-muted">UZS</span></div>
            <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
              <BedDouble size={14} />
              {t.billing_period === 'monthly' ? 'Ежемесячный' : t.billing_period === 'semester' ? 'Семестровый' : 'Годовой'}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-text-muted">Нет тарифов</div>
        )}
      </div>

      {/* Summary table */}
      {filtered.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold uppercase text-sm text-text-muted">Сводка по типам комнат</h3>
            <span className="text-text-muted text-sm">Всего тарифов: {filtered.length}</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
                <th className="text-left py-2">Категория</th>
                <th className="text-center py-2">Период</th>
                <th className="text-right py-2">Базовая цена</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-dark-border/50">
                  <td className="py-3 font-medium">{t.name}</td>
                  <td className="py-3 text-center text-text-secondary">{periodLabel(t.billing_period)}</td>
                  <td className="py-3 text-right text-accent font-semibold">{formatMoney(t.amount)} UZS</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Новый тариф</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Название</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Стандарт" className="w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Сумма (UZS)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500000" className="w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Период</label>
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full">
                  <option value="monthly">Ежемесячный</option>
                  <option value="semester">Семестровый</option>
                  <option value="yearly">Годовой</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
              <button onClick={handleCreate} className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium">Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
