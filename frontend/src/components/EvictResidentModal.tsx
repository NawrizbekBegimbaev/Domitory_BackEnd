import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { assignmentsApi } from '../api/endpoints'
import type { Resident, RoomAssignment } from '../types'
import { formatMoney, getInitials } from '../utils/format'
import { useTranslation } from '../i18n'

interface Props {
  resident: Resident
  assignment: RoomAssignment | null
  debt: string
  onClose: () => void
  onEvicted: () => void
}

export default function EvictResidentModal({ resident, assignment, debt, onClose, onEvicted }: Props) {
  const { t } = useTranslation()

  const evictionReasons = [
    { value: 'end_of_term', label: t('evictReasonEndOfTerm') },
    { value: 'violation', label: t('evictReasonViolation') },
    { value: 'voluntary', label: t('evictReasonVoluntary') },
    { value: 'graduation', label: t('evictReasonGraduation') },
    { value: 'other', label: t('evictReasonOther') },
  ]

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
      alert(t('errorEvicting'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-red-400">
            <AlertTriangle size={20} /> {t('evictResident')}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-accent"><X size={20} /></button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold">
            {getInitials(resident.full_name)}
          </div>
          <div>
            <div className="font-medium">{resident.full_name}</div>
            <div className="text-xs text-text-muted">
              {t('room')} {assignment?.room_number || assignment?.room || '—'}
            </div>
          </div>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-5 text-sm">
          <div className="font-medium mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs">!</span>
            {t('afterEviction')}
          </div>
          <ul className="space-y-1 text-text-secondary text-sm ml-7">
            <li>· {t('contractTerminated')}</li>
            <li>· {t('roomFreed')}</li>
            {parseFloat(debt) > 0 && (
              <li>· {t('debt')} <span className="text-accent">{formatMoney(debt)} UZS</span> {t('debtRemains')}</li>
            )}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('evictDate')} *</label>
              <input type="date" value={evictDate} onChange={(e) => setEvictDate(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('evictReason')} *</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full">
                {evictionReasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('comment')}</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('commentPlaceholder')} rows={3} className="w-full" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
          <button
            onClick={handleEvict}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? t('evicting') : t('evict')}
          </button>
        </div>
      </div>
    </div>
  )
}
