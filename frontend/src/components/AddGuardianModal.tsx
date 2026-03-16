import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../api/client'

interface Props {
  residentId: string
  residentName: string
  onClose: () => void
  onCreated: () => void
}

const relationships = [
  'Отец', 'Мать', 'Брат', 'Сестра', 'Дедушка', 'Бабушка', 'Дядя', 'Тётя', 'Опекун',
]

export default function AddGuardianModal({ residentId, residentName, onClose, onCreated }: Props) {
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!lastName || !firstName || !relationship || !phone) return
    setLoading(true)
    try {
      const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ')
      await api.post(`/residents/${residentId}/guardians/`, {
        full_name: fullName,
        relationship,
        phone_number: phone,
      })
      onCreated()
      onClose()
    } catch {
      alert('Ошибка добавления опекуна')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">Добавить опекуна</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="text-text-muted text-sm mb-6">для {residentName}</div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Фамилия *</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Имя *</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Отчество</label>
            <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="w-full" />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Степень родства *</label>
            <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="w-full">
              <option value="">Выберите степень родства</option>
              {relationships.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Телефон *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 __ ___ __ __" className="w-full" />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" className="w-full" />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">Адрес проживания</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Город, район, улица, дом..." rows={2} className="w-full" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
          <button
            onClick={handleCreate}
            disabled={loading || !lastName || !firstName || !relationship || !phone}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Добавление...' : 'Добавить опекуна'}
          </button>
        </div>
      </div>
    </div>
  )
}
