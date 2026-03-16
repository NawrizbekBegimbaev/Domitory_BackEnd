import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Camera } from 'lucide-react'
import { residentsApi, buildingsApi, roomsApi } from '../api/endpoints'
import type { Building, PaginatedResponse } from '../types'

export default function NewResidentPage() {
  const navigate = useNavigate()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(false)

  // Personal
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('male')
  const [birthDate, setBirthDate] = useState('')

  // University
  const [universityId, setUniversityId] = useState('')
  const [faculty, setFaculty] = useState('')
  const [course, setCourse] = useState(1)

  // Housing
  const [buildingId, setBuildingId] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [contractStart, setContractStart] = useState('')
  const [contractEnd, setContractEnd] = useState('')

  // Guardian
  const [guardianName, setGuardianName] = useState('')
  const [guardianRelation, setGuardianRelation] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')

  useEffect(() => {
    buildingsApi.list({ page_size: '100' }).then((r) => {
      setBuildings((r.data as PaginatedResponse<Building>).results)
    }).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!fullName || !universityId || !gender) return
    setLoading(true)
    try {
      const res = await residentsApi.create({
        full_name: fullName,
        phone_number: phone,
        email,
        gender,
        birth_date: birthDate || null,
        university_id: universityId,
        faculty,
        course,
      })
      navigate(`/residents/${res.data.id}`)
    } catch (err: any) {
      alert('Ошибка: ' + JSON.stringify(err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Добавить жильца</h1>
          <p className="text-text-muted text-sm">Заполните форму для регистрации нового резидента в системе</p>
        </div>
        <button onClick={() => navigate('/residents')} className="text-text-muted hover:text-white"><X size={24} /></button>
      </div>

      {/* Personal */}
      <section className="mb-8">
        <h3 className="font-semibold text-accent mb-4 flex items-center gap-2">
          <span className="text-lg">👤</span> Личные данные
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3">
            <label className="block text-sm mb-1">ФИО полностью</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" className="w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Телефон</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" className="w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Эл. почта</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Дата рождения</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm mb-2">Пол</label>
          <div className="flex gap-3">
            <button
              onClick={() => setGender('male')}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${gender === 'male' ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}
            >Мужской</button>
            <button
              onClick={() => setGender('female')}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${gender === 'female' ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'}`}
            >Женский</button>
          </div>
        </div>
      </section>

      {/* University */}
      <section className="mb-8">
        <h3 className="font-semibold text-accent mb-4 flex items-center gap-2">
          <span className="text-lg">🎓</span> Университет
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Студенческий билет</label>
            <input value={universityId} onChange={(e) => setUniversityId(e.target.value)} placeholder="№ 000000" className="w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Факультет</label>
            <input value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Выберите факультет" className="w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Курс</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((c) => (
                <button
                  key={c}
                  onClick={() => setCourse(c)}
                  className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                    course === c ? 'border-accent bg-accent/10 text-accent' : 'border-dark-border text-text-secondary'
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Guardian */}
      <section className="mb-8">
        <h3 className="font-semibold text-accent mb-4 flex items-center gap-2">
          <span className="text-lg">👪</span> Контактное лицо (Опекун)
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">ФИО опекуна</label>
            <input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Иванов Иван Петрович" className="w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Родство</label>
            <input value={guardianRelation} onChange={(e) => setGuardianRelation(e.target.value)} placeholder="Отец / Мать" className="w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Телефон опекуна</label>
            <input value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} placeholder="+7 (___) ___-__-__" className="w-full" />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-border">
        <button onClick={() => navigate('/residents')} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
        <button
          onClick={handleSubmit}
          disabled={loading || !fullName || !universityId}
          className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : 'Сохранить жильца'}
        </button>
      </div>
    </div>
  )
}
