import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'
import { facultiesApi } from '../api/endpoints'
import api from '../api/client'
import type { Resident, PaginatedResponse } from '../types'
import { getInitials } from '../utils/format'
import { useTranslation } from '../i18n'

interface Props {
  resident: Resident
  onClose: () => void
  onUpdated: () => void
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  let d = digits.startsWith('998') ? digits.slice(3) : digits
  d = d.slice(0, 9)
  let result = '+998'
  if (d.length > 0) result += ' ' + d.slice(0, 2)
  if (d.length > 2) result += ' ' + d.slice(2, 5)
  if (d.length > 5) result += ' ' + d.slice(5, 7)
  if (d.length > 7) result += ' ' + d.slice(7, 9)
  return result
}

function phoneToRaw(formatted: string): string {
  return '+' + formatted.replace(/\D/g, '')
}

export default function EditResidentModal({ resident, onClose, onUpdated }: Props) {
  const { t } = useTranslation()

  const tabKeys = ['tabPersonal', 'tabStudy', 'tabContacts'] as const
  const [tab, setTab] = useState<typeof tabKeys[number]>('tabPersonal')
  const [loading, setLoading] = useState(false)
  const [faculties, setFaculties] = useState<{ id: string; name: string }[]>([])
  const photoRef = useRef<HTMLInputElement>(null)

  // Photo
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(resident.photo || null)

  const nameParts = resident.full_name.split(' ')
  const [lastName, setLastName] = useState(nameParts[0] || '')
  const [firstName, setFirstName] = useState(nameParts[1] || '')
  const [middleName, setMiddleName] = useState(nameParts.slice(2).join(' ') || '')
  const [birthDate, setBirthDate] = useState(resident.birth_date || '')
  const [gender, setGender] = useState(resident.gender)

  const [universityId, setUniversityId] = useState(resident.university_id)
  const [faculty, setFaculty] = useState(resident.faculty)
  const [course, setCourse] = useState(resident.course || 1)

  const [phoneDisplay, setPhoneDisplay] = useState(resident.phone_number ? formatPhone(resident.phone_number) : '+998')
  const [email, setEmail] = useState(resident.email || '')
  const [notes, setNotes] = useState(resident.notes || '')

  useEffect(() => {
    facultiesApi.list().then((r) => setFaculties(r.data.results)).catch(() => {})
  }, [])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)) }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ')
      const phone = phoneToRaw(phoneDisplay)

      if (photo) {
        // Send as multipart to include photo
        const formData = new FormData()
        formData.append('full_name', fullName)
        formData.append('gender', gender)
        formData.append('university_id', universityId)
        formData.append('faculty', faculty)
        formData.append('course', String(course))
        formData.append('photo', photo)
        if (birthDate) formData.append('birth_date', birthDate)
        if (phone.length > 4) formData.append('phone_number', phone)
        if (email) formData.append('email', email)
        formData.append('notes', notes)
        await api.patch(`/residents/${resident.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await api.patch(`/residents/${resident.id}/`, {
          full_name: fullName,
          birth_date: birthDate || null,
          gender,
          university_id: universityId,
          faculty,
          course,
          phone_number: phone.length > 4 ? phone : '',
          email,
          notes,
        })
      }
      onUpdated()
      onClose()
    } catch {
      alert(t('errorSaving'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">{t('editResident')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-accent"><X size={20} /></button>
        </div>
        <div className="text-text-muted text-sm mb-4 uppercase">
          {resident.full_name} · {resident.university_id}
        </div>

        {/* Photo */}
        <div className="flex items-center gap-4 mb-6">
          <input ref={photoRef} type="file" accept=".jpg,.jpeg,.png" onChange={handlePhotoChange} className="hidden" />
          <div
            onClick={() => photoRef.current?.click()}
            className="cursor-pointer overflow-hidden"
            style={{ width: 64, height: 64, minWidth: 64, borderRadius: '50%' }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: '50%' }} className="bg-accent/20 text-accent flex items-center justify-center text-xl font-bold">
                {getInitials(resident.full_name)}
              </div>
            )}
          </div>
          <button type="button" onClick={() => photoRef.current?.click()} className="text-sm text-accent hover:underline flex items-center gap-1">
            <Camera size={14} /> {t('changePhoto')}
          </button>
        </div>

        <div className="flex gap-4 mb-6 border-b border-dark-border">
          {tabKeys.map((tk) => (
            <button key={tk} onClick={() => setTab(tk)}
              className={`pb-2 text-sm border-b-2 transition-colors ${tab === tk ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-accent'}`}
            >{t(tk)}</button>
          ))}
        </div>

        {tab === 'tabPersonal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('lastName')} *</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('firstName')} *</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('middleName')}</label>
                <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('birthDate')}</label>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">{t('gender')}</label>
                <div className="flex gap-3 mt-1">
                  {[{ v: 'male', l: t('male') }, { v: 'female', l: t('female') }].map((g) => (
                    <label key={g.v} className="flex items-center gap-2 cursor-pointer" onClick={() => setGender(g.v)}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${gender === g.v ? 'border-accent' : 'border-dark-border'}`}>
                        {gender === g.v && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                      </div>
                      <span className="text-sm">{g.l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'tabStudy' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('studentIdLabel')}</label>
              <input value={universityId} onChange={(e) => setUniversityId(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('faculty')}</label>
              <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className="w-full">
                <option value="">{t('selectFaculty')}</option>
                {faculties.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('course')}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((c) => (
                  <button key={c} onClick={() => setCourse(c)}
                    className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${course === c ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}
                  >{c}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'tabContacts' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('phone')}</label>
              <input value={phoneDisplay} onChange={(e) => setPhoneDisplay(formatPhone(e.target.value))} placeholder="+998 XX XXX XX XX" className="w-full" maxLength={17} />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('notes')}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full" />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
          <button onClick={handleSave} disabled={loading || !lastName || !firstName}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? t('saving') : t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  )
}
