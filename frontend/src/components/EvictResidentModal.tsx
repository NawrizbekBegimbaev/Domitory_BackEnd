import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { assignmentsApi } from '../api/endpoints'
import type { Resident, RoomAssignment } from '../types'
import { formatMoney, getInitials } from '../utils/format'

interface Props {
  resident: Resident
  assignment: RoomAssignment | null
  debt: string
  onClose: () => void
  onEvicted: () => void
}

const evictionReasons = [
  { value: 'end_of_term', label: 'Окончание срока' },
  { value: 'violation', label: 'Нарушение правил' },
  { value: 'voluntary', label: 'По собственному желанию' },
  { value: 'graduation', label: 'Выпуск' },
  { value: 'other', label: 'Другое' },
]

export default function EvictResidentModal({ resident, assignment, debt, onClose, onEvicted }: Props) {
  const [evictDate, setEvictDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('end_of_term')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEvict = async () => {
    if (!assignment) return
    setLoading(true)
    try {
      await assignmentsApi.close(assignment.id)
      onEvicted()
      onClose()
    } catch {
      alert('Ошибка выселения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-red-400">
            <AlertTriangle size={20} /> Выселить жильца
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold">
            {getInitials(resident.full_name)}
          </div>
          <div>
            <div className="font-medium">{resident.full_name}</div>
            <div className="text-xs text-text-muted">
              Комната {assignment?.room_number || assignment?.room || '—'}
            </div>
          </div>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-5 text-sm">
          <div className="font-medium mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs">!</span>
            После выселения:
          </div>
          <ul className="space-y-1 text-text-secondary text-sm ml-7">
            <li>· Договор будет расторгнут</li>
            <li>· Комната освободит 1 место</li>
            {parseFloat(debt) > 0 && (
              <li>· Задолженность <span className="text-accent">{formatMoney(debt)} UZS</span> останется за жильцом</li>
            )}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Дата выселения *</label>
              <input type="date" value={evictDate} onChange={(e) => setEvictDate(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Причина выселения *</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full">
                {evictionReasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Комментарий</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Введите причину или детали..." rows={3} className="w-full" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
          <button
            onClick={handleEvict}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Выселение...' : 'Выселить'}
          </button>
        </div>
      </div>
    </div>
  )
}
