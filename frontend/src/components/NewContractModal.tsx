import { useEffect, useState } from 'react'
import { X, Search, ArrowRight, ArrowLeft } from 'lucide-react'
import { residentsApi, buildingsApi, floorsApi, roomsApi, contractsApi, assignmentsApi } from '../api/endpoints'
import type { Resident, Building, Floor, Room, PaginatedResponse } from '../types'
import { formatMoney } from '../utils/format'
import { useTranslation } from '../i18n'
import EligibilityHint, { askOverride } from './EligibilityHint'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function NewContractModal({ onClose, onCreated }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)

  // Step 1 — Contract
  const [residents, setResidents] = useState<Resident[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [search, setSearch] = useState('')
  const [residentId, setResidentId] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [contractNumber, setContractNumber] = useState(() => {
    const year = new Date().getFullYear()
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    return `\u0414\u0413-${year}-${rand}`
  })
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [durationMonths, setDurationMonths] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)

  // Step 2 — Room assignment
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [floorId, setFloorId] = useState('')
  const [roomId, setRoomId] = useState('')

  const [loading, setLoading] = useState(false)
  const [createdContractId, setCreatedContractId] = useState('')

  useEffect(() => {
    buildingsApi.list({ page_size: '100' }).then((r) => {
      const b = (r.data as PaginatedResponse<Building>).results
      setBuildings(b)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (search.length < 2) return
    residentsApi.list({ search, page_size: '10' }).then((r) => {
      setResidents((r.data as PaginatedResponse<Resident>).results)
      setShowDropdown(true)
    }).catch(() => {})
  }, [search])

  // Load floors when building selected
  useEffect(() => {
    if (!buildingId) return
    floorsApi.list({ building: buildingId, page_size: '100' }).then((r) => {
      const f = (r.data as PaginatedResponse<Floor>).results.sort((a, b) => a.number - b.number)
      setFloors(f)
      setFloorId(f[0]?.id || '')
    }).catch(() => {})
    roomsApi.list({ building: buildingId, status: 'available', page_size: '500' }).then((r) => {
      setRooms((r.data as PaginatedResponse<Room>).results.filter((rm) => rm.current_occupancy < rm.capacity))
    }).catch(() => {})
  }, [buildingId])

  const selectedResident = residents.find((r) => r.id === residentId)
  const filteredRooms = rooms.filter((r) => !floorId || r.floor === floorId)
  const selectedRoom = rooms.find((r) => r.id === roomId)

  const selectDuration = (months: number) => {
    setDurationMonths(months)
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + months)
    setEndDate(d.toISOString().split('T')[0])
  }

  const handleCreateContract = async () => {
    if (!residentId || !buildingId || !contractNumber || !startDate || !endDate) return
    setLoading(true)
    try {
      const res = await contractsApi.create({
        resident: residentId,
        building: buildingId,
        contract_number: contractNumber,
        start_date: startDate,
        end_date: endDate,
      })
      setCreatedContractId(res.data.id)
      setStep(2)
    } catch {
      alert(t('errorCreatingContract'))
    } finally {
      setLoading(false)
    }
  }

  const handleAssignRoom = async () => {
    if (!createdContractId || !roomId) return
    setLoading(true)
    try {
      const payload: Record<string, unknown> = { contract: createdContractId, resident: residentId, room: roomId }
      try {
        await assignmentsApi.create(payload)
      } catch (err: any) {
        const reason = askOverride(err, t)
        if (!reason) throw err
        await assignmentsApi.create({ ...payload, override_reason: reason })
      }
      onCreated()
      onClose()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errorAssigningRoom'))
    } finally {
      setLoading(false)
    }
  }

  const handleSkipRoom = () => {
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{t('newContract')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-accent"><X size={20} /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-accent' : 'text-text-muted'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-accent text-white' : 'bg-dark-border'}`}>1</span>
            <span className="text-sm font-medium">{t('contractStep1')}</span>
          </div>
          <div className="flex-1 h-px bg-dark-border" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-accent' : 'text-text-muted'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-accent text-white' : 'bg-dark-border'}`}>2</span>
            <span className="text-sm font-medium">{t('contractStep2')}</span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            {/* Resident search */}
            <div className="relative">
              <label className="block text-xs text-text-muted uppercase mb-1">{t('resident')} *</label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={selectedResident ? selectedResident.full_name : search}
                  onChange={(e) => { setSearch(e.target.value); setResidentId('') }}
                  onFocus={() => search.length >= 2 && setShowDropdown(true)}
                  placeholder={t('searchByNameOrPassport')}
                  className="w-full"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
              {showDropdown && residents.length > 0 && !residentId && (
                <div className="absolute z-10 w-full mt-1 bg-dark-card border border-dark-border rounded-lg max-h-40 overflow-y-auto">
                  {residents.map((r) => (
                    <button key={r.id} onClick={() => { setResidentId(r.id); setShowDropdown(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-dark-hover">
                      {r.full_name} <span className="text-text-muted">· {r.university_id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Building */}
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('building')} *</label>
              <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className="w-full">
                <option value="">{t('selectBuilding')}</option>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Contract number — auto generated, readonly */}
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('contractNumber')}</label>
              <input value={contractNumber} disabled className="w-full text-accent opacity-70" />
            </div>

            {/* Duration — month buttons */}
            <div>
              <label className="block text-xs text-text-muted uppercase mb-2">{t('durationLabel')} *</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <button key={m} onClick={() => selectDuration(m)}
                    className={`w-12 h-10 rounded-lg border text-sm font-medium transition-colors ${
                      durationMonths === m ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary hover:border-accent/30'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="text-xs text-text-muted mt-2">
                {t('monthsShort')}
                {durationMonths > 0 && (
                  <span className="text-accent ml-2">{startDate} → {endDate}</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
              <button
                onClick={handleCreateContract}
                disabled={loading || !residentId || !buildingId || !contractNumber || !durationMonths}
                className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? t('creating') : <> {t('next')} <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('floor')}</label>
                <select value={floorId} onChange={(e) => { setFloorId(e.target.value); setRoomId('') }} className="w-full">
                  <option value="">{t('allFloors')}</option>
                  {floors.map((f) => <option key={f.id} value={f.id}>{f.number} {t('floorLabel')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('room')} *</label>
                <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full">
                  <option value="">{t('selectRoom')}</option>
                  {filteredRooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.room_number} ({r.current_occupancy}/{r.capacity})</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedRoom && (
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-sm">
                <div className="text-accent uppercase text-xs font-bold">
                  {t('room')} {selectedRoom.room_number} · {t('beds')}: {selectedRoom.capacity} · {t('occupied')}: {selectedRoom.current_occupancy} · {t('free')}: {selectedRoom.available_beds}
                </div>
              </div>
            )}
            <EligibilityHint residentId={residentId} roomId={roomId} />

            <div className="flex justify-between gap-3 mt-6">
              <button onClick={handleSkipRoom} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover text-text-muted">
                {t('skip')}
              </button>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover flex items-center gap-1">
                  <ArrowLeft size={16} /> {t('back')}
                </button>
                <button
                  onClick={handleAssignRoom}
                  disabled={loading || !roomId}
                  className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
                >
                  {loading ? t('assigning') : t('assignRoom')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
