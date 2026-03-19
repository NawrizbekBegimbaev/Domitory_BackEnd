import { useState } from 'react'
import { Building2, Eye, EyeOff, LogIn, Globe, ArrowLeft, Mail, KeyRound, Check } from 'lucide-react'
import { useTranslation } from '../i18n'
import { authApi } from '../api/endpoints'

interface Props {
  onLogin: (email: string, password: string) => Promise<void>
}

type Mode = 'login' | 'phone' | 'phoneOtp' | 'request' | 'confirm' | 'success'

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

export default function LoginPage({ onLogin }: Props) {
  const { t, lang, setLang } = useTranslation()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Phone login
  const [phoneDisplay, setPhoneDisplay] = useState('+998')
  const [phoneOtp, setPhoneOtp] = useState('')

  // Reset flow
  const [resetEmail, setResetEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(email, password)
    } catch {
      setError(t('loginError'))
    } finally {
      setLoading(false)
    }
  }

  const handleRequestOtp = async () => {
    if (!resetEmail) return
    setLoading(true)
    setError('')
    try {
      await authApi.requestPasswordReset(resetEmail)
      setMode('confirm')
    } catch {
      setError(t('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReset = async () => {
    if (!otpCode || newPassword.length < 8) return
    setLoading(true)
    setError('')
    try {
      await authApi.confirmPasswordReset(resetEmail, otpCode, newPassword)
      setMode('success')
    } catch {
      setError(t('invalidCode'))
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneRequest = async () => {
    const phone = phoneToRaw(phoneDisplay)
    if (phone.length < 13) return
    setLoading(true)
    setError('')
    try {
      await authApi.phoneLoginRequest(phone)
      setMode('phoneOtp')
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || t('error')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneConfirm = async () => {
    if (phoneOtp.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const phone = phoneToRaw(phoneDisplay)
      const res = await authApi.phoneLoginConfirm(phone, phoneOtp)
      localStorage.setItem('access_token', res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      window.location.href = '/'
    } catch {
      setError(t('invalidCode'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-card border border-dark-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 size={28} className="text-accent" />
              <h1 className="text-2xl font-bold tracking-widest text-accent">DORMITORY</h1>
            </div>
            <p className="text-text-secondary text-sm">
              {mode === 'login' || mode === 'phone' || mode === 'phoneOtp' ? t('loginTitle') : t('resetPassword')}
            </p>
          </div>

          {/* Language switcher */}
          <div className="flex items-center justify-center gap-1 mb-6">
            <Globe size={14} className="text-text-muted" />
            {(['ru', 'uz', 'kk'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${lang === l ? 'bg-accent text-white' : 'text-text-muted hover:text-white'}`}
              >
                {l === 'ru' ? 'RU' : l === 'uz' ? 'UZ' : 'QQ'}
              </button>
            ))}
          </div>

          {/* LOGIN / PHONE — tab switcher */}
          {(mode === 'login' || mode === 'phone') && (
            <div className="flex gap-1 bg-dark-bg border border-dark-border rounded-lg p-1 mb-5">
              <button onClick={() => { setMode('login'); setError('') }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'login' ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'}`}>
                {t('loginByEmail')}
              </button>
              <button onClick={() => { setMode('phone'); setError('') }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'phone' ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'}`}>
                {t('loginByPhone')}
              </button>
            </div>
          )}

          {/* LOGIN BY EMAIL */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">{t('email')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@university.edu" className="w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('password')}</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full" style={{ paddingRight: '2.5rem' }} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <div className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2">{error}</div>}

              <button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {loading ? t('loginLoading') : <>{t('loginBtn')} <LogIn size={18} /></>}
              </button>

              <button type="button" onClick={() => { setMode('request'); setError(''); setResetEmail(email) }} className="w-full text-center text-sm text-accent hover:underline">
                {t('forgotPassword')}
              </button>
            </form>
          )}

          {/* LOGIN BY PHONE */}
          {mode === 'phone' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">{t('phone')}</label>
                <input value={phoneDisplay} onChange={(e) => setPhoneDisplay(formatPhone(e.target.value))} placeholder="+998 XX XXX XX XX" className="w-full" maxLength={17} />
              </div>

              {error && <div className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2">{error}</div>}

              <button onClick={handlePhoneRequest} disabled={loading || phoneToRaw(phoneDisplay).length < 13}
                className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50">
                {loading ? t('loading') : t('sendCode')}
              </button>
            </div>
          )}

          {/* PHONE OTP */}
          {mode === 'phoneOtp' && (
            <div className="space-y-5">
              <div className="text-center text-sm text-text-muted mb-2">{t('otpViaTelegram')}</div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('enterCode')}</label>
                <input type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" className="w-full text-center text-2xl tracking-[0.5em] font-bold" maxLength={6} />
              </div>

              {error && <div className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2">{error}</div>}

              <button onClick={handlePhoneConfirm} disabled={loading || phoneOtp.length !== 6}
                className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50">
                {loading ? t('loading') : t('loginBtn')}
              </button>
              <button onClick={() => { setMode('phone'); setError(''); setPhoneOtp('') }} className="w-full text-center text-sm text-text-muted hover:text-white flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> {t('back')}
              </button>
            </div>
          )}

          {/* REQUEST OTP */}
          {mode === 'request' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Mail size={40} className="text-accent" />
                <div>
                  <div className="font-medium">{t('resetPassword')}</div>
                  <div className="text-xs text-text-muted">{t('sendCode')}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('email')}</label>
                <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="example@university.edu" className="w-full" />
              </div>

              {error && <div className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2">{error}</div>}

              <button onClick={handleRequestOtp} disabled={loading || !resetEmail} className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50">
                {loading ? t('loading') : t('sendCode')}
              </button>
              <button onClick={() => { setMode('login'); setError('') }} className="w-full text-center text-sm text-text-muted hover:text-white flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> {t('backToLogin')}
              </button>
            </div>
          )}

          {/* CONFIRM OTP + NEW PASSWORD */}
          {mode === 'confirm' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <KeyRound size={40} className="text-accent" />
                <div>
                  <div className="font-medium">{t('enterCode')}</div>
                  <div className="text-xs text-text-muted">{t('codeSent')}: {resetEmail}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('enterCode')}</label>
                <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" className="w-full text-center text-2xl tracking-[0.5em] font-bold" maxLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('newPassword')} <span className="text-text-muted font-normal">({t('minChars')})</span></label>
                <div className="relative">
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="********" className="w-full" style={{ paddingRight: '2.5rem' }} />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword.length > 0 && newPassword.length < 8 && (
                  <div className="text-xs text-red-400 mt-1">{t('passwordTooShort')}</div>
                )}
              </div>

              {error && <div className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2">{error}</div>}

              <button onClick={handleConfirmReset} disabled={loading || otpCode.length !== 6 || newPassword.length < 8}
                className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50">
                {loading ? t('loading') : t('resetBtn')}
              </button>
              <button onClick={() => { setMode('login'); setError('') }} className="w-full text-center text-sm text-text-muted hover:text-white flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> {t('backToLogin')}
              </button>
            </div>
          )}

          {/* SUCCESS */}
          {mode === 'success' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto">
                <Check size={32} />
              </div>
              <div className="font-medium text-green-400">{t('passwordChanged')}</div>
              <button onClick={() => { setMode('login'); setError(''); setPassword('') }}
                className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-colors">
                {t('backToLogin')}
              </button>
            </div>
          )}

          {(mode === 'login' || mode === 'phone') && (
            <p className="text-center text-text-muted text-xs mt-6 uppercase tracking-wider">{t('staffOnly')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
