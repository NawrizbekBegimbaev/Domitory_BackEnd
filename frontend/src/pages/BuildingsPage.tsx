import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MapPin, X } from 'lucide-react'
import { buildingsApi, floorsApi, roomsApi } from '../api/endpoints'
import type { Building, Floor, Room, PaginatedResponse } from '../types'
import { useTranslation } from '../i18n'

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
  const { t } = useTranslation()
  const [stats, setStats] = useState<BuildingStats[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editBuilding, setEditBuilding] = useState<Building | null>(null)

  const genderLabels: Record<string, string> = {
    male_only: t('genderMale').toUpperCase(),
    female_only: t('genderFemale').toUpperCase(),
    mixed: t('genderMixed').toUpperCase(),
  }

  const loadData = () => {
    buildingsApi.list({ page_size: '100' }).then(async (r) => {
      const buildings = (r.data as PaginatedResponse<Building>).results
      const statsArr: BuildingStats[] = []
      for (const b of buildings) {
        const [fRes, rRes] = await Promise.all([
          floorsApi.list({ building: b.id, page_size: '100' }).catch(() => null),
          roomsApi.list({ building: b.id, page_size: '500' }).catch(() => null),
        ])
        const fl = fRes ? (fRes.data as PaginatedResponse<Floor>).results : []
        const rm = rRes ? (rRes.data as PaginatedResponse<Room>).results : []
        statsArr.push({
          building: b,
          floorCount: fl.length,
          roomCount: rm.length,
          capacity: rm.reduce((s, r) => s + r.capacity, 0),
          occupancy: rm.reduce((s, r) => s + r.current_occupancy, 0),
        })
      }
      setStats(statsArr)
    }).catch(() => {})
  }

  useEffect(() => { loadData() }, [])

  const handleDeleteBuilding = async (b: Building) => {
    const s = stats.find((st) => st.building.id === b.id)
    if (s && s.occupancy > 0) {
      alert(t('cannotDeleteOccupied'))
      return
    }
    if (!confirm(t('deleteBuildingConfirm'))) return
    try {
      await buildingsApi.delete(b.id)
      loadData()
    } catch {
      alert(t('error'))
    }
  }

  const totalCapacity = stats.reduce((s, b) => s + b.capacity, 0)
  const totalOccupancy = stats.reduce((s, b) => s + b.occupancy, 0)
  const totalFree = totalCapacity - totalOccupancy
  const pct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('buildingsTitle')}</h1>
          <p className="text-text-muted text-sm">{t('buildingsDesc')}</p>
        </div>
        <button
          onClick={() => { setEditBuilding(null); setShowModal(true) }}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> {t('addBuilding')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map(({ building: b, floorCount, roomCount, capacity, occupancy }) => (
          <div key={b.id} className="bg-dark-card border border-dark-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{b.name}</h3>
                <span className="text-green-400 text-xs flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> {t('statusActive')}
                </span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${genderColors[b.gender_policy] || 'bg-dark-border text-text-secondary'}`}>
                {genderLabels[b.gender_policy] || b.gender_policy}
              </span>
            </div>

            <div className="flex gap-4 text-sm text-text-secondary mb-2">
              <span>{t('floors')}: <strong className="text-white">{floorCount}</strong></span>
              <span>{t('rooms')}: <strong className="text-white">{roomCount}</strong></span>
              <span>{t('capacity')}: <strong className="text-white">{capacity}</strong></span>
            </div>
            <div className="text-sm">
              {t('occupied')}: <span className="text-accent font-bold">{occupancy}</span>
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
                {t('manageFloors')}
              </button>
              <button
                onClick={() => { setEditBuilding(b); setShowModal(true) }}
                className="text-sm text-text-secondary hover:text-white transition-colors"
              >
                {t('edit')}
              </button>
              <button
                onClick={() => handleDeleteBuilding(b)}
                className="text-sm text-red-400 hover:text-red-300 transition-colors ml-auto"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {stats.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-6 text-sm">
            <span>{t('navBuildings')}: <strong>{stats.length}</strong></span>
            <span>{t('capacity')}: <strong>{totalCapacity}</strong></span>
            <span>{t('occupied')}: <strong>{totalOccupancy}</strong></span>
            <span>{t('free')}: <strong className="text-green-400">{totalFree}</strong> ({pct}%)</span>
          </div>
          <div className="mt-2 h-2 bg-dark-border rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {showModal && (
        <BuildingModal
          building={editBuilding}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadData() }}
        />
      )}
    </div>
  )
}

function BuildingModal({ building, onClose, onSaved }: { building: Building | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState(building?.name || '')
  const [address, setAddress] = useState(building?.address || '')
  const [genderPolicy, setGenderPolicy] = useState(building?.gender_policy || 'mixed')
  const [loading, setLoading] = useState(false)

  const isEdit = !!building

  const handleSave = async () => {
    if (!name) return
    setLoading(true)
    try {
      if (isEdit) {
        await buildingsApi.update(building!.id, { name, address, gender_policy: genderPolicy })
      } else {
        await buildingsApi.create({ name, address, gender_policy: genderPolicy })
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
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{isEdit ? t('editBuilding') : t('newBuilding')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('buildingName')} *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Корпус A" className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('buildingAddress')}</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ул. Примерная, 1" className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('genderPolicy')} *</label>
            <select value={genderPolicy} onChange={(e) => setGenderPolicy(e.target.value)} className="w-full">
              <option value="mixed">{t('genderMixed')}</option>
              <option value="male_only">{t('genderMale')}</option>
              <option value="female_only">{t('genderFemale')}</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
          <button onClick={handleSave} disabled={loading || !name}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? t('saving') : isEdit ? t('save') : t('addBuilding')}
          </button>
        </div>
      </div>
    </div>
  )
}
