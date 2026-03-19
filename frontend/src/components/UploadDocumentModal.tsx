import { useState, useRef } from 'react'
import { X, Upload } from 'lucide-react'
import { residentsApi } from '../api/endpoints'
import { useTranslation } from '../i18n'

interface Props {
  residentId: string
  onClose: () => void
  onUploaded: () => void
}

export default function UploadDocumentModal({ residentId, onClose, onUploaded }: Props) {
  const { t } = useTranslation()

  const docTypes = [
    { value: 'passport', label: t('docTypePassport') },
    { value: 'student_id', label: t('docTypeStudentId') },
    { value: 'contract', label: t('docTypeContract') },
    { value: 'medical', label: t('docTypeMedical') },
    { value: 'other', label: t('docTypeOther') },
  ]

  const [docType, setDocType] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!docType || !file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('document_type', docType)
      formData.append('document_number', docNumber)
      formData.append('file', file)
      await residentsApi.uploadDocument(residentId, formData)
      onUploaded()
      onClose()
    } catch {
      alert(t('errorUploadingDoc'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{t('uploadDocument')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('docType')} *</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full">
              <option value="">{t('selectDocType')}</option>
              {docTypes.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase mb-1">{t('docNumber')}</label>
            <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="AB 1234567" className="w-full" />
          </div>

          <div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-dark-border rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 transition-colors">
              <Upload size={32} className="mx-auto text-text-muted mb-2" />
              {file ? (
                <div>
                  <div className="text-sm font-medium">{file.name}</div>
                  <div className="text-xs text-text-muted mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              ) : (
                <div>
                  <div className="text-sm text-text-secondary">{t('dragFileOrClick')}</div>
                  <div className="text-xs text-text-muted mt-1">{t('fileLimit')}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-dark-border text-sm hover:bg-dark-hover">{t('cancel')}</button>
          <button onClick={handleUpload} disabled={loading || !docType || !file}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? t('uploading') : t('upload')}
          </button>
        </div>
      </div>
    </div>
  )
}
