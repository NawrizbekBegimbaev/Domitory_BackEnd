import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit, ArrowRightLeft, LogOut, Plus, Download } from 'lucide-react'
import { residentsApi, chargesApi, paymentsApi, assignmentsApi } from '../api/endpoints'
import api from '../api/client'
import type { Resident, Charge, Payment, Guardian, RoomAssignment, PaginatedResponse } from '../types'
import { formatMoney, formatDate, statusLabels, statusColors, getInitials } from '../utils/format'
import EditResidentModal from '../components/EditResidentModal'
import TransferResidentModal from '../components/TransferResidentModal'
import EvictResidentModal from '../components/EvictResidentModal'
import AddGuardianModal from '../components/AddGuardianModal'
import UploadDocumentModal from '../components/UploadDocumentModal'

const tabs = ['Анкета', 'Опекуны', 'Документы', 'Проживание', 'Финансы']

interface Document {
  id: string
  document_type: string
  document_number: string
  file: string
  created_at: string
}

interface StayRecord {
  id: string
  check_in_at: string | null
  check_out_at: string | null
  reason: string
  created_at: string
}

const reasonLabels: Record<string, string> = {
  initial_check_in: 'Заселение',
  transfer: 'Перевод',
  eviction: 'Выселение',
  graduation: 'Выпуск',
  temporary_leave: 'Временный выезд',
  return: 'Возвращение',
}

const docTypeLabels: Record<string, string> = {
  passport: 'Паспорт',
  student_id: 'Студ. билет',
  contract: 'Договор',
  medical: 'Мед. карта',
  other: 'Другое',
}

export default function ResidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [resident, setResident] = useState<Resident | null>(null)
  const [balance, setBalance] = useState<{ debt: string; total_charges: string; total_paid: string } | null>(null)
  const [charges, setCharges] = useState<Charge[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [stayRecords, setStayRecords] = useState<StayRecord[]>([])
  const [assignments, setAssignments] = useState<RoomAssignment[]>([])
  const [activeTab, setActiveTab] = useState('Финансы')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showEvictModal, setShowEvictModal] = useState(false)
  const [showGuardianModal, setShowGuardianModal] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)

  const reload = () => {
    if (!id) return
    residentsApi.get(id).then((r) => setResident(r.data)).catch(() => {})
    residentsApi.balance(id).then((r) => setBalance(r.data)).catch(() => {})
    chargesApi.list({ resident: id }).then((r) => setCharges((r.data as PaginatedResponse<Charge>).results)).catch(() => {})
    paymentsApi.list({ resident: id }).then((r) => setPayments((r.data as PaginatedResponse<Payment>).results)).catch(() => {})
    residentsApi.guardians(id).then((r) => setGuardians(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    api.get(`/residents/${id}/documents/`).then((r) => setDocuments(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    api.get(`/stay-records/`, { params: { resident: id } }).then((r) => {
      const d = r.data.results || r.data
      setStayRecords(Array.isArray(d) ? d : [])
    }).catch(() => {})
    assignmentsApi.list({ resident: id }).then((r) => setAssignments((r.data as PaginatedResponse<RoomAssignment>).results)).catch(() => {})
  }

  useEffect(() => { reload() }, [id])

  if (!resident) return <div className="text-text-muted p-8">Загрузка...</div>

  return (
    <div>
      <div className="text-text-muted text-sm mb-4">Жильцы / {resident.full_name}</div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left - Profile */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-accent/20 text-accent flex items-center justify-center text-2xl font-bold mx-auto mb-3">
              {getInitials(resident.full_name)}
            </div>
            <h2 className="text-lg font-bold">{resident.full_name}</h2>
            <span className={`text-sm ${statusColors[resident.status]}`}>{statusLabels[resident.status]}</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">ID:</span><span>{resident.university_id}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Факультет:</span><span>{resident.faculty}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Курс:</span><span>{resident.course}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Телефон:</span><span>{resident.phone_number || '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Email:</span><span>{resident.email || '—'}</span></div>
            {resident.birth_date && <div className="flex justify-between"><span className="text-text-muted">Д.р.:</span><span>{formatDate(resident.birth_date)}</span></div>}
          </div>

          <div className="mt-6 space-y-2">
            <button onClick={() => setShowEditModal(true)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover transition-colors">
              <Edit size={14} /> Редактировать
            </button>
            <button onClick={() => setShowTransferModal(true)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover transition-colors">
              <ArrowRightLeft size={14} /> Перевести в комнату
            </button>
            <button onClick={() => setShowEvictModal(true)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">
              <LogOut size={14} /> Выселить
            </button>
          </div>
        </div>

        {/* Right - Tabs content */}
        <div className="col-span-2">
          {balance && (
            <div className="bg-dark-card border border-dark-border rounded-xl p-5 mb-4 flex items-center justify-between">
              <div>
                <div className="text-text-muted text-sm">Текущая задолженность</div>
                <div className="text-3xl font-bold text-accent mt-1">{formatMoney(balance.debt)} <span className="text-lg text-text-muted">UZS</span></div>
              </div>
              <button
                onClick={() => navigate('/finance/payment/new')}
                className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >Принять оплату</button>
            </div>
          )}

          <div className="flex gap-1 mb-4 border-b border-dark-border">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${activeTab === t ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-white'}`}
              >{t}</button>
            ))}
          </div>

          {/* АНКЕТА */}
          {activeTab === 'Анкета' && (
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-text-muted">Пол:</span> {resident.gender === 'male' ? 'Мужской' : 'Женский'}</div>
                <div><span className="text-text-muted">Курс:</span> {resident.course || '—'}</div>
                <div><span className="text-text-muted">Факультет:</span> {resident.faculty || '—'}</div>
                <div><span className="text-text-muted">Телефон:</span> {resident.phone_number || '—'}</div>
              </div>
              {resident.notes && <div className="mt-4 text-sm"><span className="text-text-muted">Заметки:</span><p className="mt-1">{resident.notes}</p></div>}
            </div>
          )}

          {/* ОПЕКУНЫ */}
          {activeTab === 'Опекуны' && (
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Опекуны</h3>
                <button onClick={() => setShowGuardianModal(true)} className="text-accent text-sm flex items-center gap-1 hover:underline"><Plus size={14} /> Добавить</button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
                    <th className="text-left py-2">ФИО</th>
                    <th className="text-left py-2">Родство</th>
                    <th className="text-left py-2">Телефон</th>
                    <th className="py-2">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {guardians.map((g) => (
                    <tr key={g.id} className="border-b border-dark-border/50">
                      <td className="py-3">{g.full_name}</td>
                      <td className="py-3 text-text-secondary">{g.relationship}</td>
                      <td className="py-3">{g.phone_number}</td>
                      <td className="py-3 text-center"><button className="text-text-muted hover:text-accent"><Edit size={14} /></button></td>
                    </tr>
                  ))}
                  {guardians.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-text-muted">Нет опекунов</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ДОКУМЕНТЫ */}
          {activeTab === 'Документы' && (
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Документы</h3>
                <button onClick={() => setShowDocumentModal(true)} className="text-accent text-sm flex items-center gap-1 hover:underline"><Plus size={14} /> Загрузить</button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
                    <th className="text-left py-2">Тип документа</th>
                    <th className="text-left py-2">Название файла</th>
                    <th className="text-left py-2">Дата загрузки</th>
                    <th className="py-2">Скачать</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id} className="border-b border-dark-border/50">
                      <td className="py-3">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-accent/10 text-accent uppercase">
                          {docTypeLabels[d.document_type] || d.document_type}
                        </span>
                      </td>
                      <td className="py-3 text-text-secondary">{d.file?.split('/').pop() || '—'}</td>
                      <td className="py-3 text-text-muted">{formatDate(d.created_at)}</td>
                      <td className="py-3 text-center">
                        {d.file && <a href={d.file} className="text-accent hover:underline"><Download size={14} /></a>}
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-text-muted">Нет документов</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ПРОЖИВАНИЕ */}
          {activeTab === 'Проживание' && (
            <div className="space-y-4">
              {/* Current assignment */}
              {assignments.filter((a) => a.status === 'active').length > 0 && (
                <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                  <h3 className="font-semibold mb-3">Текущее размещение</h3>
                  {assignments.filter((a) => a.status === 'active').map((a) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-accent font-bold">Комната {a.room_number || a.room}</span>
                        <div className="text-xs text-text-muted mt-1">с {formatDate(a.start_date)}</div>
                      </div>
                      <span className="text-green-400 text-sm flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Активно</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stay history */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                <h3 className="font-semibold mb-3">История проживания</h3>
                <div className="space-y-3">
                  {stayRecords.map((sr) => (
                    <div key={sr.id} className="flex items-start gap-3 border-l-2 border-accent/30 pl-4">
                      <div className="w-2 h-2 rounded-full bg-accent mt-2 -ml-[21px]" />
                      <div>
                        <div className="font-medium text-sm">{reasonLabels[sr.reason] || sr.reason}</div>
                        <div className="text-xs text-text-muted">
                          {sr.check_in_at && formatDate(sr.check_in_at)}
                          {sr.check_out_at && ` — ${formatDate(sr.check_out_at)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                  {stayRecords.length === 0 && <div className="text-text-muted text-sm">Нет записей</div>}
                </div>
              </div>
            </div>
          )}

          {/* ФИНАНСЫ */}
          {activeTab === 'Финансы' && (
            <div className="space-y-4">
              <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                <h3 className="font-semibold mb-3">История начислений</h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-text-muted text-xs uppercase border-b border-dark-border">
                      <th className="text-left py-2">Период</th><th className="text-right py-2">Сумма</th><th className="text-right py-2">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.map((c) => (
                      <tr key={c.id} className="border-b border-dark-border/50">
                        <td className="py-2.5">{String(c.period_month).padStart(2, '0')}/{c.period_year}</td>
                        <td className="text-right">{formatMoney(c.amount)} UZS</td>
                        <td className={`text-right ${statusColors[c.status]}`}>{statusLabels[c.status]}</td>
                      </tr>
                    ))}
                    {charges.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-text-muted">Нет начислений</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                <h3 className="font-semibold mb-3">Последние платежи</h3>
                <div className="space-y-2">
                  {payments.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-dark-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs">$</div>
                        <div><div className="text-sm">Пополнение баланса</div><div className="text-xs text-text-muted">{formatDate(p.payment_date)}</div></div>
                      </div>
                      <span className="text-green-400 font-medium">+{formatMoney(p.amount)} UZS</span>
                    </div>
                  ))}
                  {payments.length === 0 && <div className="py-4 text-center text-text-muted text-sm">Нет платежей</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <EditResidentModal resident={resident} onClose={() => setShowEditModal(false)} onUpdated={reload} />
      )}
      {showTransferModal && (
        <TransferResidentModal
          residentName={resident.full_name}
          currentAssignment={assignments.find((a) => a.status === 'active') || null}
          onClose={() => setShowTransferModal(false)}
          onTransferred={reload}
        />
      )}
      {showEvictModal && (
        <EvictResidentModal
          resident={resident}
          assignment={assignments.find((a) => a.status === 'active') || null}
          debt={balance?.debt || '0'}
          onClose={() => setShowEvictModal(false)}
          onEvicted={() => { reload(); navigate('/residents') }}
        />
      )}
      {showGuardianModal && id && (
        <AddGuardianModal
          residentId={id}
          residentName={resident.full_name}
          onClose={() => setShowGuardianModal(false)}
          onCreated={reload}
        />
      )}
      {showDocumentModal && id && (
        <UploadDocumentModal
          residentId={id}
          onClose={() => setShowDocumentModal(false)}
          onUploaded={reload}
        />
      )}
    </div>
  )
}
