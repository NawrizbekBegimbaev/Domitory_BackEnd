import { useEffect, useRef, useState } from 'react'
import { X, Shield, Users, Wallet, Eye, EyeOff, Camera, Check, Send } from 'lucide-react'
import { usersApi, authApi } from '../api/endpoints'
import api from '../api/client'
import { useTranslation } from '../i18n'

interface Props {
  onClose: () => void
  onCreated: () => void
}

interface RoleData {
  id: number
  name: string
}

const roleConfig = [
  { name: 'university_admin', icon: Shield },
  { name: 'dorm_manager', icon: Users },
  { name: 'accountant', icon: Wallet },
  { name: 'security_staff', icon: Eye },
]

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

function phoneToRaw(f: string) { return '+' + f.replace(/\D/g, '') }

export default function AddUserModal({ onClose, onCreated }: Props) {
  const { t } = useTranslation()
  const photoRef = useRef<HTMLInputElement>(null)
  const [roles, setRoles] = useState<RoleData[]>([])
  const [selectedRole, setSelectedRole] = useState<number | null>(null)
  const [step, setStep] = useState(1) // 1=email, 2=phone, 3=details

  // Step 1 — Email
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  // Step 2 — Phone
  const [phoneDisplay, setPhoneDisplay] = useState('+998')
  const [phoneCode, setPhoneCode] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneSending, setPhoneSending] = useState(false)
  const [phoneSkipped, setPhoneSkipped] = useState(false)

  // Step 3 — Details
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const roleLabels: Record<string, string> = {
    platform_admin: t('rolePlatformAdmin'),
    university_admin: t('roleUniversityAdmin'),
    dorm_manager: t('roleDormManager'),
    accountant: t('roleAccountant'),
    security_staff: t('roleSecurityStaff'),
  }

  useEffect(() => {
    api.get('/roles/').then((r) => {
      const allRoles: RoleData[] = r.data
      const assignable = allRoles.filter(r => roleConfig.some(rc => rc.name === r.name))
      setRoles(assignable)
      if (assignable.length > 0) setSelectedRole(assignable[0].id)
    }).catch(() => {})
  }, [])

  // Send email OTP
  const handleEmailSend = async () => {
    if (!email) return
    setEmailSending(true); setError('')
    try {
      await authApi.verifyEmailSend(email)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('error'))
    } finally { setEmailSending(false) }
  }

  // Verify email OTP
  const handleEmailVerify = async () => {
    if (emailCode.length !== 6) return
    setLoading(true); setError('')
    try {
      await authApi.verifyEmailConfirm(emailCode)
      setEmailVerified(true)
      setStep(2)
    } catch {
      setError(t('invalidCode'))
    } finally { setLoading(false) }
  }

  // Send phone OTP
  const handlePhoneSend = async () => {
    const phone = phoneToRaw(phoneDisplay)
    if (phone.length < 13) return
    setPhoneSending(true); setError('')
    try {
      await authApi.verifyPhoneSend(phone)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('error'))
    } finally { setPhoneSending(false) }
  }

  // Verify phone OTP
  const handlePhoneVerify = async () => {
    if (phoneCode.length !== 6) return
    setLoading(true); setError('')
    try {
      await authApi.verifyPhoneConfirm(phoneCode)
      setPhoneVerified(true)
      setStep(3)
    } catch {
      setError(t('invalidCode'))
    } finally { setLoading(false) }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)) }
  }

  // Create user
  const handleCreate = async () => {
    const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ')
    if (!fullName || !email || password.length < 8 || !selectedRole) return
    setLoading(true); setError('')
    try {
      const phone = phoneSkipped ? '' : phoneToRaw(phoneDisplay)
      if (photo) {
        const formData = new FormData()
        formData.append('full_name', fullName)
        formData.append('email', email)
        formData.append('password', password)
        formData.append('role', String(selectedRole))
        if (phone.length >= 13) formData.append('phone_number', phone)
        formData.append('photo', photo)
        await api.post('/users/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        await usersApi.create({
          full_name: fullName,
          email,
          password,
          role: selectedRole,
          ...(phone.length >= 13 ? { phone_number: phone } : {}),
        })
      }
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('error'))
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t('addUser')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step > s ? 'bg-green-500 text-white' : step === s ? 'bg-accent text-white' : 'bg-dark-border text-text-muted'
              }`}>
                {step > s ? <Check size={14} /> : s}
              </div>
              <span className={`text-xs ${step === s ? 'text-accent' : 'text-text-muted'}`}>
                {s === 1 ? 'Email' : s === 2 ? t('phone') : t('personalData')}
              </span>
              {s < 3 && <div className="flex-1 h-px bg-dark-border" />}
            </div>
          ))}
        </div>

        {/* STEP 1 — Email verification */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Email *</label>
              <div className="flex gap-2">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="flex-1" disabled={emailVerified} />
                <button onClick={handleEmailSend} disabled={emailSending || !email || emailVerified}
                  className="px-3 py-2 rounded-lg border border-accent/30 text-accent text-sm hover:bg-accent/10 disabled:opacity-50 flex items-center gap-1">
                  <Send size={14} /> {emailSending ? '...' : t('sendCode')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('enterCode')}</label>
              <input type="text" value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" className="w-full text-center text-xl tracking-[0.4em] font-bold" maxLength={6} />
            </div>

            {error && <div className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2">{error}</div>}

            <button onClick={handleEmailVerify} disabled={loading || emailCode.length !== 6}
              className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50">
              {loading ? t('loading') : t('confirm')}
            </button>
          </div>
        )}

        {/* STEP 2 — Phone verification */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('phone')}</label>
              <div className="flex gap-2">
                <input value={phoneDisplay} onChange={(e) => setPhoneDisplay(formatPhone(e.target.value))}
                  placeholder="+998 XX XXX XX XX" className="flex-1" maxLength={17} disabled={phoneVerified} />
                <button onClick={handlePhoneSend} disabled={phoneSending || phoneToRaw(phoneDisplay).length < 13 || phoneVerified}
                  className="px-3 py-2 rounded-lg border border-accent/30 text-accent text-sm hover:bg-accent/10 disabled:opacity-50 flex items-center gap-1">
                  <Send size={14} /> {phoneSending ? '...' : t('sendCode')}
                </button>
              </div>
              <div className="text-xs text-text-muted mt-1">OTP через Telegram (@begimbaev_dormitory_bot)</div>
            </div>

            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('enterCode')}</label>
              <input type="text" value={phoneCode} onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" className="w-full text-center text-xl tracking-[0.4em] font-bold" maxLength={6} />
            </div>

            {error && <div className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2">{error}</div>}

            <button onClick={handlePhoneVerify} disabled={loading || phoneCode.length !== 6}
              className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50">
              {loading ? t('loading') : t('confirm')}
            </button>
            <button onClick={() => { setPhoneSkipped(true); setStep(3) }} className="w-full text-center text-sm text-text-muted hover:text-white">
              {t('skip')}
            </button>
          </div>
        )}

        {/* STEP 3 — Personal data + photo + role + password */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <input ref={photoRef} type="file" accept=".jpg,.jpeg,.png" onChange={handlePhotoChange} className="hidden" />
              <div onClick={() => photoRef.current?.click()}
                className="cursor-pointer overflow-hidden" style={{ width: 56, height: 56, minWidth: 56, borderRadius: '50%' }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: '50%' }} className="bg-dark-border text-text-muted flex items-center justify-center">
                    <Camera size={20} />
                  </div>
                )}
              </div>
              <button onClick={() => photoRef.current?.click()} className="text-sm text-accent hover:underline">
                {t('uploadPhoto')}
              </button>
            </div>

            {/* Name */}
            <div className="grid grid-cols-3 gap-3">
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

            {/* Password */}
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">{t('password')} * ({t('minChars')})</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full" style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && <div className="text-xs text-red-400 mt-1">{t('passwordTooShort')}</div>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs text-text-muted uppercase mb-2">{t('selectRole')}</label>
              <div className="grid grid-cols-4 gap-2">
                {roles.map((r) => {
                  const Icon = roleConfig.find(rc => rc.name === r.name)?.icon || Users
                  return (
                    <button key={r.id} onClick={() => setSelectedRole(r.id)}
                      className={`p-3 rounded-xl border text-center transition-colors ${selectedRole === r.id ? 'border-accent bg-accent/10' : 'border-dark-border hover:border-accent/30'}`}>
                      <Icon size={20} className={`mx-auto mb-1 ${selectedRole === r.id ? 'text-accent' : 'text-text-muted'}`} />
                      <div className="text-xs">{roleLabels[r.name] || r.name}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Verified info */}
            <div className="flex gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1"><Check size={12} className="text-green-400" /> {email}</span>
              {phoneVerified && <span className="flex items-center gap-1"><Check size={12} className="text-green-400" /> {phoneDisplay}</span>}
              {phoneSkipped && <span className="text-yellow-400">{t('phone')}: {t('skip')}</span>}
            </div>

            {error && <div className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2">{error}</div>}

            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-5 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
              <button onClick={handleCreate}
                disabled={loading || !lastName || !firstName || password.length < 8 || !selectedRole}
                className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50">
                {loading ? t('saving') : t('addUser')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
