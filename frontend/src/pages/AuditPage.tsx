import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { auditApi } from '../api/endpoints'
import type { AuditLog, PaginatedResponse } from '../types'
import Pagination from '../components/Pagination'
import { formatDateTime } from '../utils/format'
import { useTranslation } from '../i18n'

const actionColors: Record<string, string> = {
  create: 'text-green-400 bg-green-400/10',
  update: 'text-blue-400 bg-blue-400/10',
  delete: 'text-red-400 bg-red-400/10',
}

const changeKeyLabels: Record<string, string> = {
  full_name: 'ФИО',
  status: 'Статус',
  email: 'Email',
  phone_number: 'Телефон',
  room: 'Комната',
  resident: 'Жилец',
  amount: 'Сумма',
  method: 'Способ оплаты',
  action: 'Действие',
  from_room: 'Из комнаты',
  to_room: 'В комнату',
  old_price: 'Старая цена',
  new_price: 'Новая цена',
  type: 'Тип',
  university_id: 'Студ. ID',
  name: 'Название',
  contract_number: 'Номер договора',
}

export default function AuditPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<PaginatedResponse<AuditLog>>({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const actionLabels: Record<string, string> = {
    create: t('actionCreate'),
    update: t('actionUpdate'),
    delete: t('actionDelete'),
  }

  const modelLabels: Record<string, string> = {
    RoomAssignment: t('sectionAssignment'),
    AccommodationContract: t('sectionContract'),
    Payment: t('sectionPayment'),
    Resident: t('sectionResident'),
    Building: t('sectionBuilding'),
    Floor: t('sectionFloor'),
    Room: t('sectionRoom'),
    User: t('sectionUser'),
    Guardian: t('sectionGuardian'),
    ResidentDocument: t('sectionDocument'),
    Charge: t('sectionCharge'),
    StayRecord: t('sectionStay'),
  }

  useEffect(() => {
    const params: Record<string, string> = { page: String(page) }
    if (actionFilter) params.action = actionFilter
    if (modelFilter) params.model_name = modelFilter
    auditApi.list(params).then((r) => setData(r.data)).catch(() => {})
  }, [page, actionFilter, modelFilter])

  const totalPages = Math.ceil(data.count / 20)

  const renderChanges = (changes: Record<string, unknown>) => {
    const entries = Object.entries(changes)
    if (entries.length === 0) return <span className="text-text-muted text-xs">{t('noData')}</span>

    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => {
          const label = changeKeyLabels[key] || key
          if (typeof value === 'object' && value !== null && 'old' in (value as any) && 'new' in (value as any)) {
            const v = value as { old: string; new: string }
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="text-text-muted min-w-[120px]">{label}:</span>
                <span className="text-red-400 line-through">{v.old}</span>
                <span className="text-text-muted">→</span>
                <span className="text-green-400">{v.new}</span>
              </div>
            )
          }
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="text-text-muted min-w-[120px]">{label}:</span>
              <span className="text-white">{String(value)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('auditTitle')}</h1>
          <p className="text-text-muted text-sm">{t('auditDesc')}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1) }} className="text-sm">
          <option value="">{t('allActions')}</option>
          <option value="create">{t('actionCreate')}</option>
          <option value="update">{t('actionUpdate')}</option>
          <option value="delete">{t('actionDelete')}</option>
        </select>
        <select value={modelFilter} onChange={(e) => { setModelFilter(e.target.value); setPage(1) }} className="text-sm">
          <option value="">{t('allSections')}</option>
          <option value="Resident">{t('navResidents')}</option>
          <option value="RoomAssignment">{t('sectionAssignment')}</option>
          <option value="AccommodationContract">{t('navContracts')}</option>
          <option value="Payment">{t('sectionPayment')}</option>
          <option value="Room">{t('navRooms')}</option>
          <option value="Building">{t('navBuildings')}</option>
          <option value="User">{t('navUsers')}</option>
        </select>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl">
        {data.results.map((log) => (
          <div key={log.id} className="border-b border-dark-border/50">
            <div
              className="flex items-center px-4 py-3 hover:bg-dark-hover transition-colors cursor-pointer"
              onClick={() => setExpanded(expanded === log.id ? null : log.id)}
            >
              <div className="text-text-muted mr-2">
                {expanded === log.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
              <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                <span className="text-sm text-text-secondary">{formatDateTime(log.timestamp)}</span>
                <span className="text-sm">{log.user_name || '—'}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-md w-fit ${actionColors[log.action] || ''}`}>
                  {actionLabels[log.action] || log.action}
                </span>
                <span className="text-sm text-text-secondary">{modelLabels[log.model_name] || log.model_name}</span>
              </div>
            </div>
            {expanded === log.id && (
              <div className="px-10 pb-4">
                <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-text-muted">{t('section')}:</span>{' '}
                      <span className="font-medium">{modelLabels[log.model_name] || log.model_name}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">{t('action')}:</span>{' '}
                      <span className={`font-medium ${log.action === 'create' ? 'text-green-400' : log.action === 'delete' ? 'text-red-400' : 'text-blue-400'}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">{t('user')}:</span>{' '}
                      <span>{log.user_name || '—'}</span>
                      {log.user_email && <span className="text-text-muted ml-1">({log.user_email})</span>}
                    </div>
                    <div>
                      <span className="text-text-muted">{t('time')}:</span>{' '}
                      <span>{formatDateTime(log.timestamp)}</span>
                    </div>
                  </div>
                  <div className="border-t border-dark-border pt-3">
                    <div className="text-xs text-text-muted uppercase mb-2">{t('details')}</div>
                    {renderChanges(log.changes)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {data.results.length === 0 && (
          <div className="py-8 text-center text-text-muted">{t('noRecords')}</div>
        )}
        <div className="px-4 py-3 border-t border-dark-border flex items-center justify-between">
          <span className="text-sm text-text-muted">{t('records')}: {data.count}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
