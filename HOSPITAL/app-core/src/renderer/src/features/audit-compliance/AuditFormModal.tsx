import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiAudit, ApiAuditType, ApiGovernanceAuditStatus, CreateAuditInput } from '@shared/audit-compliance-types'

interface AuditFormModalProps {
  onClose: () => void
  onCreated: (audit: ApiAudit) => void
  editing?: ApiAudit
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const STATUS_OPTIONS: { value: ApiGovernanceAuditStatus; label: string }[] = [
  { value: 'PLANIFIE', label: 'Planifié' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINE', label: 'Terminé' }
]

function todayLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function AuditFormModal({ onClose, onCreated, editing }: AuditFormModalProps): JSX.Element {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [type, setType] = useState<ApiAuditType>(editing?.type ?? 'INTERNE')
  const [service, setService] = useState(editing?.service ?? '')
  const [scheduledAt, setScheduledAt] = useState(editing ? editing.scheduledAt.slice(0, 10) : todayLocal())
  const [status, setStatus] = useState<ApiGovernanceAuditStatus>(editing?.status ?? 'PLANIFIE')
  const [score, setScore] = useState<number | ''>(editing?.score ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim() || !service.trim() || !scheduledAt) {
      setError('Titre, service et date sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.auditCompliance.updateAudit(editing.id, {
          title: title.trim(),
          type,
          service: service.trim(),
          scheduledAt: new Date(scheduledAt).toISOString(),
          status,
          score: score === '' ? null : score
        })
      : await window.api.auditCompliance.createAudit({
          title: title.trim(),
          type,
          service: service.trim(),
          scheduledAt: new Date(scheduledAt).toISOString()
        } as CreateAuditInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.audit)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier l'audit" : 'Planifier un audit'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Titre de l&apos;audit *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as ApiAuditType)} className={inputClass}>
              <option value="INTERNE">Interne</option>
              <option value="EXTERNE">Externe</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Service audité *</label>
            <input value={service} onChange={(e) => setService(e.target.value)} className={inputClass} />
          </div>
          {editing && (
            <>
              <div>
                <label className={labelClass}>Statut</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as ApiGovernanceAuditStatus)} className={inputClass}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Score (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer les modifications' : "Planifier l'audit"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
