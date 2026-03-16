import { useEffect, useState } from 'react'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { buildingsApi, floorsApi, roomsApi } from '../api/endpoints'
import type { Building, Floor, Room, PaginatedResponse } from '../types'
import { statusLabels } from '../utils/format'
import AddRoomModal from '../components/AddRoomModal'
import EditRoomModal from '../components/EditRoomModal'

export default function RoomsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)

  useEffect(() => {
    buildingsApi.list({ page_size: '100' }).then((r) => {
      const b = (r.data as PaginatedResponse<Building>).results
      setBuildings(b)
      if (b.length > 0) setSelectedBuilding(b[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedBuilding) return
    floorsApi.list({ building: selectedBuilding, page_size: '100' }).then((r) =>
      setFloors((r.data as PaginatedResponse<Floor>).results),
    ).catch(() => {})
    roomsApi.list({ building: selectedBuilding, page_size: '200' }).then((r) =>
      setRooms((r.data as PaginatedResponse<Room>).results),
    ).catch(() => {})
  }, [selectedBuilding])

  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0)
  const totalOccupancy = rooms.reduce((s, r) => s + r.current_occupancy, 0)
  const totalFree = totalCapacity - totalOccupancy
  const percentage = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0

  const building = buildings.find((b) => b.id === selectedBuilding)
  const roomsByFloor = floors
    .sort((a, b) => a.number - b.number)
    .map((f) => ({
      floor: f,
      rooms: rooms.filter((r) => r.floor === f.id).sort((a, b) => a.room_number.localeCompare(b.room_number)),
    }))

  const getRoomStatusColor = (room: Room) => {
    if (room.status === 'maintenance') return 'border-yellow-500/50 bg-yellow-500/5'
    if (room.status === 'closed') return 'border-gray-500/50 bg-gray-500/5'
    if (room.current_occupancy >= room.capacity) return 'border-dark-border bg-dark-card'
    return 'border-green-500/30 bg-green-500/5'
  }

  const getRoomBadge = (room: Room) => {
    if (room.status === 'maintenance') return { label: 'РЕМОНТ', color: 'bg-yellow-500' }
    if (room.status === 'closed') return { label: 'ЗАКРЫТА', color: 'bg-gray-500' }
    if (room.current_occupancy >= room.capacity) return { label: 'ЗАНЯТА', color: 'bg-dark-border' }
    return { label: 'ЕСТЬ МЕСТА', color: 'bg-green-600' }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Комнаты</h1>
          <p className="text-text-muted text-sm">
            {building?.name || '—'} · {floors.length} этажа · {rooms.length} комнат
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAddModal(true)} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus size={16} /> Добавить комнату
          </button>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="text-sm"
          >
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <div className="flex gap-1 bg-dark-card border border-dark-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-text-muted'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-accent text-white' : 'text-text-muted'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <div className="text-text-muted text-xs uppercase">Всего мест</div>
          <div className="text-2xl font-bold mt-1">{totalCapacity}</div>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <div className="text-text-muted text-xs uppercase">Занято</div>
          <div className="text-2xl font-bold mt-1">{totalOccupancy}</div>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <div className="text-text-muted text-xs uppercase">Свободно</div>
          <div className="text-2xl font-bold mt-1 text-green-400">{totalFree}</div>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <div className="text-text-muted text-xs uppercase">Загрузка</div>
          <div className="text-2xl font-bold mt-1">{percentage}%</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mb-6 text-sm text-text-secondary">
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-600" /> Есть места</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-dark-border" /> Занята</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Ремонт</span>
      </div>

      {/* Floors */}
      <div className="space-y-6">
        {roomsByFloor.map(({ floor, rooms: floorRooms }) => {
          const fCap = floorRooms.reduce((s, r) => s + r.capacity, 0)
          const fOcc = floorRooms.reduce((s, r) => s + r.current_occupancy, 0)
          return (
            <div key={floor.id}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{floor.number} этаж</h3>
                <span className="text-sm text-text-muted">
                  {floorRooms.length} комнат · {fOcc} занято · {fCap - fOcc} свободно
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {floorRooms.map((room) => {
                  const badge = getRoomBadge(room)
                  return (
                    <div
                      key={room.id}
                      onClick={() => setEditRoom(room)}
                      className={`border rounded-xl p-3 min-w-[100px] text-center cursor-pointer hover:border-accent/50 transition-colors ${getRoomStatusColor(room)}`}
                    >
                      <div className="text-lg font-bold">{room.room_number}</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {room.current_occupancy}/{room.capacity}
                      </div>
                      <div className={`mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${badge.color} text-white`}>
                        {badge.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {roomsByFloor.length === 0 && (
          <div className="text-center py-12 text-text-muted">Выберите корпус</div>
        )}
      </div>

      {showAddModal && (
        <AddRoomModal
          floors={floors.map((f) => ({ id: f.id, number: f.number }))}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            roomsApi.list({ building: selectedBuilding, page_size: '200' }).then((r) =>
              setRooms((r.data as PaginatedResponse<Room>).results),
            ).catch(() => {})
          }}
        />
      )}

      {editRoom && (
        <EditRoomModal
          room={editRoom}
          buildingName={building?.name}
          onClose={() => setEditRoom(null)}
          onUpdated={() => {
            roomsApi.list({ building: selectedBuilding, page_size: '200' }).then((r) =>
              setRooms((r.data as PaginatedResponse<Room>).results),
            ).catch(() => {})
          }}
        />
      )}
    </div>
  )
}
