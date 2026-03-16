import { useState } from 'react'
import { X, Shield, Users, Wallet, Eye } from 'lucide-react'
import { usersApi } from '../api/endpoints'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const roles = [
  { value: 'university_admin', label: 'Администратор', desc: 'Полный доступ ко всем функциям', icon: Shield },
  { value: 'dorm_manager', label: 'Менеджер', desc: 'Управление командой и проектами', icon: Users },
  { value: 'accountant', label: 'Бухгалтер', desc: 'Финансовая отчетность и счета', icon: Wallet },
  { value: 'security_staff', label: 'Охранник', desc: 'Контроль доступа и логи входа', icon: Eye },
]

export default function AddUserModal({ onClose, onCreated }: Props) {
  const [selectedRole, setSelectedRole] = useState('university_admin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!fullName || !email) return
    setLoading(true)
    try {
      await usersApi.create({
        full_name: fullName,
        email,
        password: 'temppass123',
        role_name: selectedRole,
      })
      onCreated()
      onClose()
    } catch {
      alert('Ошибка создания пользователя')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users size={20} className="text-accent" /> Добавить сотрудника
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        {/* Role selection */}
        <div className="mb-6">
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-3">Выберите роль доступа</label>
          <div className="grid grid-cols-4 gap-3">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => setSelectedRole(r.value)}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  selectedRole === r.value
                    ? 'border-accent bg-accent/10'
                    : 'border-dark-border hover:border-accent/30'
                }`}
              >
                <r.icon size={24} className={selectedRole === r.value ? 'text-accent mb-2' : 'text-text-muted mb-2'} />
                <div className="font-medium text-sm">{r.label}</div>
                <div className="text-xs text-text-muted mt-1">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm mb-1">ФИО сотрудника</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иван Иванов" className="w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Электронная почта</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ivanov@company.ru" className="w-full" />
          </div>
        </div>

        <div className="text-xs text-text-muted mb-4">
          Сотрудник получит письмо со ссылкой для активации своего аккаунта.
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
          <button
            onClick={handleCreate}
            disabled={loading || !fullName || !email}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Выслать приглашение'}
          </button>
        </div>
      </div>
    </div>
  )
}
