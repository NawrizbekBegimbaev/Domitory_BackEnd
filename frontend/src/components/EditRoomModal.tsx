import { useEffect, useState } from 'react'
import { X, Minus, Plus, User, Users, ArrowRightLeft, Search, UserPlus } from 'lucide-react'
import { roomsApi, assignmentsApi, residentsApi, contractsApi, buildingsApi } from '../api/endpoints'
import type { Room, RoomAssignment, Resident, PaginatedResponse } from '../types'
import { getInitials } from '../utils/format'
import { useTranslation } from '../i18n'
import TransferResidentModal from './TransferResidentModal'

interface Props {
  room: Room
  buildingName?: string
  onClose: () => void
  onUpdated: () => void
  editable?: boolean
  hideResidents?: boolean
  buildingGenderPolicy?: string
}

export default function EditRoomModal({ room, buildingName, onClose, onUpdated, editable = false, hideResidents = false, buildingGenderPolicy }: Props) {
  const { t } = useTranslation()

  const genderOptions = [
    { value: 'male_only', label: t('genderMaleOnly'), icon: User },
    { value: 'female_only', label: t('genderFemaleOnly'), icon: User },
    { value: 'mixed', label: t('genderMixedRoom'), icon: Users },
  ]

  const statusOptions = [
    { value: 'available', label: t('roomStatusAvailable') },
    { value: 'full', label: t('roomStatusFull') },
    { value: 'maintenance', label: t('roomStatusMaintenance') },
    { value: 'closed', label: t('roomStatusClosed') },
  ]

  const [roomNumber, setRoomNumber] = useState(room.room_number)
  const [capacity, setCapacity] = useState(room.capacity)
  const [status, setStatus] = useState(room.status)
  const [genderPolicy, setGenderPolicy] = useState(room.gender_policy)
  const [monthlyPrice, setMonthlyPrice] = useState(room.monthly_price)
  const [priceDisplay, setPriceDisplay] = useState(
    String(Math.round(parseFloat(room.monthly_price))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  )
  const [loading, setLoading] = useState(false)
  const [residents, setResidents] = useState<RoomAssignment[]>([])
  const [transferAssignment, setTransferAssignment] = useState<RoomAssignment | null>(null)

  // Assign new resident flow
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Resident[]>([])
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [assignMonths, setAssignMonths] = useState(0)
  const [assigning, setAssigning] = useState(false)

  const loadResidents = () => {
    assignmentsApi.list({ room: room.id, status: 'active' }).then((r) => {
      setResidents((r.data as PaginatedResponse<RoomAssignment>).results)
    }).catch(() => {})
  }

  useEffect(() => { loadResidents() }, [room.id])

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
      })
      onUpdated()
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.error?.details?.status || err.response?.data?.status || err.response?.data?.error?.message || t('errorSaving')
      alert(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">{t('room')} {room.room_number}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="text-text-muted text-sm mb-6">
          {buildingName || room.building_name || ''} · {room.floor_number} {t('floorLabel')}
        </div>

        {/* Residents + empty slots */}
        {!hideResidents && <div className="mb-6">
          <label className="block text-xs text-text-muted uppercase mb-2">{t('residents')} ({residents.length}/{room.capacity})</label>
          <div className="space-y-2">
            {/* Occupied slots */}
            {residents.map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-dark-bg border border-dark-border rounded-lg p-3">
                <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%' }} className="bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                  {getInitials(a.resident_name || '?')}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.resident_name || a.resident}</div>
                  <div className="text-xs text-text-muted">{t('start').toLowerCase()} {a.start_date}</div>
                </div>
                <button onClick={() => setTransferAssignment(a)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-accent border border-accent/30 hover:bg-accent/10 transition-colors">
                  <ArrowRightLeft size={12} /> {t('relocate')}
                </button>
              </div>
            ))}

            {/* Empty slots — each can become an assign form */}
            {Array.from({ length: Math.max(0, room.capacity - residents.length) }).map((_, i) => (
              <div key={`empty-${i}`}>
                {activeSlot === i ? (
                  /* Inline assign form */
                  <div className="bg-dark-bg border border-accent/30 rounded-lg p-4 animate-[fadeSlideDown_0.5s_ease-out]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-accent">{t('addResident')}</span>
                      <button onClick={() => { setActiveSlot(null); setSelectedResident(null); setSearchQuery(''); setAssignMonths(0) }} className="text-text-muted hover:text-white"><X size={14} /></button>
                    </div>

                    {!selectedResident ? (
                      <div className="relative mb-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            if (e.target.value.length >= 2) {
                              residentsApi.list({ search: e.target.value, page_size: '5' }).then((r) => setSearchResults((r.data as PaginatedResponse<Resident>).results)).catch(() => {})
                            } else { setSearchResults([]) }
                          }}
                          placeholder={t('searchByNameOrId')}
                          className="w-full text-sm"
                          style={{ paddingLeft: '2rem' }}
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-dark-card border border-dark-border rounded-lg max-h-32 overflow-y-auto">
                            {searchResults.map((r) => (
                              <button key={r.id} onClick={() => { setSelectedResident(r); setSearchResults([]) }} className="w-full text-left px-3 py-2 text-sm hover:bg-dark-hover">
                                {r.full_name} <span className="text-text-muted">· {r.university_id}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-3 bg-dark-card border border-dark-border rounded-lg p-2">
                        <div style={{ width: 24, height: 24, minWidth: 24, borderRadius: '50%' }} className="bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">
                          {getInitials(selectedResident.full_name)}
                        </div>
                        <span className="text-sm flex-1">{selectedResident.full_name}</span>
                        <button onClick={() => setSelectedResident(null)} className="text-text-muted hover:text-white text-xs">{t('change')}</button>
                      </div>
                    )}

                    {selectedResident && (
                      <div className="mb-3">
                        <label className="block text-xs text-text-muted mb-2">{t('durationLabel')}</label>
                        <div className="flex flex-wrap gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                            <button key={m} onClick={() => setAssignMonths(m)}
                              className={`w-9 h-8 rounded text-xs font-medium transition-colors ${assignMonths === m ? 'bg-accent text-white' : 'bg-dark-card border border-dark-border text-text-secondary hover:border-accent/30'}`}
                            >{m}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedResident && assignMonths > 0 && (
                      <button
                        onClick={async () => {
                          setAssigning(true)
                          try {
                            const bId = room.building_id || (await buildingsApi.list({ page_size: '1' })).data.results[0]?.id
                            if (!bId) throw new Error('No building')
                            const today = new Date()
                            const endD = new Date(today); endD.setMonth(endD.getMonth() + assignMonths)
                            const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
                            const contract = await contractsApi.create({
                              resident: selectedResident.id, building: bId,
                              contract_number: `\u0414\u0413-${today.getFullYear()}-${rand}`,
                              start_date: today.toISOString().split('T')[0],
                              end_date: endD.toISOString().split('T')[0],
                            })
                            await assignmentsApi.create({ contract: contract.data.id, resident: selectedResident.id, room: room.id })
                            setActiveSlot(null); setSelectedResident(null); setAssignMonths(0)
                            loadResidents(); onUpdated()
                          } catch (err: any) {
                            alert(t('error') + ': ' + (err.response?.data?.error?.message || err.message))
                          } finally { setAssigning(false) }
                        }}
                        disabled={assigning}
                        className="w-full py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {assigning ? t('saving') : `${t('addResident')} (${assignMonths} ${t('monthsShort')})`}
                      </button>
                    )}
                  </div>
                ) : (
                  /* Empty slot button */
                  <button onClick={() => { setActiveSlot(i); setSelectedResident(null); setSearchQuery(''); setAssignMonths(0) }}
                    className="w-full flex items-center gap-3 bg-dark-bg border border-dashed border-dark-border rounded-lg p-3 hover:border-accent/50 transition-colors group"
                  >
                    <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%' }} className="bg-dark-border text-text-muted flex items-center justify-center group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                      <UserPlus size={14} />
                    </div>
                    <span className="text-sm text-text-muted group-hover:text-accent transition-colors">{t('addResident')}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>}

        <div className="space-y-4">
          {editable ? (
            <>
              {/* Editable mode — full form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted uppercase mb-1">{t('roomNumber')} *</label>
                  <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted uppercase mb-1">{t('roomCapacity')}</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCapacity(Math.max(1, capacity - 1))} className="w-10 h-10 rounded-lg border border-dark-border flex items-center justify-center hover:bg-dark-hover"><Minus size={16} /></button>
                    <span className="w-10 text-center font-bold text-lg">{capacity}</span>
                    <button onClick={() => setCapacity(Math.min(10, capacity + 1))} className="w-10 h-10 rounded-lg border border-dark-border flex items-center justify-center hover:bg-dark-hover"><Plus size={16} /></button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('status')}</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                  {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-muted uppercase mb-2">{t('genderPolicy')}</label>
                {buildingGenderPolicy && buildingGenderPolicy !== 'mixed' ? (
                  <input value={genderOptions.find(g => g.value === buildingGenderPolicy)?.label || buildingGenderPolicy} disabled className="w-full opacity-60" />
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {genderOptions.map((g) => (
                      <button key={g.value} onClick={() => setGenderPolicy(g.value)}
                        className={`py-3 rounded-xl border text-center transition-colors ${genderPolicy === g.value ? 'border-accent bg-accent/10' : 'border-dark-border hover:border-accent/30'}`}
                      >
                        <g.icon size={20} className={`mx-auto mb-1 ${genderPolicy === g.value ? 'text-accent' : 'text-text-muted'}`} />
                        <div className="text-xs">{g.label}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('monthlyPrice')}</label>
                <input type="text" inputMode="numeric" value={priceDisplay} onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setMonthlyPrice(d); setPriceDisplay(d.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')) }} placeholder="500 000" className="w-full" />
              </div>
            </>
          ) : (
            <>
              {/* Readonly mode — compact info + only status editable */}
              <div className="grid grid-cols-3 gap-4 bg-dark-bg border border-dark-border rounded-lg p-4 text-sm">
                <div className="text-center">
                  <div className="text-text-muted text-xs uppercase">{t('roomCapacity')}</div>
                  <div className="font-bold text-lg mt-1">{capacity}</div>
                </div>
                <div className="text-center">
                  <div className="text-text-muted text-xs uppercase">{t('genderPolicy')}</div>
                  <div className="font-bold mt-1">{genderOptions.find(g => g.value === genderPolicy)?.label}</div>
                </div>
                <div className="text-center">
                  <div className="text-text-muted text-xs uppercase">{t('monthlyPrice')}</div>
                  <div className="font-bold mt-1">{priceDisplay} UZS</div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('status')}</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                  {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </>
          )}

          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-accent uppercase font-bold">{t('occupancyLoad')}</div>
              <div className="text-sm mt-1">{room.current_occupancy} {t('of')} {capacity} ({pct}%)</div>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: capacity }).map((_, i) => (
                <div key={i} className={`w-6 h-6 rounded-full ${i < room.current_occupancy ? 'bg-accent' : 'bg-dark-border'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('close')}</button>
          <button onClick={handleSave} disabled={loading || !roomNumber}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? t('saving') : t('save')}
          </button>
        </div>
      </div>
      {transferAssignment && (
        <TransferResidentModal
          residentName={transferAssignment.resident_name || ''}
          currentAssignment={transferAssignment}
          onClose={() => setTransferAssignment(null)}
          onTransferred={() => { setTransferAssignment(null); loadResidents(); onUpdated() }}
        />
      )}
    </div>
  )
}
