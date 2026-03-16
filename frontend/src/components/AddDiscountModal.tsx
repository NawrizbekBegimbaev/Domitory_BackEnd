import { useEffect, useState } from 'react'
import { X, Search } from 'lucide-react'
import { residentsApi, discountsApi } from '../api/endpoints'
import type { Resident, PaginatedResponse } from '../types'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const reasons = [
  { value: 'social', label: 'Социальная' },
  { value: 'academic', label: 'Академическая' },
  { value: 'veteran', label: 'Ветеран' },
  { value: 'disability', label: 'Инвалидность' },
  { value: 'other', label: 'Другое' },
]

export default function AddDiscountModal({ onClose, onCreated }: Props) {
  const [residents, setResidents] = useState<Resident[]>([])
  const [search, setSearch] = useState('')
  const [residentId, setResidentId] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [indefinite, setIndefinite] = useState(false)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (search.length < 2) return
    residentsApi.list({ search, page_size: '10' }).then((r) => {
      setResidents((r.data as PaginatedResponse<Resident>).results)
      setShowDropdown(true)
    }).catch(() => {})
  }, [search])

  const selectedResident = residents.find((r) => r.id === residentId)

  const handleCreate = async () => {
    if (!residentId || !value || !reason || !startDate) return
    setLoading(true)
    try {
      await discountsApi.create({
        resident: residentId,
        discount_type: discountType,
        value,
        reason,
        start_date: startDate,
        end_date: indefinite ? null : endDate || null,
      })
      onCreated()
      onClose()
    } catch {
      alert('Ошибка создания скидки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Добавить скидку</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <label className="block text-xs text-text-muted uppercase mb-1">Жилец *</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={selectedResident ? selectedResident.full_name : search}
                onChange={(e) => { setSearch(e.target.value); setResidentId('') }}
                onFocus={() => search.length >= 2 && setShowDropdown(true)}
                placeholder="Поиск жильца..."
                className="w-full pl-9"
              />
            </div>
            {showDropdown && residents.length > 0 && !residentId && (
              <div className="absolute z-10 w-full mt-1 bg-dark-card border border-dark-border rounded-lg max-h-40 overflow-y-auto">
                {residents.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setResidentId(r.id); setShowDropdown(false) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-dark-hover"
                  >
                    {r.full_name} <span className="text-text-muted">· {r.university_id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Тип скидки *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDiscountType('percentage')}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${discountType === 'percentage' ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}
              >Процент %</button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${discountType === 'fixed' ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}
              >Фикс. сумма UZS</button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Размер скидки *</label>
            <div className="relative">
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" className="w-full" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                {discountType === 'percentage' ? '%' : 'UZS'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Причина *</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full">
              <option value="">Выберите причину</option>
              {reasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Действует с *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-text-muted uppercase">Действует до</label>
                <label className="flex items-center gap-1 text-xs text-text-muted cursor-pointer">
                  <input type="checkbox" checked={indefinite} onChange={(e) => setIndefinite(e.target.checked)} className="rounded" />
                  Бессрочно
                </label>
              </div>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={indefinite} className="w-full disabled:opacity-50" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Комментарий (необязательно)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Дополнительная информация..." rows={2} className="w-full" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
          <button
            onClick={handleCreate}
            disabled={loading || !residentId || !value || !reason || !startDate}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Добавить скидку'}
          </button>
        </div>
      </div>
    </div>
  )
}
