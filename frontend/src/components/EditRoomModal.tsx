import { useState } from 'react'
import { X, Minus, Plus, User, Users } from 'lucide-react'
import { roomsApi } from '../api/endpoints'
import type { Room } from '../types'

interface Props {
  room: Room
  buildingName?: string
  floorNumber?: number
  onClose: () => void
  onUpdated: () => void
}

const genderOptions = [
  { value: 'male_only', label: 'Мужская', icon: User },
  { value: 'female_only', label: 'Женская', icon: User },
  { value: 'mixed', label: 'Смешанная', icon: Users },
]

const statusOptions = [
  { value: 'available', label: 'Доступна' },
  { value: 'full', label: 'Заселена' },
  { value: 'maintenance', label: 'На ремонте' },
  { value: 'closed', label: 'Закрыта' },
]

export default function EditRoomModal({ room, buildingName, floorNumber, onClose, onUpdated }: Props) {
  const [roomNumber, setRoomNumber] = useState(room.room_number)
  const [capacity, setCapacity] = useState(room.capacity)
  const [status, setStatus] = useState(room.status)
  const [genderPolicy, setGenderPolicy] = useState(room.gender_policy)
  const [monthlyPrice, setMonthlyPrice] = useState(room.monthly_price)
  const [loading, setLoading] = useState(false)

  const pct = capacity > 0 ? Math.round((room.current_occupancy / capacity) * 100) : 0

  const handleSave = async () => {
    setLoading(true)
    try {
      await roomsApi.update(room.id, {
        room_number: roomNumber,
        capacity,
        status,
        gender_policy: genderPolicy,
        monthly_price: monthlyPrice,
        floor: room.floor,
      })
      onUpdated()
      onClose()
    } catch {
      alert('Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">Редактировать комнату</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="text-text-muted text-sm mb-6">
          Комната {room.room_number}{buildingName ? ` · ${buildingName}` : ''}{floorNumber ? ` · ${floorNumber} этаж` : ''}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Номер комнаты *</label>
              <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Вместимость *</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCapacity(Math.max(1, capacity - 1))}
                  className="w-10 h-10 rounded-lg border border-dark-border flex items-center justify-center hover:bg-dark-hover"
                ><Minus size={16} /></button>
                <span className="w-10 text-center font-bold text-lg">{capacity}</span>
                <button
                  onClick={() => setCapacity(Math.min(10, capacity + 1))}
                  className="w-10 h-10 rounded-lg border border-dark-border flex items-center justify-center hover:bg-dark-hover"
                ><Plus size={16} /></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Тип комнаты</label>
              <select className="w-full">
                <option>Стандарт</option>
                <option>Улучшенная</option>
                <option>Люкс</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Статус</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-2">Гендерная политика</label>
            <div className="grid grid-cols-3 gap-3">
              {genderOptions.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGenderPolicy(g.value)}
                  className={`py-3 rounded-xl border text-center transition-colors ${
                    genderPolicy === g.value ? 'border-accent bg-accent/10' : 'border-dark-border hover:border-accent/30'
                  }`}
                >
                  <g.icon size={20} className={`mx-auto mb-1 ${genderPolicy === g.value ? 'text-accent' : 'text-text-muted'}`} />
                  <div className="text-xs">{g.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Ежемесячная стоимость *</label>
            <div className="relative">
              <input
                type="number"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                className="w-full"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">UZS</span>
            </div>
          </div>

          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-accent uppercase font-bold">Текущая загрузка</div>
              <div className="text-sm mt-1">{room.current_occupancy} из {capacity} мест занято ({pct}%)</div>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: capacity }).map((_, i) => (
                <div key={i} className={`w-6 h-6 rounded-full ${i < room.current_occupancy ? 'bg-accent' : 'bg-dark-border'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
          <button
            onClick={handleSave}
            disabled={loading || !roomNumber}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  )
}
