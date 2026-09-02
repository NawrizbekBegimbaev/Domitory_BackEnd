import { useEffect, useState } from 'react'
import { accessEventsApi } from '../api/endpoints'
import type { AccessEvent, PaginatedResponse } from '../types'
import Pagination from '../components/Pagination'
import { formatDateTime } from '../utils/format'
import { useTranslation } from '../i18n'

const directionColors: Record<string, string> = {
  in: 'text-green-400 bg-green-400/10',
  out: 'text-orange-400 bg-orange-400/10',
}

export default function AccessPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<PaginatedResponse<AccessEvent>>({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [directionFilter, setDirectionFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const params: Record<string, string> = { page: String(page) }
    if (directionFilter) params.direction = directionFilter
    if (search) params.search = search
    accessEventsApi.list(params).then((r) => setData(r.data)).catch(() => {})
  }, [page, directionFilter, search])

  const totalPages = Math.ceil(data.count / 20)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('accessTitle')}</h1>
          <p className="text-text-muted text-sm">{t('accessDesc')}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder={t('search')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="text-sm px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-text-primary"
        />
        <select
          value={directionFilter}
          onChange={(e) => { setDirectionFilter(e.target.value); setPage(1) }}
          className="text-sm"
        >
          <option value="">{t('allDirections')}</option>
          <option value="in">{t('directionIn')}</option>
          <option value="out">{t('directionOut')}</option>
        </select>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border text-text-muted text-left">
              <th className="px-4 py-3 font-medium">{t('time')}</th>
              <th className="px-4 py-3 font-medium">{t('resident')}</th>
              <th className="px-4 py-3 font-medium">{t('direction')}</th>
              <th className="px-4 py-3 font-medium">{t('device')}</th>
              <th className="px-4 py-3 font-medium">{t('cardNumber')}</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((event) => (
              <tr key={event.id} className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors">
                <td className="px-4 py-3 text-text-secondary">{formatDateTime(event.timestamp)}</td>
                <td className="px-4 py-3">{event.resident_name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${directionColors[event.direction] || ''}`}>
                    {event.direction_display}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{event.device_name || '—'}</td>
                <td className="px-4 py-3 text-text-secondary">{event.card_number || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
