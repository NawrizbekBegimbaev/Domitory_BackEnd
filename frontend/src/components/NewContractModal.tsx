import { useEffect, useState } from 'react'
import { X, Search, RefreshCw } from 'lucide-react'
import { residentsApi, roomsApi, tariffsApi, contractsApi, assignmentsApi } from '../api/endpoints'
import type { Resident, Room, TariffPlan, PaginatedResponse } from '../types'
import { formatMoney } from '../utils/format'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function NewContractModal({ onClose, onCreated }: Props) {
  const [residents, setResidents] = useState<Resident[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tariffs, setTariffs] = useState<TariffPlan[]>([])
  const [search, setSearch] = useState('')
  const [residentId, setResidentId] = useState('')
  const [contractNumber, setContractNumber] = useState('')
  const [roomId, setRoomId] = useState('')
  const [tariffId, setTariffId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    roomsApi.list({ page_size: '500', status: 'available' }).then((r) =>
      setRooms((r.data as PaginatedResponse<Room>).results.filter((rm) => rm.current_occupancy < rm.capacity)),
    ).catch(() => {})
    tariffsApi.list({ page_size: '100', is_active: 'true' }).then((r) =>
      setTariffs((r.data as PaginatedResponse<TariffPlan>).results),
    ).catch(() => {})
  }, [])

  useEffect(() => {
    if (search.length < 2) return
    residentsApi.list({ search, page_size: '10' }).then((r) => {
      setResidents((r.data as PaginatedResponse<Resident>).results)
      setShowDropdown(true)
    }).catch(() => {})
  }, [search])

  const selectedResident = residents.find((r) => r.id === residentId)
  const selectedTariff = tariffs.find((t) => t.id === tariffId)

  const generateNumber = () => {
    const year = new Date().getFullYear()
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    setContractNumber(`ДГ-${year}-${rand}`)
  }

  const handleCreate = async () => {
    if (!residentId || !contractNumber || !startDate || !endDate) return
    setLoading(true)
    try {
      await contractsApi.create({
        resident: residentId,
        contract_number: contractNumber,
        start_date: startDate,
        end_date: endDate,
        ...(roomId ? { room: roomId } : {}),
      })
      onCreated()
      onClose()
    } catch {
      alert('Ошибка создания договора')
    } finally {
      setLoading(false)
    }
  }

  const months = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (30 * 24 * 60 * 60 * 1000)))
    : 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Новый договор</h2>
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
                placeholder="Поиск по ФИО или номеру паспорта..."
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
            <label className="block text-xs text-text-muted uppercase mb-1">Номер договора *</label>
            <div className="flex gap-2">
              <input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="ДГ-2026-0000" className="flex-1 text-accent" />
              <button onClick={generateNumber} className="px-3 py-2 rounded-lg border border-dark-border text-sm text-accent hover:bg-dark-hover flex items-center gap-1">
                <RefreshCw size={14} /> Сгенерировать
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Комната *</label>
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full">
                <option value="">Выберите комнату</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.room_number} ({r.current_occupancy}/{r.capacity})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Тариф *</label>
              <select value={tariffId} onChange={(e) => setTariffId(e.target.value)} className="w-full">
                <option value="">Выберите тариф</option>
                {tariffs.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {formatMoney(t.amount)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Дата начала *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Дата окончания *</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
            </div>
          </div>

          {selectedTariff && months > 0 && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Итоговая стоимость:</span>
                <span className="text-accent font-bold text-lg">{formatMoney(selectedTariff.amount)} /мес</span>
              </div>
              <div className="text-xs text-text-muted mt-1">Срок: {months} месяцев</div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
          <button
            onClick={handleCreate}
            disabled={loading || !residentId || !contractNumber || !startDate || !endDate}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать договор'}
          </button>
        </div>
      </div>
    </div>
  )
}
