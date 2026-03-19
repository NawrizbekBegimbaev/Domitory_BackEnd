import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit, ArrowRightLeft, LogOut, Plus, Download, Trash2 } from 'lucide-react'
import { residentsApi, chargesApi, paymentsApi, assignmentsApi, stayRecordsApi, contractsApi } from '../api/endpoints'
import type { Resident, Charge, Payment, Guardian, ResidentDocument, RoomAssignment, StayRecord, Contract, BalanceResponse, PaginatedResponse } from '../types'
import { formatMoney, formatDate, formatDateTime, statusColors, getInitials, getStatusLabel } from '../utils/format'
import { useTranslation } from '../i18n'
import EditResidentModal from '../components/EditResidentModal'
import TransferResidentModal from '../components/TransferResidentModal'
import EvictResidentModal from '../components/EvictResidentModal'
import AddGuardianModal from '../components/AddGuardianModal'
import UploadDocumentModal from '../components/UploadDocumentModal'

const tabKeys = ['tabGuardians', 'tabDocuments', 'tabFinance', 'tabAccommodation'] as const

export default function ResidentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [resident, setResident] = useState<Resident | null>(null)
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [charges, setCharges] = useState<Charge[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [documents, setDocuments] = useState<ResidentDocument[]>([])
  const [stayRecords, setStayRecords] = useState<StayRecord[]>([])
  const [assignments, setAssignments] = useState<RoomAssignment[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [activeTab, setActiveTab] = useState<typeof tabKeys[number]>('tabFinance')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showEvictModal, setShowEvictModal] = useState(false)
  const [showGuardianModal, setShowGuardianModal] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)

  const reasonKeyMap: Record<string, string> = {
    initial_check_in: 'reasonCheckIn',
    transfer: 'reasonTransfer',
    eviction: 'reasonEviction',
    graduation: 'reasonGraduation',
    temporary_leave: 'reasonTempLeave',
    return: 'reasonReturn',
  }

  const docTypeKeyMap: Record<string, string> = {
    passport: 'docTypePassport',
    student_id: 'docTypeStudentIdShort',
    contract: 'docTypeContract',
    medical: 'docTypeMedicalShort',
    other: 'docTypeOther',
  }

  const relationshipKeyMap: Record<string, string> = {
    father: 'relFather',
    mother: 'relMother',
    sibling: 'relSibling',
    uncle: 'relUncle',
    aunt: 'relAunt',
    other: 'relOther',
  }

  const monthKeys = [
    'monthJan', 'monthFeb', 'monthMar', 'monthApr', 'monthMay', 'monthJun',
    'monthJul', 'monthAug', 'monthSep', 'monthOct', 'monthNov', 'monthDec',
  ] as const

  const reload = () => {
    if (!id) return
    residentsApi.get(id).then((r) => setResident(r.data)).catch(() => {})
    residentsApi.balance(id).then((r) => setBalance(r.data)).catch(() => {})
    chargesApi.list({ resident: id }).then((r) => setCharges((r.data as PaginatedResponse<Charge>).results)).catch(() => {})
    paymentsApi.list({ resident: id }).then((r) => setPayments((r.data as PaginatedResponse<Payment>).results)).catch(() => {})
    residentsApi.guardians(id).then((r) => setGuardians(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    residentsApi.documents(id).then((r) => setDocuments(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    stayRecordsApi.list({ resident: id }).then((r) => {
      const d = (r.data as PaginatedResponse<StayRecord>).results
      setStayRecords(Array.isArray(d) ? d : [])
    }).catch(() => {})
    assignmentsApi.list({ resident: id }).then((r) => setAssignments((r.data as PaginatedResponse<RoomAssignment>).results)).catch(() => {})
    contractsApi.list({ resident: id }).then((r) => setContracts((r.data as PaginatedResponse<Contract>).results)).catch(() => {})
  }

  useEffect(() => { reload() }, [id])

  if (!resident) return <div className="text-text-muted p-8">{t('loading')}</div>

  const activeAssignment = assignments.find((a) => a.status === 'active')

  const handleDelete = async () => {
    if (!confirm(t('deleteResidentConfirm'))) return
    try {
      await residentsApi.delete(resident.id)
      navigate('/residents')
    } catch {
      alert(t('errorDeleting'))
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {resident.photo ? (
          <img src={resident.photo} alt="" style={{ width: 64, height: 64, minWidth: 64, minHeight: 64, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 64, height: 64, minWidth: 64, minHeight: 64, borderRadius: '50%' }} className="bg-accent/20 text-accent flex items-center justify-center text-2xl font-bold">
            {getInitials(resident.full_name)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{resident.full_name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[resident.status]} bg-current/10`}>
              {getStatusLabel(resident.status, t)}
            </span>
          </div>
          <div className="text-sm text-text-muted mt-1">
            {resident.created_at && `${t('residentSince')} ${formatDate(resident.created_at)}`}
            <span className="mx-2">·</span>ID: {resident.university_id}
            {activeAssignment && <><span className="mx-2">·</span>{t('room')}: {activeAssignment.room_number || activeAssignment.room}</>}
          </div>
        </div>
        {balance && (
          <div className="ml-auto mr-4 text-right">
            <div className="text-xs text-text-muted">{t('balance')}</div>
            {parseFloat(balance.debt) > 0 ? (
              <div className="text-lg font-bold text-red-400">-{formatMoney(balance.debt)} UZS</div>
            ) : parseFloat(balance.debt) < 0 ? (
              <div className="text-lg font-bold text-green-400">+{formatMoney(Math.abs(parseFloat(balance.debt)))} UZS</div>
            ) : (
              <div className="text-lg font-bold text-green-400">0 UZS</div>
            )}
            <div className="text-[10px] text-text-muted">
              {parseFloat(balance.debt) > 0 ? t('currentDebt') : parseFloat(balance.debt) < 0 ? t('overpayment') : t('noDebt')}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={() => setShowEditModal(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover transition-colors">
            <Edit size={14} /> {t('edit')}
          </button>
          <button onClick={() => setShowTransferModal(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-sm hover:bg-dark-hover transition-colors">
            <ArrowRightLeft size={14} /> {t('transfer')}
          </button>
          <button onClick={() => setShowEvictModal(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">
            <LogOut size={14} /> {t('evict')}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">
            <Trash2 size={14} /> {t('deleteResident')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-dark-border">
        {tabKeys.map((tk) => (
          <button key={tk} onClick={() => setActiveTab(tk)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${activeTab === tk ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-white'}`}
          >{t(tk)}</button>
        ))}
      </div>

      {/* ФИНАНСЫ */}
      {activeTab === 'tabFinance' && (
        <div className="space-y-6">
          {/* Balance + pay button */}
          {balance && (
            <div className="bg-dark-card border border-dark-border rounded-xl p-5 flex items-center justify-between">
              <div>
                {parseFloat(balance.debt) > 0 ? (
                  <>
                    <div className="text-text-muted text-sm">{t('currentDebt')}</div>
                    <div className="text-3xl font-bold text-red-400 mt-1">{formatMoney(balance.debt)} <span className="text-lg text-text-muted">UZS</span></div>
                  </>
                ) : parseFloat(balance.debt) < 0 ? (
                  <>
                    <div className="text-text-muted text-sm">{t('overpayment')}</div>
                    <div className="text-3xl font-bold text-green-400 mt-1">+{formatMoney(Math.abs(parseFloat(balance.debt)))} <span className="text-lg text-text-muted">UZS</span></div>
                  </>
                ) : (
                  <>
                    <div className="text-text-muted text-sm">{t('balance')}</div>
                    <div className="text-3xl font-bold text-green-400 mt-1">0 <span className="text-lg text-text-muted">UZS</span></div>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate(`/finance/payment/new?resident=${id}`)} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  + {t('addPayment')}
                </button>
                {parseFloat(balance.debt) < 0 && (
                  <button
                    onClick={async () => {
                      if (!confirm(t('withdrawConfirm'))) return
                      try {
                        await residentsApi.withdraw(resident.id)
                        reload()
                      } catch { alert(t('error')) }
                    }}
                    className="border border-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-500/10 transition-colors"
                  >
                    {t('withdraw')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Charges table — hide cancelled */}
          {(() => {
            const activeCharges = charges.filter((c) => c.status !== 'cancelled')
            const paidCount = activeCharges.filter((c) => c.status === 'paid').length
            const unpaidCount = activeCharges.filter((c) => c.status !== 'paid').length
            return (
              <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{t('tabFinance')}</h3>
                  {activeCharges.length > 0 && (
                    <div className="text-sm text-text-muted">
                      {paidCount > 0 && <span className="text-green-400">{t('paid')}: {paidCount} {t('monthsShort')}</span>}
                      {unpaidCount > 0 && <span className="text-red-400 ml-3">{t('remaining')}: {unpaidCount} {t('monthsShort')}</span>}
                    </div>
                  )}
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-text-muted text-xs uppercase border-b border-dark-border">
                      <th className="text-left py-2">{t('period')}</th>
                      <th className="text-right py-2">{t('charged')}</th>
                      <th className="text-right py-2">{t('paid')}</th>
                      <th className="text-right py-2">{t('remaining')}</th>
                      <th className="text-right py-2">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCharges.map((c) => (
                      <tr key={c.id} className="border-b border-dark-border/50">
                        <td className="py-2.5">{t(monthKeys[c.period_month - 1])} {c.period_year}</td>
                        <td className="text-right">{formatMoney(c.amount)}</td>
                        <td className="text-right text-green-400">{formatMoney(c.paid_amount || '0')}</td>
                        <td className="text-right">{formatMoney(c.remaining || '0')}</td>
                        <td className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[c.status]}`}>
                            {getStatusLabel(c.status, t)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {activeCharges.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-text-muted">{t('noCharges')}</td></tr>}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {/* Stay history based on assignments */}
          <div className="bg-dark-card border border-dark-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">{t('stayHistory')}</h3>
            <div className="relative ml-4">
              {assignments.map((a, i) => {
                const isActive = a.status === 'active'
                const isEvicted = a.status === 'completed'
                const contractEnd = contracts.find(c => c.id === a.contract)?.end_date
                return (
                  <div key={a.id} className="relative pb-6 last:pb-0">
                    {i < assignments.length - 1 && <div className="absolute left-0 top-3 bottom-0 w-px bg-dark-border -ml-4" />}
                    <div className={`absolute -ml-[19px] top-1.5 w-3 h-3 rounded-full border-2 ${isActive ? 'bg-green-500 border-green-500' : isEvicted ? 'bg-red-500 border-red-500' : 'bg-accent border-accent'}`} />
                    <div className="ml-2">
                      <div className="text-xs text-text-muted mb-1">{formatDate(a.start_date)}{a.end_date ? ` — ${formatDate(a.end_date)}` : contractEnd ? ` — ${formatDate(contractEnd)}` : ''}</div>
                      <div className="font-medium text-sm">
                        {t('room')} <span className="text-accent">{a.room_number || a.room}</span>
                        {a.building_name && <span className="text-text-muted"> · {a.building_name}</span>}
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${isActive ? 'bg-green-500/10 text-green-400' : isEvicted ? 'bg-red-500/10 text-red-400' : 'bg-accent/10 text-accent'}`}>
                          {getStatusLabel(a.status, t)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {assignments.length === 0 && <div className="text-text-muted text-sm ml-2">{t('noRecords')}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ОПЕКУНЫ */}
      {activeTab === 'tabGuardians' && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t('tabGuardians')}</h3>
            <button onClick={() => setShowGuardianModal(true)} className="text-accent text-sm flex items-center gap-1 hover:underline"><Plus size={14} /> {t('addGuardian')}</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
                <th className="text-left py-2">{t('fullName')}</th>
                <th className="text-left py-2">{t('guardianRelation')}</th>
                <th className="text-left py-2">{t('phone')}</th>
                <th className="py-2">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {guardians.map((g) => {
                const relKey = relationshipKeyMap[g.relationship]
                return (
                  <tr key={g.id} className="border-b border-dark-border/50">
                    <td className="py-3">{g.full_name}</td>
                    <td className="py-3 text-text-secondary">{relKey ? t(relKey as any) : g.relationship}</td>
                    <td className="py-3">{g.phone_number}</td>
                    <td className="py-3 text-center"><button className="text-text-muted hover:text-accent"><Edit size={14} /></button></td>
                  </tr>
                )
              })}
              {guardians.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-text-muted">{t('noGuardians')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ДОКУМЕНТЫ */}
      {activeTab === 'tabDocuments' && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t('tabDocuments')}</h3>
            <button onClick={() => setShowDocumentModal(true)} className="text-accent text-sm flex items-center gap-1 hover:underline"><Plus size={14} /> {t('uploadDoc')}</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border text-text-muted text-xs uppercase">
                <th className="text-left py-2">{t('docType')}</th>
                <th className="text-left py-2">{t('docNumber')}</th>
                <th className="text-left py-2">{t('uploadDate')}</th>
                <th className="py-2">{t('download')}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => {
                const dtKey = docTypeKeyMap[d.document_type]
                return (
                  <tr key={d.id} className="border-b border-dark-border/50">
                    <td className="py-3">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-accent/10 text-accent uppercase">
                        {dtKey ? t(dtKey as any) : d.document_type}
                      </span>
                    </td>
                    <td className="py-3 text-text-secondary">{d.document_number || '—'}</td>
                    <td className="py-3 text-text-muted">{formatDate(d.created_at)}</td>
                    <td className="py-3 text-center">
                      {d.file && <a href={d.file} className="text-accent hover:underline"><Download size={14} /></a>}
                    </td>
                  </tr>
                )
              })}
              {documents.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-text-muted">{t('noDocuments')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ПРОЖИВАНИЕ */}
      {activeTab === 'tabAccommodation' && (
        <div className="space-y-4">
          {activeAssignment && (
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <h3 className="font-semibold mb-3">{t('currentPlacement')}</h3>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-accent font-bold">{t('room')} {activeAssignment.room_number || activeAssignment.room}</span>
                  {activeAssignment.building_name && <span className="text-text-muted ml-2">· {activeAssignment.building_name}</span>}
                  <div className="text-xs text-text-muted mt-1">
                    {t('start').toLowerCase()} {formatDate(activeAssignment.start_date)}
                    {activeAssignment.end_date
                      ? ` ${t('end').toLowerCase()} ${formatDate(activeAssignment.end_date)}`
                      : contracts.length > 0 && contracts.find(c => c.id === activeAssignment.contract)?.end_date
                        ? ` ${t('end').toLowerCase()} ${formatDate(contracts.find(c => c.id === activeAssignment.contract)!.end_date)}`
                        : ''
                    }
                  </div>
                </div>
                <span className="text-green-400 text-sm flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> {t('active')}</span>
              </div>
            </div>
          )}

          <div className="bg-dark-card border border-dark-border rounded-xl p-5">
            <h3 className="font-semibold mb-3">{t('allAssignments')}</h3>
            <table className="w-full">
              <thead>
                <tr className="text-text-muted text-xs uppercase border-b border-dark-border">
                  <th className="text-left py-2">{t('room')}</th>
                  <th className="text-left py-2">{t('start')}</th>
                  <th className="text-left py-2">{t('end')}</th>
                  <th className="text-right py-2">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-dark-border/50">
                    <td className="py-2.5">{a.room_number || a.room}</td>
                    <td className="py-2.5 text-text-muted">{formatDate(a.start_date)}</td>
                    <td className="py-2.5 text-text-muted">{a.end_date ? formatDate(a.end_date) : contracts.find(c => c.id === a.contract)?.end_date ? formatDate(contracts.find(c => c.id === a.contract)!.end_date) : '—'}</td>
                    <td className={`py-2.5 text-right ${statusColors[a.status]}`}>{getStatusLabel(a.status, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showEditModal && (
        <EditResidentModal resident={resident} onClose={() => setShowEditModal(false)} onUpdated={reload} />
      )}
      {showTransferModal && (
        <TransferResidentModal
          residentName={resident.full_name}
          currentAssignment={activeAssignment || null}
          onClose={() => setShowTransferModal(false)}
          onTransferred={reload}
        />
      )}
      {showEvictModal && (
        <EvictResidentModal
          resident={resident}
          assignment={activeAssignment || null}
          debt={balance?.debt || '0'}
          onClose={() => setShowEvictModal(false)}
          onEvicted={() => { reload(); navigate('/residents') }}
        />
      )}
      {showGuardianModal && id && (
        <AddGuardianModal residentId={id} residentName={resident.full_name} onClose={() => setShowGuardianModal(false)} onCreated={reload} />
      )}
      {showDocumentModal && id && (
        <UploadDocumentModal residentId={id} onClose={() => setShowDocumentModal(false)} onUploaded={reload} />
      )}
    </div>
  )
}
