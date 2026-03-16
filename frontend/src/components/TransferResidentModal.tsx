import { useEffect, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { buildingsApi, floorsApi, roomsApi, assignmentsApi } from '../api/endpoints'
import type { Building, Floor, Room, RoomAssignment, PaginatedResponse } from '../types'
import { formatDate } from '../utils/format'

interface Props {
  residentName: string
  currentAssignment: RoomAssignment | null
  onClose: () => void
  onTransferred: () => void
}

export default function TransferResidentModal({ residentName, currentAssignment, onClose, onTransferred }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [buildingId, setBuildingId] = useState('')
  const [floorId, setFloorId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedRoom = rooms.find((r) => r.id === roomId)

  useEffect(() => {
    buildingsApi.list({ page_size: '100' }).then((r) => {
      const b = (r.data as PaginatedResponse<Building>).results
      setBuildings(b)
      if (b.length > 0) setBuildingId(b[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!buildingId) return
    floorsApi.list({ building: buildingId, page_size: '100' }).then((r) => {
      const f = (r.data as PaginatedResponse<Floor>).results.sort((a, b) => a.number - b.number)
      setFloors(f)
      setFloorId(f[0]?.id || '')
    }).catch(() => {})
  }, [buildingId])

  useEffect(() => {
    if (!buildingId) return
    roomsApi.list({ building: buildingId, page_size: '500' }).then((r) => {
      setRooms((r.data as PaginatedResponse<Room>).results)
    }).catch(() => {})
  }, [buildingId])

  const filteredRooms = rooms.filter((r) => r.floor === floorId && r.current_occupancy < r.capacity && r.status === 'available')

  const handleTransfer = async () => {
    if (!currentAssignment || !roomId) return
    setLoading(true)
    try {
      await assignmentsApi.transfer(currentAssignment.id, { new_room: roomId, reason })
      onTransferred()
      onClose()
    } catch {
      alert('Ошибка перевода')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Перевести в комнату</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        {currentAssignment && (
          <div className="bg-dark-bg border border-dark-border rounded-lg p-4 mb-5">
            <div className="text-xs text-accent uppercase font-bold mb-2">Текущее размещение</div>
            <div className="text-sm">Комната {currentAssignment.room_number || currentAssignment.room}</div>
            <div className="text-xs text-text-muted mt-1">с {formatDate(currentAssignment.start_date)}</div>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Корпус *</label>
              <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className="w-full">
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Этаж *</label>
              <select value={floorId} onChange={(e) => setFloorId(e.target.value)} className="w-full">
                {floors.map((f) => <option key={f.id} value={f.id}>{f.number} этаж</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Комната *</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full">
              <option value="">Выберите комнату...</option>
              {filteredRooms.map((r) => (
                <option key={r.id} value={r.id}>{r.room_number} ({r.current_occupancy}/{r.capacity})</option>
              ))}
            </select>
          </div>

          {selectedRoom && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-sm">
              <div className="text-accent uppercase text-xs font-bold">
                Комната {selectedRoom.room_number} · Мест: {selectedRoom.capacity} · Занято: {selectedRoom.current_occupancy} · Свободно: {selectedRoom.capacity - selectedRoom.current_occupancy}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Дата перевода *</label>
            <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} className="w-full" />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Причина перевода</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Укажите причину (необязательно)" rows={3} className="w-full" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
          <button
            onClick={handleTransfer}
            disabled={loading || !roomId}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Перевод...' : 'Подтвердить перевод'}
          </button>
        </div>
      </div>
    </div>
  )
}
