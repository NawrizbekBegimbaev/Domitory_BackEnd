import { useState } from 'react'
import { X } from 'lucide-react'
import { residentsApi } from '../api/endpoints'
import type { Resident } from '../types'

interface Props {
  resident: Resident
  onClose: () => void
  onUpdated: () => void
}

const tabs = ['Личные данные', 'Учёба', 'Контакты']

export default function EditResidentModal({ resident, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState('Личные данные')
  const [loading, setLoading] = useState(false)

  const nameParts = resident.full_name.split(' ')
  const [lastName, setLastName] = useState(nameParts[0] || '')
  const [firstName, setFirstName] = useState(nameParts[1] || '')
  const [middleName, setMiddleName] = useState(nameParts.slice(2).join(' ') || '')
  const [birthDate, setBirthDate] = useState(resident.birth_date || '')
  const [gender, setGender] = useState(resident.gender)

  const [universityId, setUniversityId] = useState(resident.university_id)
  const [faculty, setFaculty] = useState(resident.faculty)
  const [course, setCourse] = useState(resident.course || 1)

  const [phone, setPhone] = useState(resident.phone_number || '')
  const [email, setEmail] = useState(resident.email || '')
  const [notes, setNotes] = useState(resident.notes || '')

  const handleSave = async () => {
    setLoading(true)
    try {
      const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ')
      await residentsApi.update(resident.id, {
        full_name: fullName,
        birth_date: birthDate || null,
        gender,
        university_id: universityId,
        faculty,
        course,
        phone_number: phone,
        email,
        notes,
      })
      onUpdated()
      onClose()
    } catch {
      alert('Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">Редактировать жильца</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>
        <div className="text-text-muted text-sm mb-4 uppercase">
          {resident.full_name} · {resident.university_id}
        </div>

        <div className="flex gap-4 mb-6 border-b border-dark-border">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 text-sm border-b-2 transition-colors ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-white'}`}
            >{t}</button>
          ))}
        </div>

        {tab === 'Личные данные' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">Фамилия *</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">Имя *</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">Отчество</label>
                <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">Дата рождения</label>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase mb-1">Пол</label>
                <div className="flex gap-3 mt-1">
                  {[{ v: 'male', l: 'Мужской' }, { v: 'female', l: 'Женский' }].map((g) => (
                    <label key={g.v} className="flex items-center gap-2 cursor-pointer">
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

        {tab === 'Учёба' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Студенческий билет</label>
              <input value={universityId} onChange={(e) => setUniversityId(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Факультет</label>
              <input value={faculty} onChange={(e) => setFaculty(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Курс</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCourse(c)}
                    className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${course === c ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}
                  >{c}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'Контакты' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Телефон</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 __ ___ __ __" className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase mb-1">Заметки</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full" />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
          <button
            onClick={handleSave}
            disabled={loading || !lastName || !firstName}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  )
}
