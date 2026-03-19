import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, Pencil, X, Trash2 } from 'lucide-react'
import { buildingsApi, floorsApi, roomsApi } from '../api/endpoints'
import type { Building, Floor, Room, PaginatedResponse } from '../types'
import { useTranslation } from '../i18n'
import EditRoomModal from '../components/EditRoomModal'

export default function FloorsPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [building, setBuilding] = useState<Building | null>(null)
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Modals
  const [showFloorModal, setShowFloorModal] = useState(false)
  const [editFloor, setEditFloor] = useState<Floor | null>(null)
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [roomForFloor, setRoomForFloor] = useState<string>('')
  const [showBuildingModal, setShowBuildingModal] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)

  const loadData = () => {
    if (!buildingId) return
    buildingsApi.get(buildingId).then((r) => setBuilding(r.data)).catch(() => {})
    floorsApi.list({ building: buildingId, page_size: '100' }).then((r) =>
      setFloors((r.data as PaginatedResponse<Floor>).results.sort((a, b) => a.number - b.number)),
    ).catch(() => {})
    roomsApi.list({ building: buildingId, page_size: '500' }).then((r) =>
      setRooms((r.data as PaginatedResponse<Room>).results),
    ).catch(() => {})
  }

  useEffect(() => { loadData() }, [buildingId])

  useEffect(() => {
    if (floors.length > 0) setExpanded(new Set([floors[0].id]))
  }, [floors])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const getRoomColor = (room: Room) => {
    if (room.status === 'maintenance') return 'bg-yellow-500 text-white'
    if (room.status === 'closed') return 'bg-gray-600 text-white'
    if (room.current_occupancy >= room.capacity) return 'bg-dark-border text-white'
    return 'bg-green-600 text-white'
  }

  const handleDeleteFloor = async (floor: Floor) => {
    const floorRooms = rooms.filter((r) => r.floor === floor.id)
    const occupied = floorRooms.some((r) => r.current_occupancy > 0)
    if (occupied) {
      alert(t('cannotDeleteFloorOccupied'))
      return
    }
    if (!confirm(t('deleteFloorConfirm'))) return
    try {
      // Delete all rooms on this floor first
      for (const r of floorRooms) {
        await roomsApi.delete(r.id)
      }
      await floorsApi.delete(floor.id)
      loadData()
    } catch {
      alert(t('error'))
    }
  }

  const handleDeleteBuilding = async () => {
    if (!building) return
    if (!confirm(t('deleteBuildingConfirm'))) return
    try {
      await buildingsApi.delete(building.id)
      navigate('/buildings')
    } catch {
      alert(t('cannotDeleteOccupied'))
    }
  }

  return (
    <div>
      <div className="text-text-muted text-sm mb-4">
        <button onClick={() => navigate('/buildings')} className="hover:text-white">{t('buildingsTitle')}</button>
        {' > '}{building?.name || '...'}{' > '}{t('floorsTitle')}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('floorsTitle')} — {building?.name || '...'}</h1>
          <p className="text-text-muted text-sm">{floors.length} {t('floors').toLowerCase()} · {rooms.length} {t('rooms').toLowerCase()}</p>
        </div>
        <button
          onClick={() => { setEditFloor(null); setShowFloorModal(true) }}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> {t('addFloor')}
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
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer" onClick={() => toggle(floor.id)}>
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className="font-semibold">{floor.number} {t('floor').toLowerCase()}</span>
                  <span className="text-sm text-text-muted">{floorRooms.length} {t('rooms').toLowerCase()} · {fOcc} {t('occupied').toLowerCase()} · {fFree} {t('free').toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-dark-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${fPct >= 90 ? 'bg-red-500' : fPct >= 50 ? 'bg-accent' : 'bg-green-500'}`} style={{ width: `${fPct}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${fPct >= 90 ? 'text-red-400' : fPct >= 50 ? 'text-accent' : 'text-green-400'}`}>
                    {fPct}%
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); setEditFloor(floor); setShowFloorModal(true) }} className="text-text-muted hover:text-accent">
                    <Pencil size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteFloor(floor) }} className="text-text-muted hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="px-5 pb-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {floorRooms.map((room) => (
                      <div key={room.id} onClick={() => setEditRoom(room)} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:ring-1 hover:ring-accent/50 ${getRoomColor(room)}`} title={`${room.current_occupancy}/${room.capacity}`}>
                        {room.room_number}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setRoomForFloor(floor.id); setShowRoomModal(true) }}
                    className="text-accent text-sm hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> {t('addRoomToFloor')}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {building && (
        <div className="mt-6 flex items-center gap-4 text-sm">
          <button onClick={() => setShowBuildingModal(true)} className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
            <Pencil size={14} /> {t('editBuilding')}
          </button>
        </div>
      )}

      {/* Floor modal */}
      {showFloorModal && (
        <FloorModal
          buildingId={buildingId!}
          floor={editFloor}
          onClose={() => setShowFloorModal(false)}
          onSaved={() => { setShowFloorModal(false); loadData() }}
        />
      )}

      {/* Room modal */}
      {showRoomModal && (
        <RoomModal
          floorId={roomForFloor}
          buildingGenderPolicy={building?.gender_policy || 'mixed'}
          onClose={() => setShowRoomModal(false)}
          onSaved={() => { setShowRoomModal(false); loadData() }}
        />
      )}

      {/* Building edit modal */}
      {showBuildingModal && building && (
        <BuildingEditModal
          building={building}
          onClose={() => setShowBuildingModal(false)}
          onSaved={() => { setShowBuildingModal(false); loadData() }}
        />
      )}

      {editRoom && (
        <EditRoomModal
          room={editRoom}
          buildingName={building?.name}
          onClose={() => setEditRoom(null)}
          onUpdated={() => { setEditRoom(null); loadData() }}
          editable
          hideResidents
          buildingGenderPolicy={building?.gender_policy}
        />
      )}
    </div>
  )
}

function FloorModal({ buildingId, floor, onClose, onSaved }: { buildingId: string; floor: Floor | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const [number, setNumber] = useState(floor?.number || 1)
  const [description, setDescription] = useState(floor?.description || '')
  const [loading, setLoading] = useState(false)
  const isEdit = !!floor

  const handleSave = async () => {
    setLoading(true)
    try {
      if (isEdit) {
        await floorsApi.update(floor!.id, { number, description })
      } else {
        await floorsApi.create({ building: buildingId, number, description })
      }
      onSaved()
    } catch {
      alert(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-lg font-bold">{isEdit ? t('editFloor') : t('newFloor')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('floorNumber')} *</label>
            <input type="number" min={1} value={number} onChange={(e) => setNumber(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('description')}</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Например: мужской этаж" className="w-full" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
          <button onClick={handleSave} disabled={loading || !number} className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50">
            {loading ? t('saving') : isEdit ? t('save') : t('create')}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatWithSpaces(val: string) {
  return val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function RoomModal({ floorId, buildingGenderPolicy, onClose, onSaved }: { floorId: string; buildingGenderPolicy: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const [roomNumber, setRoomNumber] = useState('')
  const [capacity, setCapacity] = useState(4)
  const isMixed = buildingGenderPolicy === 'mixed'
  const [genderPolicy, setGenderPolicy] = useState(isMixed ? 'mixed' : buildingGenderPolicy)
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [priceDisplay, setPriceDisplay] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!roomNumber) return
    setLoading(true)
    try {
      await roomsApi.create({
        floor: floorId,
        room_number: roomNumber,
        capacity,
        gender_policy: genderPolicy,
        monthly_price: monthlyPrice || '0',
      })
      onSaved()
    } catch {
      alert(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-lg font-bold">{t('newRoom')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('roomNumber')} *</label>
              <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="101" className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('roomCapacity')} *</label>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('genderPolicy')}</label>
            {isMixed ? (
              <select value={genderPolicy} onChange={(e) => setGenderPolicy(e.target.value)} className="w-full">
                <option value="mixed">{t('genderMixed')}</option>
                <option value="male_only">{t('genderMale')}</option>
                <option value="female_only">{t('genderFemale')}</option>
              </select>
            ) : (
              <input value={buildingGenderPolicy === 'male_only' ? t('genderMale') : t('genderFemale')} disabled className="w-full opacity-60" />
            )}
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('monthlyPrice')}</label>
            <input type="text" inputMode="numeric" value={priceDisplay} onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setMonthlyPrice(d); setPriceDisplay(formatWithSpaces(d)) }} placeholder="500 000" className="w-full" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
          <button onClick={handleSave} disabled={loading || !roomNumber} className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50">
            {loading ? t('saving') : t('addRoom')}
          </button>
        </div>
      </div>
    </div>
  )
}

function BuildingEditModal({ building, onClose, onSaved }: { building: Building; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState(building.name)
  const [address, setAddress] = useState(building.address)
  const [genderPolicy, setGenderPolicy] = useState(building.gender_policy)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name) return
    setLoading(true)
    try {
      await buildingsApi.update(building.id, { name, address, gender_policy: genderPolicy })
      onSaved()
    } catch {
      alert(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-lg font-bold">{t('editBuilding')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('buildingName')} *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('buildingAddress')}</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('genderPolicy')}</label>
            <select value={genderPolicy} onChange={(e) => setGenderPolicy(e.target.value)} className="w-full">
              <option value="mixed">{t('genderMixed')}</option>
              <option value="male_only">{t('genderMale')}</option>
              <option value="female_only">{t('genderFemale')}</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
          <button onClick={handleSave} disabled={loading || !name} className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50">
            {loading ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
