import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Camera, Upload, FileText } from 'lucide-react'
import { residentsApi, facultiesApi } from '../api/endpoints'
import api from '../api/client'
import type { PaginatedResponse } from '../types'
import { useTranslation } from '../i18n'

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

function formatDocNumber(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const letters = clean.replace(/[^A-Z]/g, '').slice(0, 2)
  const digits = clean.replace(/[^0-9]/g, '').slice(0, 7)
  if (!letters && !digits) return ''
  if (!digits) return letters
  return letters + ' ' + digits
}

export default function NewResidentPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const photoRef = useRef<HTMLInputElement>(null)
  const docFileRef = useRef<HTMLInputElement>(null)

  const [faculties, setFaculties] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)

  const docTypes = [
    { value: 'id_card', label: t('docIdCard') },
    { value: 'passport', label: t('docPassport') },
    { value: 'drivers_license', label: t('docDrivers') },
  ]

  // Photo
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Personal
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [phoneDisplay, setPhoneDisplay] = useState('+998')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('male')
  const [birthDate, setBirthDate] = useState('')

  // University
  const [universityId, setUniversityId] = useState('')
  const [faculty, setFaculty] = useState('')
  const [course, setCourse] = useState(1)

  // Document
  const [docType, setDocType] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)

  // Guardian
  const [guardianName, setGuardianName] = useState('')
  const [guardianRelation, setGuardianRelation] = useState('')
  const [guardianPhoneDisplay, setGuardianPhoneDisplay] = useState('+998')

  useEffect(() => {
    facultiesApi.list().then((r) => setFaculties(r.data.results)).catch(() => {})
  }, [])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)) }
  }

  const handleSubmit = async () => {
    const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ')
    if (!lastName || !firstName || !universityId || !gender) return
    setLoading(true)
    try {
      const phone = phoneToRaw(phoneDisplay)

      // 1. Create resident (with photo via multipart if photo exists)
      const formData = new FormData()
      formData.append('full_name', fullName)
      formData.append('gender', gender)
      formData.append('university_id', universityId)
      formData.append('faculty', faculty)
      formData.append('course', String(course))
      if (phone.length > 4) formData.append('phone_number', phone)
      if (email) formData.append('email', email)
      if (birthDate) formData.append('birth_date', birthDate)
      if (photo) formData.append('photo', photo)

      const res = await api.post('/residents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const residentId = res.data.id

      // 2. Upload document if filled
      if (docType && docFile) {
        const docForm = new FormData()
        docForm.append('document_type', docType)
        docForm.append('document_number', docNumber)
        docForm.append('file', docFile)
        await residentsApi.uploadDocument(residentId, docForm)
      }

      // 3. Add guardian if filled
      const guardianPhone = phoneToRaw(guardianPhoneDisplay)
      if (guardianName && guardianRelation && guardianPhone.length > 4) {
        await residentsApi.addGuardian(residentId, {
          full_name: guardianName,
          relationship: guardianRelation,
          phone_number: guardianPhone,
          is_emergency_contact: true,
        })
      }

      navigate('/residents')
    } catch (err: any) {
      console.error('Create resident error:', err.response?.data || err)
      alert(t('error') + ': ' + JSON.stringify(err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('newResidentTitle')}</h1>
          <p className="text-text-muted text-sm">{t('newResidentDesc')}</p>
        </div>
        <button onClick={() => navigate('/residents')} className="text-text-muted hover:text-white"><X size={24} /></button>
      </div>

      {/* Photo */}
      <div className="flex flex-col items-center mb-8">
        <input ref={photoRef} type="file" accept=".jpg,.jpeg,.png" onChange={handlePhotoChange} className="hidden" />
        <div
          onClick={() => photoRef.current?.click()}
          className="w-24 h-24 rounded-full bg-dark-card2 border-2 border-dashed border-dark-border flex flex-col items-center justify-center text-text-muted cursor-pointer hover:border-accent/50 transition-colors overflow-hidden"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="" className="w-full h-full object-cover" />
          ) : (
            <>
              <Camera size={24} />
              <span className="text-[10px] mt-1 uppercase">{t('uploadPhoto')}</span>
            </>
          )}
        </div>
        <span className="text-[10px] text-text-muted mt-2">JPG, PNG до 5 МБ</span>
      </div>

      {/* Personal */}
      <section className="mb-8">
        <h3 className="font-semibold text-accent mb-4">{t('personalData')}</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
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
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('phone')}</label>
            <input value={phoneDisplay} onChange={(e) => setPhoneDisplay(formatPhone(e.target.value))} placeholder={t('phonePlaceholder')} className="w-full" maxLength={17} />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('emailField')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('birthDate')}</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-muted uppercase mb-2">{t('gender')}</label>
          <div className="flex gap-3">
            <button onClick={() => setGender('male')} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${gender === 'male' ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}>{t('male')}</button>
            <button onClick={() => setGender('female')} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${gender === 'female' ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}>{t('female')}</button>
          </div>
        </div>
      </section>

      {/* Document */}
      <section className="mb-8">
        <h3 className="font-semibold text-accent mb-4">{t('document')}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('docType')}</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full">
              <option value="">{t('selectDocType')}</option>
              {docTypes.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('docNumber')}</label>
            <input value={docNumber} onChange={(e) => setDocNumber(formatDocNumber(e.target.value))} placeholder="AB 1234567" className="w-full" maxLength={10} />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('docFile')}</label>
            <input ref={docFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="hidden" />
            <button
              onClick={() => docFileRef.current?.click()}
              className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg border border-dashed border-dark-border text-sm text-text-muted hover:border-accent/50 transition-colors overflow-hidden"
            >
              <FileText size={14} className="shrink-0" />
              <span className="truncate">{docFile ? docFile.name : t('selectFile')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* University */}
      <section className="mb-8">
        <h3 className="font-semibold text-accent mb-4">{t('university')}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('studentIdLabel')}</label>
            <input value={universityId} onChange={(e) => setUniversityId(e.target.value)} placeholder="N 000000" className="w-full" />
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
                <button key={c} onClick={() => setCourse(c)} className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${course === c ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}>{c}</button>
              ))}
              <button onClick={() => setCourse(5)} className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${course >= 5 ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}>4+</button>
            </div>
          </div>
        </div>
      </section>

      {/* Guardian */}
      <section className="mb-8">
        <h3 className="font-semibold text-accent mb-4">{t('guardian')}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('guardianName')}</label>
            <input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Иванов Иван Петрович" className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('guardianRelation')}</label>
            <select value={guardianRelation} onChange={(e) => setGuardianRelation(e.target.value)} className="w-full">
              <option value="">—</option>
              <option value="father">{t('relFather')}</option>
              <option value="mother">{t('relMother')}</option>
              <option value="sibling">{t('relSibling')}</option>
              <option value="uncle">{t('relUncle')}</option>
              <option value="aunt">{t('relAunt')}</option>
              <option value="other">{t('relOther')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('guardianPhone')}</label>
            <input value={guardianPhoneDisplay} onChange={(e) => setGuardianPhoneDisplay(formatPhone(e.target.value))} placeholder={t('phonePlaceholder')} className="w-full" maxLength={17} />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-border">
        <button onClick={() => navigate('/residents')} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
        <button onClick={handleSubmit} disabled={loading || !lastName || !firstName || !universityId}
          className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? t('saving') : t('saveResident')}
        </button>
      </div>
    </div>
  )
}
