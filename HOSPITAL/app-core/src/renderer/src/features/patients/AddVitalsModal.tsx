import { useState, type FormEvent } from 'react'
import { Loader2, Paperclip } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiVitalsRow, ApiVitalsSource } from '@shared/patient-types'

interface AddVitalsModalProps {
  patientId: string
  onClose: () => void
  onAdded: (vitals: ApiVitalsRow[]) => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const SOURCE_OPTIONS: { value: ApiVitalsSource; label: string }[] = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'RDV', label: 'Rendez-vous' },
  { value: 'ANALYSE', label: 'Analyse' }
]

export function AddVitalsModal({ patientId, onClose, onAdded }: AddVitalsModalProps): JSX.Element {
  const [source, setSource] = useState<ApiVitalsSource | ''>('')
  const [mode, setMode] = useState<'manual' | 'document'>('manual')
  const [bloodPressure, setBloodPressure] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [temperature, setTemperature] = useState('')
  const [weight, setWeight] = useState('')
  const [oxygenSaturation, setOxygenSaturation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!source) {
      setError('Indiquez le contexte de prise des constantes.')
      return
    }
    if (
      mode === 'manual' &&
      !bloodPressure.trim() &&
      !heartRate.trim() &&
      !temperature.trim() &&
      !weight.trim() &&
      !oxygenSaturation.trim()
    ) {
      setError('Renseignez au moins une constante.')
      return
    }

    setSubmitting(true)
    setError(null)
    const result = await window.api.patients.addVitals(
      patientId,
      mode === 'manual'
        ? {
            source,
            bloodPressure: bloodPressure.trim() || undefined,
            heartRate: heartRate.trim() || undefined,
            temperature: temperature.trim() || undefined,
            weight: weight.trim() || undefined,
            oxygenSaturation: oxygenSaturation.trim() || undefined
          }
        : { source }
    )
    if (!result.ok) {
      setSubmitting(false)
      setError(result.error)
      return
    }

    if (mode === 'document') {
      const upload = await window.api.patients.uploadVitalsFile(patientId, result.data.vitalsId)
      setSubmitting(false)
      if (!upload) {
        setError('Aucun fichier choisi — la prise de constantes a été enregistrée sans document.')
        onAdded(result.data.vitals)
        return
      }
      if (!upload.ok) {
        setError(upload.error)
        return
      }
      onAdded(upload.data.vitals)
      return
    }

    setSubmitting(false)
    onAdded(result.data.vitals)
  }

  return (
    <Modal title="Enregistrer les constantes" onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Prises lors de *</label>
          <select value={source} onChange={(e) => setSource(e.target.value as ApiVitalsSource)} className={inputClass}>
            <option value="">— Choisir —</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 rounded-md py-1.5 transition-colors ${mode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Saisie manuelle
          </button>
          <button
            type="button"
            onClick={() => setMode('document')}
            className={`flex-1 rounded-md py-1.5 transition-colors ${mode === 'document' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Téléverser un document
          </button>
        </div>

        {mode === 'manual' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tension artérielle</label>
              <input value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} placeholder="120/80 mmHg" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pouls</label>
              <input value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="72 bpm" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Température</label>
              <input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="37.0°C" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Poids</label>
              <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70 kg" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Saturation O2</label>
              <input
                value={oxygenSaturation}
                onChange={(e) => setOxygenSaturation(e.target.value)}
                placeholder="98%"
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-4 text-xs text-gray-500">
            <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
            Le fichier (photo, PDF, Word...) sera demandé après avoir cliqué sur « Enregistrer ».
          </p>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
