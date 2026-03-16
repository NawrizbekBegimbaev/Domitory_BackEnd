import { useState } from 'react'
import { Building2, Eye, EyeOff, LogIn } from 'lucide-react'

interface Props {
  onLogin: (email: string, password: string) => Promise<void>
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(email, password)
    } catch {
      setError('Неверный email или пароль')
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
            <p className="text-text-secondary text-sm">Система управления общежитием</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@university.edu"
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? 'Вход...' : (
                <>Войти <LogIn size={18} /></>
              )}
            </button>
          </form>

          <p className="text-center text-text-muted text-xs mt-6 uppercase tracking-wider">
            Только для сотрудников университета
          </p>
        </div>

        <p className="text-center text-text-muted text-xs mt-8">
          &copy; 2024 University Admin Portal
        </p>
      </div>
    </div>
  )
}
