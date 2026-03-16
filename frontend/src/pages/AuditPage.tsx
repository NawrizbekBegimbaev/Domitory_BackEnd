import { useEffect, useState } from 'react'
import { auditApi } from '../api/endpoints'
import type { AuditLog, PaginatedResponse } from '../types'
import Pagination from '../components/Pagination'
import { formatDateTime } from '../utils/format'

const actionLabels: Record<string, string> = {
  create: 'Создание',
  update: 'Обновление',
  delete: 'Удаление',
}

const actionColors: Record<string, string> = {
  create: 'text-green-400 bg-green-400/10',
  update: 'text-blue-400 bg-blue-400/10',
  delete: 'text-red-400 bg-red-400/10',
}

export default function AuditPage() {
  const [data, setData] = useState<PaginatedResponse<AuditLog>>({ count: 0, next: null, previous: null, results: [] })
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')

  useEffect(() => {
    const params: Record<string, string> = { page: String(page) }
    if (actionFilter) params.action = actionFilter
    if (modelFilter) params.model_name = modelFilter
    auditApi.list(params).then((r) => setData(r.data)).catch(() => {})
  }, [page, actionFilter, modelFilter])

  const totalPages = Math.ceil(data.count / 20)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Журнал аудита</h1>
          <p className="text-text-muted text-sm">Все действия сотрудников системы</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
          className="text-sm"
        >
          <option value="">Все действия</option>
          <option value="create">Создание</option>
          <option value="update">Обновление</option>
          <option value="delete">Удаление</option>
        </select>
        <select
          value={modelFilter}
          onChange={(e) => { setModelFilter(e.target.value); setPage(1) }}
          className="text-sm"
        >
          <option value="">Все модели</option>
          <option value="RoomAssignment">Назначение</option>
          <option value="Payment">Оплата</option>
          <option value="AccommodationContract">Договор</option>
          <option value="Resident">Жилец</option>
        </select>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
              <th className="text-left py-3 px-4">Время</th>
              <th className="text-left py-3 px-4">Пользователь</th>
              <th className="text-left py-3 px-4">Действие</th>
              <th className="text-left py-3 px-4">Модель</th>
              <th className="text-left py-3 px-4">Объект</th>
              <th className="text-left py-3 px-4">IP</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((log) => (
              <tr key={log.id} className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors">
                <td className="py-3 px-4 text-sm text-text-secondary">{formatDateTime(log.timestamp)}</td>
                <td className="py-3 px-4 text-sm">{log.user_name || log.user}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${actionColors[log.action] || ''}`}>
                    {actionLabels[log.action] || log.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-text-secondary">{log.model_name}</td>
                <td className="py-3 px-4 text-sm text-text-muted font-mono text-xs">{log.object_id.slice(0, 8)}...</td>
                <td className="py-3 px-4 text-sm text-text-muted">{log.ip_address || '—'}</td>
              </tr>
            ))}
            {data.results.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-text-muted">Нет записей</td></tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-dark-border flex items-center justify-between">
          <span className="text-sm text-text-muted">Записей: {data.count}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
