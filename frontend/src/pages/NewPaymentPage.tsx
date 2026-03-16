import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Banknote, Building2, CreditCard } from 'lucide-react'
import { residentsApi, paymentsApi } from '../api/endpoints'
import type { Resident, PaginatedResponse } from '../types'
import { formatMoney, getInitials } from '../utils/format'

export default function NewPaymentPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Resident[]>([])
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [balance, setBalance] = useState<{ debt: string } | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState<'cash' | 'bank_transfer'>('cash')
  const [loading, setLoading] = useState(false)

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    try {
      const res = await residentsApi.list({ search: q, status: 'active' })
      setSearchResults((res.data as PaginatedResponse<Resident>).results)
    } catch { setSearchResults([]) }
  }

  const selectResident = async (r: Resident) => {
    setSelectedResident(r)
    setSearchResults([])
    setSearchQuery('')
    try {
      const bal = await residentsApi.balance(r.id)
      setBalance(bal.data)
    } catch {}
  }

  const fillDebt = () => {
    if (balance) setAmount(balance.debt)
  }

  const handleSubmit = async () => {
    if (!selectedResident || !amount) return
    setLoading(true)
    try {
      await paymentsApi.create({
        resident: selectedResident.id,
        amount,
        payment_date: paymentDate,
        payment_method: method,
      })
      navigate('/finance')
    } catch {
      alert('Ошибка при создании оплаты')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-text-muted text-sm mb-2">Финансы / Оплаты / Новая оплата</div>
      <h1 className="text-2xl font-bold mb-6">Внести оплату</h1>

      {/* Resident search */}
      <section className="mb-6">
        <h3 className="font-semibold text-accent mb-3">* ЖИЛЕЦ</h3>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Начните вводить ФИО или ID студента..."
            className="w-full pl-9"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-dark-border rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectResident(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-hover text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                    {getInitials(r.full_name)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{r.full_name}</div>
                    <div className="text-xs text-text-muted">{r.university_id} · {r.faculty}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedResident && (
          <div className="mt-3 flex items-center gap-3 bg-dark-card2 border border-dark-border rounded-lg p-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold">
              {getInitials(selectedResident.full_name)}
            </div>
            <div className="flex-1">
              <div className="font-medium">{selectedResident.full_name}</div>
              <div className="text-xs text-text-muted">{selectedResident.faculty}</div>
            </div>
            {balance && (
              <div className="text-right">
                <div className="text-xs text-text-muted">Текущий долг</div>
                <div className="text-accent font-bold">{formatMoney(balance.debt)} UZS</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Amount */}
      <section className="mb-6">
        <h3 className="font-semibold text-accent mb-3">* СУММА</h3>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full text-2xl font-bold pr-16"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">UZS</span>
        </div>
        <div className="flex items-center gap-4 mt-3">
          {balance && parseFloat(balance.debt) > 0 && (
            <button
              onClick={fillDebt}
              className="text-sm text-accent border border-accent/30 rounded-lg px-3 py-1.5 hover:bg-accent/10 transition-colors"
            >
              Заполнить долг: {formatMoney(balance.debt)} UZS
            </button>
          )}
          <div className="flex items-center gap-2 text-sm text-text-muted">
            Дата оплаты:
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      </section>

      {/* Method */}
      <section className="mb-8">
        <h3 className="font-semibold text-accent mb-3">* СПОСОБ ОПЛАТЫ</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setMethod('cash')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
              method === 'cash'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-dark-border text-text-secondary hover:border-accent/30'
            }`}
          >
            <Banknote size={24} />
            <span className="text-sm font-medium">Наличные</span>
          </button>
          <button
            onClick={() => setMethod('bank_transfer')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
              method === 'bank_transfer'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-dark-border text-text-secondary hover:border-accent/30'
            }`}
          >
            <Building2 size={24} />
            <span className="text-sm font-medium">Перевод</span>
          </button>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dark-border text-text-muted opacity-50">
            <CreditCard size={24} />
            <span className="text-sm">Карта — скоро</span>
          </div>
        </div>
      </section>

      <button
        onClick={handleSubmit}
        disabled={!selectedResident || !amount || loading}
        className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Обработка...' : 'Подтвердить оплату'}
      </button>
    </div>
  )
}
