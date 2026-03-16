import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Banknote, FileText, TrendingUp, Download } from 'lucide-react'
import { reportsApi } from '../api/endpoints'
import type { Debtor, SummaryReport, OccupancyBuilding } from '../types'
import StatCard from '../components/StatCard'
import Pagination from '../components/Pagination'
import { formatMoney, formatDate, formatDateTime } from '../utils/format'

const reportTabs = ['Должники', 'Занятость', 'Оплаты', 'Жильцы', 'Сводка']

const months = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('Должники')
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [occupancy, setOccupancy] = useState<OccupancyBuilding[]>([])
  const [paymentsReport, setPaymentsReport] = useState<{ payments: any[]; total: string; count: number }>({ payments: [], total: '0', count: 0 })
  const [residentsReport, setResidentsReport] = useState<any[]>([])
  const [summary, setSummary] = useState<SummaryReport | null>(null)

  // Filters
  const [paymentMonth, setPaymentMonth] = useState(String(new Date().getMonth() + 1))
  const [paymentYear, setPaymentYear] = useState(String(new Date().getFullYear()))
  const [paymentMethod, setPaymentMethod] = useState('')
  const [residentStatus, setResidentStatus] = useState('')
  const [residentGender, setResidentGender] = useState('')

  useEffect(() => {
    reportsApi.debtors().then((r) => setDebtors(r.data)).catch(() => {})
    reportsApi.occupancy().then((r) => setOccupancy(r.data)).catch(() => {})
    reportsApi.summary().then((r) => setSummary(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (paymentMethod) params.method = paymentMethod
    reportsApi.payments(params).then((r) => setPaymentsReport(r.data)).catch(() => {})
  }, [paymentMethod])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (residentStatus) params.status = residentStatus
    if (residentGender) params.gender = residentGender
    reportsApi.residents(params).then((r) => setResidentsReport(r.data)).catch(() => {})
  }, [residentStatus, residentGender])

  const totalDebt = debtors.reduce((s, d) => s + parseFloat(d.debt), 0)
  const avgDebt = debtors.length > 0 ? totalDebt / debtors.length : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Отчёты</h1>
          <p className="text-text-muted text-sm">Отчёт на {new Date().toLocaleDateString('ru-RU')}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-dark-card border border-dark-border rounded-lg p-1 w-fit">
        {reportTabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              activeTab === t ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ДОЛЖНИКИ */}
      {activeTab === 'Должники' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard icon={<Users size={18} className="text-accent" />} label="Должников" value={debtors.length} />
            <StatCard icon={<Banknote size={18} className="text-red-400" />} label="Общий долг" value={`${formatMoney(totalDebt)} UZS`} />
            <StatCard icon={<FileText size={18} className="text-yellow-400" />} label="Средний долг" value={`${formatMoney(Math.round(avgDebt))} UZS`} />
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">ФИО</th>
                  <th className="text-left py-3 px-4">Факультет</th>
                  <th className="text-right py-3 px-4">Начислено</th>
                  <th className="text-right py-3 px-4">Оплачено</th>
                  <th className="text-right py-3 px-4">Долг</th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((d, i) => (
                  <tr key={d.id} className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors">
                    <td className="py-3 px-4 text-text-muted">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{d.full_name}</div>
                      <div className="text-xs text-text-muted">{d.university_id}</div>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{d.faculty}</td>
                    <td className="py-3 px-4 text-right text-text-secondary">{formatMoney(d.total_charged)}</td>
                    <td className="py-3 px-4 text-right text-text-secondary">{formatMoney(d.total_allocated)}</td>
                    <td className="py-3 px-4 text-right"><span className="text-red-400 font-semibold">{formatMoney(d.debt)}</span></td>
                  </tr>
                ))}
                {debtors.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-text-muted">Нет должников</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ЗАНЯТОСТЬ */}
      {activeTab === 'Занятость' && (
        <div className="space-y-4">
          {occupancy.map((b) => (
            <div key={b.building_id} className="bg-dark-card border border-dark-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{b.building_name}</h3>
                <span className="text-accent font-bold text-lg">{b.percentage}%</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div><div className="text-text-muted text-xs">Мест</div><div className="text-xl font-bold">{b.capacity}</div></div>
                <div><div className="text-text-muted text-xs">Занято</div><div className="text-xl font-bold">{b.occupancy}</div></div>
                <div><div className="text-text-muted text-xs">Свободно</div><div className="text-xl font-bold text-green-400">{b.free}</div></div>
              </div>
              <table className="w-full">
                <thead><tr className="text-text-muted text-xs uppercase border-b border-dark-border">
                  <th className="text-left py-2">Этаж</th><th className="text-center py-2">Комнат</th><th className="text-center py-2">Мест</th><th className="text-center py-2">Занято</th><th className="text-center py-2">Свободно</th><th className="py-2">Загрузка</th>
                </tr></thead>
                <tbody>
                  {b.floors.map((f) => (
                    <tr key={f.floor_number} className="border-b border-dark-border/50">
                      <td className="py-2">{f.floor_number} этаж</td>
                      <td className="text-center">{f.rooms}</td>
                      <td className="text-center">{f.capacity}</td>
                      <td className="text-center">{f.occupancy}</td>
                      <td className="text-center text-green-400">{f.free}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${f.percentage}%` }} />
                          </div>
                          <span className="text-xs text-text-secondary w-10 text-right">{f.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {occupancy.length === 0 && <div className="text-center py-12 text-text-muted">Нет данных</div>}
        </div>
      )}

      {/* ОПЛАТЫ */}
      {activeTab === 'Оплаты' && (
        <>
          <div className="flex gap-3 mb-4">
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="text-sm">
              <option value="">Все способы</option>
              <option value="cash">Наличные</option>
              <option value="bank_transfer">Банк. перевод</option>
            </select>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard icon={<FileText size={18} className="text-accent" />} label="Оплат" value={paymentsReport.count} />
            <StatCard icon={<Banknote size={18} className="text-green-400" />} label="Сумма" value={`${formatMoney(paymentsReport.total)} UZS`} />
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
                  <th className="text-left py-3 px-4">Дата</th>
                  <th className="text-left py-3 px-4">Жилец</th>
                  <th className="text-right py-3 px-4">Сумма</th>
                  <th className="text-left py-3 px-4">Способ</th>
                  <th className="text-left py-3 px-4">Принял</th>
                </tr>
              </thead>
              <tbody>
                {paymentsReport.payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-dark-border/50 hover:bg-dark-hover">
                    <td className="py-3 px-4 text-sm">{formatDate(p.payment_date)}</td>
                    <td className="py-3 px-4 text-sm">{p.resident_name}</td>
                    <td className="py-3 px-4 text-right text-green-400 font-medium">+{formatMoney(p.amount)}</td>
                    <td className="py-3 px-4 text-sm text-text-secondary">{p.payment_method === 'cash' ? 'Наличные' : 'Перевод'}</td>
                    <td className="py-3 px-4 text-sm text-text-muted">{p.recorded_by_name || '—'}</td>
                  </tr>
                ))}
                {paymentsReport.payments.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-text-muted">Нет оплат</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ЖИЛЬЦЫ */}
      {activeTab === 'Жильцы' && (
        <>
          <div className="flex gap-3 mb-4">
            <select value={residentStatus} onChange={(e) => setResidentStatus(e.target.value)} className="text-sm">
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="evicted">Выселенные</option>
              <option value="graduated">Выпустились</option>
            </select>
            <select value={residentGender} onChange={(e) => setResidentGender(e.target.value)} className="text-sm">
              <option value="">Все</option>
              <option value="male">Мужчины</option>
              <option value="female">Женщины</option>
            </select>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard icon={<Users size={18} className="text-accent" />} label="Всего" value={residentsReport.length} />
            <StatCard icon={<Users size={18} className="text-green-400" />} label="Активных" value={residentsReport.filter((r: any) => r.status === 'active').length} />
            <StatCard icon={<Users size={18} className="text-red-400" />} label="Выселенных" value={residentsReport.filter((r: any) => r.status === 'evicted').length} />
            <StatCard icon={<Users size={18} className="text-blue-400" />} label="Выпустившихся" value={residentsReport.filter((r: any) => r.status === 'graduated').length} />
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
                  <th className="text-left py-3 px-4">ФИО</th>
                  <th className="text-left py-3 px-4">Студ. ID</th>
                  <th className="text-left py-3 px-4">Факультет</th>
                  <th className="text-center py-3 px-4">Курс</th>
                  <th className="text-left py-3 px-4">Статус</th>
                </tr>
              </thead>
              <tbody>
                {residentsReport.slice(0, 50).map((r: any) => (
                  <tr key={r.id} className="border-b border-dark-border/50 hover:bg-dark-hover">
                    <td className="py-3 px-4 font-medium">{r.full_name}</td>
                    <td className="py-3 px-4 text-text-secondary">{r.university_id}</td>
                    <td className="py-3 px-4 text-text-secondary">{r.faculty}</td>
                    <td className="py-3 px-4 text-center">{r.course || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-medium ${r.status === 'active' ? 'text-green-400' : r.status === 'evicted' ? 'text-red-400' : 'text-blue-400'}`}>
                        {r.status === 'active' ? 'Активный' : r.status === 'evicted' ? 'Выселен' : 'Выпустился'}
                      </span>
                    </td>
                  </tr>
                ))}
                {residentsReport.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-text-muted">Нет данных</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* СВОДКА */}
      {activeTab === 'Сводка' && summary && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard icon={<Users size={18} className="text-accent" />} label="Жильцов" value={summary.total_residents} />
            <StatCard icon={<Banknote size={18} className="text-green-400" />} label="Оплачено UZS" value={formatMoney(paymentsReport.total)} />
            <StatCard icon={<Banknote size={18} className="text-red-400" />} label="Задолженность UZS" value={formatMoney(summary.total_debt)} />
            <StatCard icon={<TrendingUp size={18} className="text-accent" />} label="Процент оплаты" value={
              paymentsReport.total && summary.total_debt
                ? `${Math.round(parseFloat(paymentsReport.total) / (parseFloat(paymentsReport.total) + parseFloat(summary.total_debt)) * 100)}%`
                : '—'
            } />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Оплаты по способу */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Оплаты по способу</h3>
              {(() => {
                const cashPayments = paymentsReport.payments.filter((p: any) => p.payment_method === 'cash')
                const bankPayments = paymentsReport.payments.filter((p: any) => p.payment_method === 'bank_transfer')
                const cashTotal = cashPayments.reduce((s: number, p: any) => s + parseFloat(p.amount), 0)
                const bankTotal = bankPayments.reduce((s: number, p: any) => s + parseFloat(p.amount), 0)
                const total = cashTotal + bankTotal
                const cashPct = total > 0 ? Math.round((cashTotal / total) * 100) : 0
                const bankPct = total > 0 ? 100 - cashPct : 0
                return (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Наличные</span>
                        <span className="text-text-secondary">{cashPct}% — {formatMoney(cashTotal)} UZS</span>
                      </div>
                      <div className="h-3 bg-dark-border rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${cashPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Банк. перевод</span>
                        <span className="text-text-secondary">{bankPct}% — {formatMoney(bankTotal)} UZS</span>
                      </div>
                      <div className="h-3 bg-dark-border rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${bankPct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Начисления vs Оплаты */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Начисления vs Оплаты</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Оплачено</span>
                  <span className="text-green-400 font-bold">{formatMoney(paymentsReport.total)} UZS</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Задолженность</span>
                  <span className="text-red-400 font-bold">{formatMoney(summary.total_debt)} UZS</span>
                </div>
                <div className="border-t border-dark-border pt-3 flex justify-between text-sm">
                  <span className="text-accent font-medium">Остаток</span>
                  <span className="text-accent font-bold">{formatMoney(summary.total_debt)} UZS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
