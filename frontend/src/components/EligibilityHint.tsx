import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { admissionApi } from '../api/endpoints'
import type { Eligibility } from '../types'
import { useTranslation } from '../i18n'

interface Props {
  residentId?: string
  roomId?: string
  skipWindow?: boolean
  onChange?: (e: Eligibility | null) => void
}

/** Shows whether the admission rules allow this resident in this room, and why not. */
export default function EligibilityHint({ residentId, roomId, skipWindow, onChange }: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<Eligibility | null>(null)

  useEffect(() => {
    if (!residentId || !roomId) { setState(null); onChange?.(null); return }
    let cancelled = false
    admissionApi.eligibility(residentId, roomId, skipWindow)
      .then((r) => { if (!cancelled) { setState(r.data); onChange?.(r.data) } })
      .catch(() => { if (!cancelled) { setState(null); onChange?.(null) } })
    return () => { cancelled = true }
  }, [residentId, roomId, skipWindow])

  if (!state || !state.enforced) return null
  if (state.ok) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/5 border border-green-500/20 rounded-lg p-3">
        <ShieldCheck size={16} /> {t('eligibleOk')}
      </div>
    )
  }
  return (
    <div className="text-sm bg-red-500/5 border border-red-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 text-red-400 font-medium mb-1"><ShieldAlert size={16} /> {t('eligibleBlocked')}</div>
      <ul className="list-disc ml-6 text-text-secondary space-y-0.5">
        {state.reasons.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
      {state.can_override && <div className="text-xs text-text-muted mt-2">{t('overrideHint')}</div>}
    </div>
  )
}

/**
 * Ask the admin for an override reason when the server rejected an action
 * because of admission rules. Returns the reason or null (cancelled / not a rules error).
 */
export function askOverride(err: any, t: (k: any) => string): string | null {
  const msg: string = err?.response?.data?.error?.message || ''
  if (err?.response?.status !== 400 || !msg.includes('правилами')) return null
  const reason = window.prompt(`${msg}\n\n${t('overridePrompt')}`)
  return reason && reason.trim() ? reason.trim() : null
}
