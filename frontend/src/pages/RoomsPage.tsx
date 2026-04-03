import { useEffect, useState } from 'react'
import { Plus, LayoutGrid, List, ArrowUpDown } from 'lucide-react'
import { buildingsApi, floorsApi, roomsApi } from '../api/endpoints'
import type { Building, Floor, Room, PaginatedResponse } from '../types'
import { statusColors, formatMoney, getStatusLabel } from '../utils/format'
import AddRoomModal from '../components/AddRoomModal'
import EditRoomModal from '../components/EditRoomModal'
import { useTranslation } from '../i18n'

type SortKey = 'room_number' | 'capacity' | 'current_occupancy' | 'monthly_price'

export default function RoomsPage() {
  const { t } = useTranslation()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<SortKey>('room_number')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)

  useEffect(() => {
    buildingsApi.list({ page_size: '100' }).then((r) => {
      const b = (r.data as PaginatedResponse<Building>).results
      setBuildings(b)
      if (b.length > 0) setSelectedBuilding(b[0].id)
    }).catch(() => {})
  }, [])

  const loadRooms = () => {
    if (!selectedBuilding) return
    floorsApi.list({ building: selectedBuilding, page_size: '100' }).then((r) =>
      setFloors((r.data as PaginatedResponse<Floor>).results),
    ).catch(() => {})
    roomsApi.list({ building: selectedBuilding, page_size: '200' }).then((r) =>
      setRooms((r.data as PaginatedResponse<Room>).results),
    ).catch(() => {})
  }

  useEffect(() => { loadRooms() }, [selectedBuilding])

  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0)
  const totalOccupancy = rooms.reduce((s, r) => s + r.current_occupancy, 0)
  const totalFree = totalCapacity - totalOccupancy
  const percentage = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0
  const building = buildings.find((b) => b.id === selectedBuilding)

  const sortedRooms = [...rooms].sort((a, b) => {
    if (sortBy === 'room_number') return a.room_number.localeCompare(b.room_number)
    if (sortBy === 'capacity') return b.capacity - a.capacity
    if (sortBy === 'current_occupancy') return b.current_occupancy - a.current_occupancy
    if (sortBy === 'monthly_price') return parseFloat(b.monthly_price) - parseFloat(a.monthly_price)
    return 0
  })

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
    if (room.status === 'maintenance') return { label: t('statusMaintenance').toUpperCase(), color: 'bg-yellow-500 text-white' }
    if (room.status === 'closed') return { label: t('statusClosed').toUpperCase(), color: 'bg-gray-500 text-white' }
    if (room.current_occupancy >= room.capacity) return { label: t('statusFull').toUpperCase(), color: 'bg-dark-border text-text-primary' }
    return { label: t('statusAvailable').toUpperCase(), color: 'bg-green-600 text-white' }
  }

  const statusColor = (room: Room) => {
    if (room.status === 'maintenance') return 'text-yellow-400'
    if (room.status === 'closed') return 'text-gray-400'
    if (room.current_occupancy >= room.capacity) return 'text-red-400'
    return 'text-green-400'
  }

  const genderShort = (gp: string) => {
    if (gp === 'mixed') return t('genderMixed').slice(0, 4) + '.'
    if (gp === 'male_only') return t('genderMale').slice(0, 3) + '.'
    return t('genderFemale').slice(0, 3) + '.'
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('roomsTitle')}</h1>
          <p className="text-text-muted text-sm">{building?.name || '—'} · {floors.length} {t('floors').toLowerCase()} · {rooms.length} {t('rooms').toLowerCase()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedBuilding} onChange={(e) => setSelectedBuilding(e.target.value)} className="text-sm">
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div className="flex gap-1 bg-dark-card border border-dark-border rounded-lg p-1">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-text-muted'}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-accent text-white' : 'text-text-muted'}`}><List size={16} /></button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <div className="text-text-muted text-xs uppercase">{t('totalBeds')}</div>
          <div className="text-2xl font-bold mt-1">{totalCapacity}</div>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <div className="text-text-muted text-xs uppercase">{t('occupied')}</div>
          <div className="text-2xl font-bold mt-1">{totalOccupancy}</div>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <div className="text-text-muted text-xs uppercase">{t('free')}</div>
          <div className="text-2xl font-bold mt-1 text-green-400">{totalFree}</div>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <div className="text-text-muted text-xs uppercase">{t('dashLoad')}</div>
          <div className="text-2xl font-bold mt-1">{percentage}%</div>
        </div>
      </div>

      {/* Legend + Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-6 text-sm text-text-secondary">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-600" /> {t('statusAvailable')}</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-dark-border" /> {t('statusFull')}</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> {t('statusMaintenance')}</span>
        </div>
        {viewMode === 'list' && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <ArrowUpDown size={14} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="text-sm">
              <option value="room_number">{t('sortByNumber')}</option>
              <option value="capacity">{t('sortByCapacity')}</option>
              <option value="current_occupancy">{t('sortByOccupancy')}</option>
              <option value="monthly_price">{t('sortByPrice')}</option>
            </select>
          </div>
        )}
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {roomsByFloor.map(({ floor, rooms: floorRooms }) => {
            const fOcc = floorRooms.reduce((s, r) => s + r.current_occupancy, 0)
            const fCap = floorRooms.reduce((s, r) => s + r.capacity, 0)
            return (
              <div key={floor.id}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{floor.number} {t('floor').toLowerCase()}</h3>
                  <span className="text-sm text-text-muted">{floorRooms.length} {t('rooms').toLowerCase()} · {fOcc} {t('occupied').toLowerCase()} · {fCap - fOcc} {t('free').toLowerCase()}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {floorRooms.map((room) => {
                    const badge = getRoomBadge(room)
                    return (
                      <div key={room.id} onClick={() => setEditRoom(room)}
                        className={`border rounded-xl p-3 min-w-[100px] text-center cursor-pointer hover:border-accent/50 transition-colors ${getRoomStatusColor(room)}`}
                      >
                        <div className="text-lg font-bold">{room.room_number}</div>
                        <div className="text-xs text-text-muted mt-0.5">{room.current_occupancy}/{room.capacity}</div>
                        <div className={`mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${badge.color}`}>{badge.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-dark-card border border-dark-border rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="text-text-muted text-xs uppercase border-b border-dark-border">
                <th className="text-left px-4 py-3">{t('room')}</th>
                <th className="text-left px-4 py-3">{t('floor')}</th>
                <th className="text-center px-4 py-3">{t('roomCapacity')}</th>
                <th className="text-center px-4 py-3">{t('occupied')}</th>
                <th className="text-center px-4 py-3">{t('free')}</th>
                <th className="text-left px-4 py-3">{t('genderPolicy')}</th>
                <th className="text-right px-4 py-3">{t('monthlyPrice')}</th>
                <th className="text-right px-4 py-3">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRooms.map((room) => (
                <tr key={room.id} onClick={() => setEditRoom(room)} className="border-b border-dark-border/50 hover:bg-dark-hover cursor-pointer">
                  <td className="px-4 py-3 font-medium">{room.room_number}</td>
                  <td className="px-4 py-3 text-text-muted">{room.floor_number}</td>
                  <td className="px-4 py-3 text-center">{room.capacity}</td>
                  <td className="px-4 py-3 text-center">{room.current_occupancy}</td>
                  <td className="px-4 py-3 text-center text-green-400">{room.available_beds}</td>
                  <td className="px-4 py-3 text-text-muted text-sm">{genderShort(room.gender_policy)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(room.monthly_price)}</td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${statusColor(room)}`}>{getStatusLabel(room.status, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rooms.length === 0 && <div className="text-center py-12 text-text-muted">{t('selectBuilding')}</div>}

      {showAddModal && (
        <AddRoomModal
          floors={floors.map((f) => ({ id: f.id, number: f.number }))}
          onClose={() => setShowAddModal(false)}
          onCreated={loadRooms}
        />
      )}

      {editRoom && (
        <EditRoomModal
          room={editRoom}
          buildingName={building?.name}
          onClose={() => setEditRoom(null)}
          onUpdated={() => { setEditRoom(null); loadRooms() }}
        />
      )}
    </div>
  )
}
