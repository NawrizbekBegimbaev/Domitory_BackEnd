import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MapPin } from 'lucide-react'
import { buildingsApi, floorsApi, roomsApi } from '../api/endpoints'
import type { Building, Floor, Room, PaginatedResponse } from '../types'

const genderLabels: Record<string, string> = {
  male_only: 'МУЖСКОЙ',
  female_only: 'ЖЕНСКИЙ',
  mixed: 'СМЕШАННЫЙ',
}

const genderColors: Record<string, string> = {
  male_only: 'bg-blue-500/20 text-blue-400',
  female_only: 'bg-pink-500/20 text-pink-400',
  mixed: 'bg-accent/20 text-accent',
}

interface BuildingStats {
  building: Building
  floorCount: number
  roomCount: number
  capacity: number
  occupancy: number
}

export default function BuildingsPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<BuildingStats[]>([])

  useEffect(() => {
    buildingsApi.list({ page_size: '100' }).then(async (r) => {
      const buildings = (r.data as PaginatedResponse<Building>).results
      const statsArr: BuildingStats[] = []
      for (const b of buildings) {
        const [fRes, rRes] = await Promise.all([
          floorsApi.list({ building: b.id, page_size: '100' }).catch(() => null),
          roomsApi.list({ building: b.id, page_size: '500' }).catch(() => null),
        ])
        const floors = fRes ? (fRes.data as PaginatedResponse<Floor>).results : []
        const rooms = rRes ? (rRes.data as PaginatedResponse<Room>).results : []
        statsArr.push({
          building: b,
          floorCount: floors.length,
          roomCount: rooms.length,
          capacity: rooms.reduce((s, r) => s + r.capacity, 0),
          occupancy: rooms.reduce((s, r) => s + r.current_occupancy, 0),
        })
      }
      setStats(statsArr)
    }).catch(() => {})
  }, [])

  const totalCapacity = stats.reduce((s, b) => s + b.capacity, 0)
  const totalOccupancy = stats.reduce((s, b) => s + b.occupancy, 0)
  const totalFree = totalCapacity - totalOccupancy
  const pct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Корпуса</h1>
          <p className="text-text-muted text-sm">Управление корпусами общежития</p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
          <Plus size={16} /> Добавить корпус
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map(({ building: b, floorCount, roomCount, capacity, occupancy }) => (
          <div key={b.id} className="bg-dark-card border border-dark-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{b.name}</h3>
                <span className="text-green-400 text-xs flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> Активен
                </span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${genderColors[b.gender_policy] || 'bg-dark-border text-text-secondary'}`}>
                {genderLabels[b.gender_policy] || b.gender_policy}
              </span>
            </div>

            <div className="flex gap-4 text-sm text-text-secondary mb-2">
              <span>Этажей: <strong className="text-white">{floorCount}</strong></span>
              <span>Комнат: <strong className="text-white">{roomCount}</strong></span>
              <span>Мест: <strong className="text-white">{capacity}</strong></span>
            </div>
            <div className="text-sm">
              Занято: <span className="text-accent font-bold">{occupancy}</span>
            </div>

            {b.address && (
              <div className="flex items-center gap-1 text-xs text-text-muted mt-3">
                <MapPin size={12} /> {b.address}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-dark-border">
              <button
                onClick={() => navigate(`/buildings/${b.id}/floors`)}
                className="text-sm text-text-secondary hover:text-white transition-colors"
              >
                Управлять этажами
              </button>
              <button className="text-sm text-text-secondary hover:text-white transition-colors">
                Редактировать
              </button>
            </div>
          </div>
        ))}
      </div>

      {stats.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-6 text-sm">
            <span>Всего корпусов: <strong>{stats.length}</strong></span>
            <span>Мест: <strong>{totalCapacity}</strong></span>
            <span>Занято: <strong>{totalOccupancy}</strong></span>
            <span>Свободно: <strong className="text-green-400">{totalFree}</strong> ({pct}%)</span>
          </div>
          <div className="mt-2 h-2 bg-dark-border rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
