import { useState } from 'react'
import { X } from 'lucide-react'
import { residentsApi } from '../api/endpoints'
import { useTranslation } from '../i18n'

interface Props {
  residentId: string
  residentName: string
  onClose: () => void
  onCreated: () => void
}

export default function AddGuardianModal({ residentId, residentName, onClose, onCreated }: Props) {
  const { t } = useTranslation()

  const relationships = [
    { value: 'father', label: t('relFather') },
    { value: 'mother', label: t('relMother') },
    { value: 'sibling', label: t('relSibling') },
    { value: 'uncle', label: t('relUncle') },
    { value: 'aunt', label: t('relAunt') },
    { value: 'other', label: t('relOther') },
  ]

  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [phone, setPhone] = useState('+998')
  const [secondPhone, setSecondPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!lastName || !firstName || !relationship || !phone) return
    setLoading(true)
    try {
      const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ')
      await residentsApi.addGuardian(residentId, {
        full_name: fullName,
        relationship,
        phone_number: phone,
        is_emergency_contact: true,
      })
      onCreated()
      onClose()
    } catch {
      alert(t('errorAddingGuardian'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">{t('addGuardianTitle')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="text-text-muted text-sm mb-6">{t('forResident')} {residentName}</div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('lastName')} *</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Иванов" className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('firstName')} *</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Иван" className="w-full" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('middleName')}</label>
            <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Иванович" className="w-full" />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('relationship')} *</label>
            <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="w-full">
              <option value="">{t('selectRelationship')}</option>
              {relationships.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('phone')} *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" className="w-full" />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('secondPhone')}</label>
            <input value={secondPhone} onChange={(e) => setSecondPhone(e.target.value)} placeholder="+998 __ ___ __ __" className="w-full" />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" className="w-full" />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('address')}</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Город, район, улица, дом..." rows={2} className="w-full" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
          <button
            onClick={handleCreate}
            disabled={loading || !lastName || !firstName || !relationship || !phone}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? t('adding') : t('addGuardianTitle')}
          </button>
        </div>
      </div>
    </div>
  )
}
