import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { buildingsApi, floorsApi, roomsApi } from '../api/endpoints'
import type { Building, Floor, Room, PaginatedResponse } from '../types'

export default function FloorsPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()
  const [building, setBuilding] = useState<Building | null>(null)
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!buildingId) return
    buildingsApi.get(buildingId).then((r) => setBuilding(r.data)).catch(() => {})
    floorsApi.list({ building: buildingId, page_size: '100' }).then((r) =>
      setFloors((r.data as PaginatedResponse<Floor>).results.sort((a, b) => a.number - b.number)),
    ).catch(() => {})
    roomsApi.list({ building: buildingId, page_size: '500' }).then((r) =>
      setRooms((r.data as PaginatedResponse<Room>).results),
    ).catch(() => {})
  }, [buildingId])

  useEffect(() => {
    if (floors.length > 0) setExpanded(new Set([floors[0].id]))
  }, [floors])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getRoomColor = (room: Room) => {
    if (room.status === 'maintenance') return 'bg-yellow-500 text-white'
    if (room.status === 'closed') return 'bg-gray-600 text-white'
    if (room.current_occupancy >= room.capacity) return 'bg-dark-border text-white'
    return 'bg-green-600 text-white'
  }

  const totalRooms = rooms.length

  return (
    <div>
      <div className="text-text-muted text-sm mb-4">
        <button onClick={() => navigate('/buildings')} className="hover:text-white">Корпуса</button>
        {' > '}{building?.name || '...'}{' > '}Этажи
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Этажи — {building?.name || '...'}</h1>
          <p className="text-text-muted text-sm">{floors.length} этажа · {totalRooms} комнат</p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
          <Plus size={16} /> Добавить этаж
        </button>
      </div>

      <div className="space-y-3">
        {floors.map((floor) => {
          const floorRooms = rooms.filter((r) => r.floor === floor.id).sort((a, b) => a.room_number.localeCompare(b.room_number))
          const fCap = floorRooms.reduce((s, r) => s + r.capacity, 0)
          const fOcc = floorRooms.reduce((s, r) => s + r.current_occupancy, 0)
          const fFree = fCap - fOcc
          const fPct = fCap > 0 ? Math.round((fOcc / fCap) * 100) : 0
          const isOpen = expanded.has(floor.id)

          return (
            <div key={floor.id} className="bg-dark-card border border-dark-border rounded-xl">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer"
                onClick={() => toggle(floor.id)}
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className="font-semibold">{floor.number} этаж</span>
                  <span className="text-sm text-text-muted">
                    {floorRooms.length} комнат · {fOcc} занято · {fFree} свободно
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-dark-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${fPct >= 90 ? 'bg-red-500' : fPct >= 50 ? 'bg-accent' : 'bg-green-500'}`}
                      style={{ width: `${fPct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${fPct >= 90 ? 'text-red-400' : fPct >= 50 ? 'text-accent' : 'text-green-400'}`}>
                    ЗАСЕЛЕНИЕ {fPct}%
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation() }}
                    className="text-text-muted hover:text-accent"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="px-5 pb-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {floorRooms.map((room) => (
                      <div
                        key={room.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${getRoomColor(room)}`}
                        title={`${room.current_occupancy}/${room.capacity}`}
                      >
                        {room.room_number}
                      </div>
                    ))}
                  </div>
                  <button className="text-accent text-sm hover:underline flex items-center gap-1">
                    <Plus size={14} /> Добавить комнату на этаж
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {building && (
        <div className="mt-6 flex items-center gap-4 text-sm">
          <button className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
            <Pencil size={14} /> Редактировать корпус
          </button>
          <button className="text-red-400 hover:text-red-300 transition-colors">
            Удалить корпус
          </button>
          <span className="text-text-muted text-xs ml-auto">
            ВНИМАНИЕ: УДАЛЕНИЕ КОРПУСА НЕОБРАТИМО. ВОЗМОЖНА ТОЛЬКО ПРИ ОТСУТСТВИИ АКТИВНЫХ ДОГОВОРОВ.
          </span>
        </div>
      )}
    </div>
  )
}
