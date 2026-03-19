import { useState } from 'react'
import { X } from 'lucide-react'
import { roomsApi } from '../api/endpoints'

interface Props {
  floors: { id: string; number: number }[]
  onClose: () => void
  onCreated: () => void
}

export default function AddRoomModal({ floors, onClose, onCreated }: Props) {
  const [roomNumber, setRoomNumber] = useState('')
  const [capacity, setCapacity] = useState(4)
  const [floorId, setFloorId] = useState(floors[0]?.id || '')
  const [genderPolicy, setGenderPolicy] = useState('mixed')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!roomNumber || !floorId) return
    setLoading(true)
    try {
      await roomsApi.create({
        room_number: roomNumber,
        capacity,
        floor: floorId,
        gender_policy: genderPolicy,
        monthly_price: monthlyPrice || '0',
      })
      onCreated()
      onClose()
    } catch {
      alert('Ошибка создания комнаты')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Добавить комнату</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Номер комнаты</label>
            <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="101-А" className="w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Вместимость (чел.)</label>
            <select value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-full">
              {[1, 2, 3, 4, 5, 6].map((c) => <option key={c} value={c}>{c} {c === 1 ? 'место' : c < 5 ? 'места' : 'мест'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Этаж</label>
            <select value={floorId} onChange={(e) => setFloorId(e.target.value)} className="w-full">
              {floors.map((f) => <option key={f.id} value={f.id}>{f.number} этаж</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Тип проживания</label>
            <div className="space-y-2">
              {[
                { value: 'male_only', label: 'Мужская' },
                { value: 'female_only', label: 'Женская' },
                { value: 'mixed', label: 'Смешанная' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    genderPolicy === opt.value ? 'border-accent' : 'border-dark-border'
                  }`}>
                    {genderPolicy === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                  </div>
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Стоимость в месяц (UZS)</label>
            <input type="number" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} placeholder="500 000" className="w-full" />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button onClick={handleCreate} disabled={loading || !roomNumber} className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium text-sm disabled:opacity-50">
            {loading ? 'Создание...' : 'Создать комнату'}
          </button>
          <button onClick={onClose} className="w-full py-2.5 rounded-lg text-sm text-text-secondary hover:text-white">Отмена</button>
        </div>
      </div>
    </div>
  )
}
