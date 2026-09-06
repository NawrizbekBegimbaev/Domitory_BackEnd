import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, CheckCircle2, Clock, MapPin, ListOrdered, BookmarkCheck, Settings2 } from 'lucide-react'
import { admissionApi, buildingsApi, floorsApi, roomsApi, facultiesApi } from '../api/endpoints'
import type { Campaign, BookingWindow, PlacementRule, BuildingOrder, Booking, Building, Floor, Room } from '../types'
import { formatDateTime, formatDate } from '../utils/format'
import { useTranslation } from '../i18n'
import { useCurrentUser } from '../hooks/useCurrentUser'

type Tab = 'campaign' | 'windows' | 'rules' | 'order' | 'bookings'

const COURSES = [1, 2, 3, 4, 5, 6]

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Admission settings: campaign, booking windows, placement rules, fill order, bookings. */
export default function AdmissionPage() {
  const { t } = useTranslation()
  const user = useCurrentUser()
  const canEdit = ['platform_admin', 'university_admin'].includes(user?.role?.name || '')
  const canBook = canEdit || user?.role?.name === 'dorm_manager'

  const [tab, setTab] = useState<Tab>('campaign')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignId, setCampaignId] = useState('')
  const [buildings, setBuildings] = useState<Building[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [faculties, setFaculties] = useState<string[]>([])
  const [error, setError] = useState('')

  const campaign = campaigns.find((c) => c.id === campaignId) || null

  const loadCampaigns = async () => {
    const r = await admissionApi.campaigns.list()
    setCampaigns(r.data.results)
    if (!campaignId) {
      const active = r.data.results.find((c) => c.is_active) || r.data.results[0]
      if (active) setCampaignId(active.id)
    }
  }

  useEffect(() => {
    loadCampaigns().catch(() => {})
    buildingsApi.list({ page_size: '100' }).then((r) => setBuildings(r.data.results)).catch(() => {})
    floorsApi.list({ page_size: '500' }).then((r) => setFloors(r.data.results)).catch(() => {})
    roomsApi.list({ page_size: '1000' }).then((r) => setRooms(r.data.results)).catch(() => {})
    facultiesApi.list().then((r) => setFaculties(r.data.results.map((f) => f.name))).catch(() => {})
  }, [])

  const showError = (err: any) => {
    const d = err?.response?.data
    const msg = d?.error?.message || (d && typeof d === 'object' ? Object.values(d).flat().join(' ') : '') || t('error')
    setError(String(msg))
    setTimeout(() => setError(''), 6000)
  }

  const tabs: { key: Tab; label: string; icon: typeof Clock }[] = [
    { key: 'campaign', label: t('admCampaign'), icon: Settings2 },
    { key: 'windows', label: t('admWindows'), icon: Clock },
    { key: 'rules', label: t('admRules'), icon: MapPin },
    { key: 'order', label: t('admOrder'), icon: ListOrdered },
    { key: 'bookings', label: t('admBookings'), icon: BookmarkCheck },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admissionTitle')}</h1>
          <p className="text-text-muted text-sm">{t('admissionDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="text-sm">
            {campaigns.length === 0 && <option value="">{t('admNoCampaigns')}</option>}
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.academic_year}{c.is_active ? ` · ${t('admActive')}` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2">{error}</div>}

      <div className="flex gap-1 bg-dark-card border border-dark-border rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === tb.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-accent'}`}>
            <tb.icon size={15} /> {tb.label}
          </button>
        ))}
      </div>

      {tab === 'campaign' && (
        <CampaignTab campaigns={campaigns} campaign={campaign} canEdit={canEdit} onChanged={loadCampaigns} onSelect={setCampaignId} onError={showError} />
      )}
      {tab === 'windows' && campaign && (
        <WindowsTab campaign={campaign} faculties={faculties} canEdit={canEdit} onError={showError} />
      )}
      {tab === 'rules' && campaign && (
        <RulesTab campaign={campaign} buildings={buildings} floors={floors} rooms={rooms} faculties={faculties} canEdit={canEdit} onError={showError} />
      )}
      {tab === 'order' && campaign && (
        <OrderTab campaign={campaign} buildings={buildings} floors={floors} canEdit={canEdit} onError={showError} onCampaignChanged={loadCampaigns} />
      )}
      {tab === 'bookings' && campaign && (
        <BookingsTab campaign={campaign} canBook={canBook} onError={showError} />
      )}
      {tab !== 'campaign' && !campaign && (
        <div className="text-text-muted text-sm py-8 text-center">{t('admCreateFirst')}</div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- criteria editor */

function CriteriaFields({ courses, faculties, foreignPolicy, allFaculties, onChange }: {
  courses: number[]; faculties: string[]; foreignPolicy: string; allFaculties: string[]
  onChange: (v: { courses: number[]; faculties: string[]; foreign_policy: string }) => void
}) {
  const { t } = useTranslation()
  const toggleCourse = (c: number) => onChange({
    courses: courses.includes(c) ? courses.filter((x) => x !== c) : [...courses, c].sort(),
    faculties, foreign_policy: foreignPolicy,
  })
  const toggleFaculty = (f: string) => onChange({
    courses, faculties: faculties.includes(f) ? faculties.filter((x) => x !== f) : [...faculties, f], foreign_policy: foreignPolicy,
  })
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-text-muted uppercase mb-1">{t('course')} <span className="normal-case">({t('admEmptyAny')})</span></div>
        <div className="flex gap-1">
          {COURSES.map((c) => (
            <button key={c} type="button" onClick={() => toggleCourse(c)}
              className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${courses.includes(c) ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}>{c}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-text-muted uppercase mb-1">{t('faculty')} <span className="normal-case">({t('admEmptyAny')})</span></div>
        <div className="flex flex-wrap gap-1">
          {allFaculties.length === 0 && <span className="text-xs text-text-muted">{t('noData')}</span>}
          {allFaculties.map((f) => (
            <button key={f} type="button" onClick={() => toggleFaculty(f)}
              className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${faculties.includes(f) ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}>{f}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-text-muted uppercase mb-1">{t('admForeign')}</div>
        <select value={foreignPolicy} onChange={(e) => onChange({ courses, faculties, foreign_policy: e.target.value })} className="text-sm">
          <option value="any">{t('admForeignAny')}</option>
          <option value="only_foreign">{t('admForeignOnly')}</option>
          <option value="only_local">{t('admLocalOnly')}</option>
        </select>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- campaign */

function CampaignTab({ campaigns, campaign, canEdit, onChanged, onSelect, onError }: {
  campaigns: Campaign[]; campaign: Campaign | null; canEdit: boolean
  onChanged: () => Promise<void>; onSelect: (id: string) => void; onError: (e: any) => void
}) {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  const [form, setForm] = useState({ name: `${t('admissionTitle')} ${year}/${year + 1}`, academic_year: `${year}/${year + 1}`, start_date: `${year}-09-01`, end_date: `${year + 1}-06-30` })
  const [creating, setCreating] = useState(false)
  const [settings, setSettings] = useState<Partial<Campaign>>({})

  useEffect(() => { if (campaign) setSettings({ enforce: campaign.enforce, buildings_sequential: campaign.buildings_sequential, floors_sequential: campaign.floors_sequential, hold_hours: campaign.hold_hours, start_date: campaign.start_date, end_date: campaign.end_date }) }, [campaign?.id])

  const create = async () => {
    setCreating(true)
    try {
      const r = await admissionApi.campaigns.create(form)
      await onChanged(); onSelect(r.data.id)
    } catch (e) { onError(e) } finally { setCreating(false) }
  }
  const saveSettings = async () => {
    if (!campaign) return
    try { await admissionApi.campaigns.update(campaign.id, settings); await onChanged() } catch (e) { onError(e) }
  }
  const activate = async (id: string) => {
    try { await admissionApi.campaigns.activate(id); await onChanged() } catch (e) { onError(e) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-dark-card border border-dark-border rounded-xl p-5">
        <h2 className="font-semibold mb-4">{t('admCampaigns')}</h2>
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className={`flex items-center justify-between rounded-lg border p-3 ${c.id === campaign?.id ? 'border-accent' : 'border-dark-border'}`}>
              <button onClick={() => onSelect(c.id)} className="text-left flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-text-muted">{c.academic_year} · {formatDate(c.start_date)} — {formatDate(c.end_date)} · {t('admWindows')}: {c.windows_count} · {t('admRules')}: {c.rules_count}</div>
              </button>
              {c.is_active ? (
                <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={14} /> {t('admActive')}</span>
              ) : canEdit && (
                <button onClick={() => activate(c.id)} className="text-xs text-accent hover:underline">{t('admActivate')}</button>
              )}
            </div>
          ))}
          {campaigns.length === 0 && <div className="text-text-muted text-sm">{t('admNoCampaigns')}</div>}
        </div>

        {canEdit && (
          <div className="mt-5 pt-5 border-t border-dark-border space-y-3">
            <h3 className="text-sm font-semibold">{t('admNewCampaign')}</h3>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('universityName')} className="w-full" />
            <div className="grid grid-cols-3 gap-2">
              <input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="2026/2027" />
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <button onClick={create} disabled={creating || !form.name}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <Plus size={16} /> {t('create')}
            </button>
          </div>
        )}
      </div>

      {campaign && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-5">
          <h2 className="font-semibold mb-1">{campaign.name}</h2>
          <p className="text-xs text-text-muted mb-4">{t('admSettingsHint')}</p>
          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={!!settings.enforce} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, enforce: e.target.checked })} className="mt-1" />
              <span><b>{t('admEnforce')}</b><div className="text-xs text-text-muted">{t('admEnforceHint')}</div></span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={!!settings.buildings_sequential} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, buildings_sequential: e.target.checked })} className="mt-1" />
              <span><b>{t('admBuildingsSeq')}</b><div className="text-xs text-text-muted">{t('admBuildingsSeqHint')}</div></span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={!!settings.floors_sequential} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, floors_sequential: e.target.checked })} className="mt-1" />
              <span><b>{t('admFloorsSeq')}</b><div className="text-xs text-text-muted">{t('admFloorsSeqHint')}</div></span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-text-muted uppercase mb-1">{t('admHoldHours')}</div>
                <input type="number" min={1} value={settings.hold_hours ?? 24} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, hold_hours: Number(e.target.value) })} className="w-full" />
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase mb-1">{t('startDate')}</div>
                <input type="date" value={settings.start_date || ''} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, start_date: e.target.value })} className="w-full" />
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase mb-1">{t('endDate')}</div>
                <input type="date" value={settings.end_date || ''} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, end_date: e.target.value })} className="w-full" />
              </div>
            </div>
            {canEdit && (
              <button onClick={saveSettings} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium">{t('save')}</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- windows */

function WindowsTab({ campaign, faculties, canEdit, onError }: { campaign: Campaign; faculties: string[]; canEdit: boolean; onError: (e: any) => void }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<BookingWindow[]>([])
  const [form, setForm] = useState({ name: '', opens_at: `${campaign.start_date}T09:00`, closes_at: '', courses: [] as number[], faculties: [] as string[], foreign_policy: 'any' })
  const [saving, setSaving] = useState(false)

  const load = () => admissionApi.windows.list(campaign.id).then((r) => setItems(r.data.results)).catch(() => {})
  useEffect(() => { load() }, [campaign.id])

  const add = async () => {
    setSaving(true)
    try {
      await admissionApi.windows.create({
        campaign: campaign.id, name: form.name,
        opens_at: new Date(form.opens_at).toISOString(),
        closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
        courses: form.courses, faculties: form.faculties, foreign_policy: form.foreign_policy,
      })
      setForm({ ...form, name: '', courses: [], faculties: [], foreign_policy: 'any' })
      load()
    } catch (e) { onError(e) } finally { setSaving(false) }
  }
  const remove = async (id: string) => {
    if (!confirm(t('delete') + '?')) return
    try { await admissionApi.windows.delete(id); load() } catch (e) { onError(e) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-xl p-5">
        <h2 className="font-semibold mb-1">{t('admWindows')}</h2>
        <p className="text-xs text-text-muted mb-4">{t('admWindowsHint')}</p>
        <div className="space-y-2">
          {items.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-lg border border-dark-border p-3">
              <Clock size={16} className="text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{w.name || w.criteria_display}</div>
                <div className="text-xs text-text-muted">
                  {formatDateTime(w.opens_at)}{w.closes_at ? ` → ${formatDateTime(w.closes_at)}` : ` → ${t('admNoClose')}`} · {w.criteria_display}
                </div>
              </div>
              {canEdit && <button onClick={() => remove(w.id)} className="text-text-muted hover:text-red-400"><Trash2 size={15} /></button>}
            </div>
          ))}
          {items.length === 0 && <div className="text-text-muted text-sm">{t('admNoWindows')}</div>}
        </div>
      </div>
      {canEdit && (
        <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">{t('admAddWindow')}</h3>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('admWindowName')} className="w-full" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-text-muted uppercase mb-1">{t('admOpensAt')}</div>
              <input type="datetime-local" value={form.opens_at} onChange={(e) => setForm({ ...form, opens_at: e.target.value })} className="w-full" />
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase mb-1">{t('admClosesAt')}</div>
              <input type="datetime-local" value={form.closes_at} onChange={(e) => setForm({ ...form, closes_at: e.target.value })} className="w-full" />
            </div>
          </div>
          <CriteriaFields courses={form.courses} faculties={form.faculties} foreignPolicy={form.foreign_policy} allFaculties={faculties}
            onChange={(v) => setForm({ ...form, ...v })} />
          <button onClick={add} disabled={saving || !form.opens_at}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> {t('admAddWindow')}
          </button>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- rules */

function RulesTab({ campaign, buildings, floors, rooms, faculties, canEdit, onError }: {
  campaign: Campaign; buildings: Building[]; floors: Floor[]; rooms: Room[]; faculties: string[]; canEdit: boolean; onError: (e: any) => void
}) {
  const { t } = useTranslation()
  const [items, setItems] = useState<PlacementRule[]>([])
  const [level, setLevel] = useState<'building' | 'floor' | 'room'>('floor')
  const [buildingId, setBuildingId] = useState('')
  const [floorId, setFloorId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [crit, setCrit] = useState({ courses: [] as number[], faculties: [] as string[], foreign_policy: 'any' })
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => admissionApi.rules.list(campaign.id).then((r) => setItems(r.data.results)).catch(() => {})
  useEffect(() => { load() }, [campaign.id])
  useEffect(() => { if (!buildingId && buildings[0]) setBuildingId(buildings[0].id) }, [buildings])

  const bFloors = useMemo(() => floors.filter((f) => f.building === buildingId).sort((a, b) => a.number - b.number), [floors, buildingId])
  const fRooms = useMemo(() => rooms.filter((r) => r.floor === floorId), [rooms, floorId])

  const add = async () => {
    setSaving(true)
    try {
      await admissionApi.rules.create({
        campaign: campaign.id,
        building: level === 'building' ? buildingId : null,
        floor: level === 'floor' ? floorId : null,
        room: level === 'room' ? roomId : null,
        ...crit, note,
      })
      setCrit({ courses: [], faculties: [], foreign_policy: 'any' }); setNote('')
      load()
    } catch (e) { onError(e) } finally { setSaving(false) }
  }
  const remove = async (id: string) => {
    if (!confirm(t('delete') + '?')) return
    try { await admissionApi.rules.delete(id); load() } catch (e) { onError(e) }
  }

  const scopeValid = level === 'building' ? !!buildingId : level === 'floor' ? !!floorId : !!roomId
  const critValid = crit.courses.length > 0 || crit.faculties.length > 0 || crit.foreign_policy !== 'any'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-xl p-5">
        <h2 className="font-semibold mb-1">{t('admRules')}</h2>
        <p className="text-xs text-text-muted mb-4">{t('admRulesHint')}</p>
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-dark-border p-3">
              <MapPin size={16} className="text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{r.scope_display}</div>
                <div className="text-xs text-text-muted">{t('admOnlyFor')}: {r.criteria_display}{r.note ? ` · ${r.note}` : ''}</div>
              </div>
              {canEdit && <button onClick={() => remove(r.id)} className="text-text-muted hover:text-red-400"><Trash2 size={15} /></button>}
            </div>
          ))}
          {items.length === 0 && <div className="text-text-muted text-sm">{t('admNoRules')}</div>}
        </div>
      </div>
      {canEdit && (
        <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">{t('admAddRule')}</h3>
          <div className="flex gap-1">
            {(['building', 'floor', 'room'] as const).map((l) => (
              <button key={l} onClick={() => setLevel(l)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${level === l ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}>
                {l === 'building' ? t('building') : l === 'floor' ? t('floor') : t('room')}
              </button>
            ))}
          </div>
          <select value={buildingId} onChange={(e) => { setBuildingId(e.target.value); setFloorId(''); setRoomId('') }} className="w-full text-sm">
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {level !== 'building' && (
            <select value={floorId} onChange={(e) => { setFloorId(e.target.value); setRoomId('') }} className="w-full text-sm">
              <option value="">{t('floor')}...</option>
              {bFloors.map((f) => <option key={f.id} value={f.id}>{f.number} {t('floorLabel')}</option>)}
            </select>
          )}
          {level === 'room' && (
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full text-sm">
              <option value="">{t('room')}...</option>
              {fRooms.map((r) => <option key={r.id} value={r.id}>{r.room_number}</option>)}
            </select>
          )}
          <CriteriaFields courses={crit.courses} faculties={crit.faculties} foreignPolicy={crit.foreign_policy} allFaculties={faculties} onChange={setCrit} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('comment')} className="w-full" />
          <button onClick={add} disabled={saving || !scopeValid || !critValid}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> {t('admAddRule')}
          </button>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- fill order */

function OrderTab({ campaign, buildings, floors, canEdit, onError, onCampaignChanged }: {
  campaign: Campaign; buildings: Building[]; floors: Floor[]; canEdit: boolean; onError: (e: any) => void; onCampaignChanged: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [items, setItems] = useState<BuildingOrder[]>([])
  const [buildingId, setBuildingId] = useState('')
  const [direction, setDirection] = useState<'asc' | 'desc' | 'custom'>('asc')
  const [customOrder, setCustomOrder] = useState('')

  const load = () => admissionApi.buildingOrder.list(campaign.id).then((r) => setItems(r.data.results)).catch(() => {})
  useEffect(() => { load() }, [campaign.id])

  const unlisted = buildings.filter((b) => !items.some((i) => i.building === b.id))
  useEffect(() => { if (!unlisted.some((b) => b.id === buildingId)) setBuildingId(unlisted[0]?.id || '') }, [items, buildings])

  const add = async () => {
    try {
      await admissionApi.buildingOrder.create({
        campaign: campaign.id, building: buildingId, priority: items.length + 1,
        floor_direction: direction,
        floor_order: direction === 'custom' ? customOrder.split(/[\s,]+/).filter(Boolean).map(Number) : [],
      })
      load()
    } catch (e) { onError(e) }
  }
  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...items]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    try {
      await Promise.all(next.map((it, i) => admissionApi.buildingOrder.update(it.id, { priority: i + 1 })))
      load()
    } catch (e) { onError(e) }
  }
  const remove = async (id: string) => {
    try { await admissionApi.buildingOrder.delete(id); load() } catch (e) { onError(e) }
  }
  const toggle = async (field: 'buildings_sequential' | 'floors_sequential', value: boolean) => {
    try { await admissionApi.campaigns.update(campaign.id, { [field]: value }); await onCampaignChanged() } catch (e) { onError(e) }
  }
  const floorsOf = (bId: string) => floors.filter((f) => f.building === bId).map((f) => f.number).sort((a, b) => a - b)
  const dirLabel = (o: BuildingOrder) => o.floor_direction === 'desc' ? t('admFloorsDesc') : o.floor_direction === 'custom' ? `${t('admFloorsCustom')}: ${o.floor_order.join(' → ')}` : t('admFloorsAsc')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-xl p-5">
        <h2 className="font-semibold mb-1">{t('admOrder')}</h2>
        <p className="text-xs text-text-muted mb-4">{t('admOrderHint')}</p>
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={campaign.buildings_sequential} disabled={!canEdit} onChange={(e) => toggle('buildings_sequential', e.target.checked)} /> {t('admBuildingsSeq')}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={campaign.floors_sequential} disabled={!canEdit} onChange={(e) => toggle('floors_sequential', e.target.checked)} /> {t('admFloorsSeq')}</label>
        </div>
        <div className="space-y-2">
          {items.map((o, idx) => (
            <div key={o.id} className="flex items-center gap-3 rounded-lg border border-dark-border p-3">
              <span className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">{o.priority}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{o.building_name}</div>
                <div className="text-xs text-text-muted">{t('admFloorOrder')}: {dirLabel(o)} · {t('floors')}: {floorsOf(o.building).join(', ') || '—'}</div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button onClick={() => move(idx, -1)} className="text-text-muted hover:text-accent px-1">↑</button>
                  <button onClick={() => move(idx, 1)} className="text-text-muted hover:text-accent px-1">↓</button>
                  <button onClick={() => remove(o.id)} className="text-text-muted hover:text-red-400 ml-1"><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <div className="text-text-muted text-sm">{t('admNoOrder')}</div>}
        </div>
      </div>
      {canEdit && unlisted.length > 0 && (
        <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">{t('admAddBuilding')}</h3>
          <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className="w-full text-sm">
            {unlisted.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div>
            <div className="text-xs text-text-muted uppercase mb-1">{t('admFloorOrder')}</div>
            <select value={direction} onChange={(e) => setDirection(e.target.value as any)} className="w-full text-sm">
              <option value="asc">{t('admFloorsAsc')}</option>
              <option value="desc">{t('admFloorsDesc')}</option>
              <option value="custom">{t('admFloorsCustom')}</option>
            </select>
          </div>
          {direction === 'custom' && (
            <input value={customOrder} onChange={(e) => setCustomOrder(e.target.value)} placeholder={`4, 3, 2, 1 (${t('floors').toLowerCase()}: ${floorsOf(buildingId).join(', ')})`} className="w-full" />
          )}
          <button onClick={add} disabled={!buildingId}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> {t('admAddBuilding')}
          </button>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- bookings */

function BookingsTab({ campaign, canBook, onError }: { campaign: Campaign; canBook: boolean; onError: (e: any) => void }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<Booking[]>([])
  const [status, setStatus] = useState('reserved')

  const load = () => admissionApi.bookings.list({ campaign: campaign.id, ...(status ? { status } : {}), page_size: '100' }).then((r) => setItems(r.data.results)).catch(() => {})
  useEffect(() => { load() }, [campaign.id, status])

  const confirm = async (id: string) => {
    if (!window.confirm(t('admConfirmBooking') + '?')) return
    try { await admissionApi.bookings.confirm(id); load() } catch (e) { onError(e) }
  }
  const cancel = async (id: string) => {
    if (!window.confirm(t('admCancelBooking') + '?')) return
    try { await admissionApi.bookings.cancel(id); load() } catch (e) { onError(e) }
  }
  const statusLabel: Record<string, string> = { reserved: t('admStReserved'), confirmed: t('admStConfirmed'), expired: t('admStExpired'), cancelled: t('admStCancelled') }
  const statusColor: Record<string, string> = { reserved: 'text-yellow-400', confirmed: 'text-green-400', expired: 'text-gray-400', cancelled: 'text-red-400' }

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-dark-border">
        <div>
          <h2 className="font-semibold">{t('admBookings')}</h2>
          <p className="text-xs text-text-muted">{t('admBookingsHint')}</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm">
          <option value="">{t('all')}</option>
          {Object.keys(statusLabel).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-text-muted text-xs uppercase border-b border-dark-border">
              <th className="text-left py-3 px-4">{t('resident')}</th>
              <th className="text-left py-3 px-4">{t('room')}</th>
              <th className="text-left py-3 px-4">{t('status')}</th>
              <th className="text-left py-3 px-4">{t('admExpires')}</th>
              <th className="text-left py-3 px-4">{t('acceptedBy')}</th>
              {canBook && <th className="py-3 px-4" />}
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b border-dark-border/50">
                <td className="py-3 px-4 font-medium">{b.resident_name}</td>
                <td className="py-3 px-4 text-text-secondary">{b.building_name}, {b.floor_number} {t('floorLabel')}, {b.room_number}</td>
                <td className={`py-3 px-4 text-sm ${statusColor[b.status]}`}>{statusLabel[b.status] || b.status}{b.override_reason && <span className="text-xs text-text-muted block">{t('admOverride')}: {b.override_reason}</span>}</td>
                <td className="py-3 px-4 text-text-secondary text-sm">{formatDateTime(b.expires_at)}</td>
                <td className="py-3 px-4 text-text-secondary text-sm">{b.created_by_name || '—'}</td>
                {canBook && (
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {b.status === 'reserved' && (
                      <>
                        <button onClick={() => confirm(b.id)} className="text-xs text-green-400 hover:underline mr-3">{t('admConfirmBooking')}</button>
                        <button onClick={() => cancel(b.id)} className="text-xs text-red-400 hover:underline">{t('cancel')}</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-text-muted">{t('noData')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
