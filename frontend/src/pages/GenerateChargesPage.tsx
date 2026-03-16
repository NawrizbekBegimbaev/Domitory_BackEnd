import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tariffsApi, chargesApi } from '../api/endpoints'
import type { TariffPlan, PaginatedResponse } from '../types'

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

export default function GenerateChargesPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [tariffs, setTariffs] = useState<TariffPlan[]>([])
  const [selectedTariff, setSelectedTariff] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    tariffsApi.list({ page_size: '100', is_active: 'true' }).then((r) => {
      const list = (r.data as PaginatedResponse<TariffPlan>).results
      setTariffs(list)
      if (list.length > 0) setSelectedTariff(list[0].id)
    }).catch(() => {})
  }, [])

  const selectedTariffObj = tariffs.find((t) => t.id === selectedTariff)

  const handleGenerate = async () => {
    if (!selectedTariff) return
    setLoading(true)
    try {
      const res = await chargesApi.generate({
        tariff_plan: selectedTariff,
        month,
        year,
      })
      setResult(res.data as { created: number; skipped: number })
      setStep(3)
    } catch {
      alert('Ошибка генерации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-text-muted text-sm mb-2">Финансы &gt; Генерация начислений</div>
      <h1 className="text-2xl font-bold mb-8">Генерация начислений</h1>

      {/* Steps */}
      <div className="flex items-center gap-0 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= s ? 'bg-accent text-white' : 'bg-dark-border text-text-muted'
            }`}>{s}</div>
            <div className="flex-1 mx-2">
              <div className={`h-1 rounded-full ${step > s ? 'bg-accent' : 'bg-dark-border'}`} />
            </div>
          </div>
        ))}
        <div className="text-sm text-text-muted ml-2">
          {step === 1 ? 'Параметры' : step === 2 ? 'Проверка' : 'Результат'}
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-6">Параметры генерации</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">Отчётный месяц</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full">
                {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Тарифный план</label>
              <select value={selectedTariff} onChange={(e) => setSelectedTariff(e.target.value)} className="w-full">
                {tariffs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm mb-1">Год</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full max-w-xs">
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => navigate('/finance')} className="px-6 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Отмена</button>
            <button onClick={() => setStep(2)} className="px-6 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium">Далее →</button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-6">Проверка</h2>
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
            <div className="text-sm text-text-secondary mb-1">Предварительный расчёт системы:</div>
            <div className="text-lg">
              Начисления за <span className="text-accent font-bold">{monthNames[month - 1]} {year}</span> по тарифу <span className="text-accent font-bold">{selectedTariffObj?.name}</span>
            </div>
            <div className="text-sm text-text-muted mt-1">
              Сумма: {selectedTariffObj?.amount} UZS за каждого активного жильца
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setStep(1)} className="px-6 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">Назад</button>
            <button onClick={handleGenerate} disabled={loading} className="px-6 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50">
              {loading ? 'Генерация...' : 'Сгенерировать'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && result && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
          <h2 className="text-lg font-semibold mb-2">Генерация завершена</h2>
          <div className="text-text-secondary mb-6">
            Создано начислений: <span className="text-accent font-bold">{result.created}</span><br />
            Пропущено (уже существуют): <span className="text-text-muted">{result.skipped}</span>
          </div>
          <button onClick={() => navigate('/finance')} className="px-6 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium">
            К финансам
          </button>
        </div>
      )}
    </div>
  )
}
