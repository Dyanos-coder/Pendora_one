import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiVitalsRow } from '@shared/patient-types'

interface AddVitalsModalProps {
  patientId: string
  onClose: () => void
  onAdded: (vitals: ApiVitalsRow[]) => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

export function AddVitalsModal({ patientId, onClose, onAdded }: AddVitalsModalProps): JSX.Element {
  const [bloodPressure, setBloodPressure] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [temperature, setTemperature] = useState('')
  const [weight, setWeight] = useState('')
  const [oxygenSaturation, setOxygenSaturation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!bloodPressure.trim() && !heartRate.trim() && !temperature.trim() && !weight.trim() && !oxygenSaturation.trim()) {
      setError('Renseignez au moins une constante.')
      return
    }

    setSubmitting(true)
    setError(null)
    const result = await window.api.patients.addVitals(patientId, {
      bloodPressure: bloodPressure.trim() || undefined,
      heartRate: heartRate.trim() || undefined,
      temperature: temperature.trim() || undefined,
      weight: weight.trim() || undefined,
      oxygenSaturation: oxygenSaturation.trim() || undefined
    })
    setSubmitting(false)
    if (result.ok) {
      onAdded(result.data.vitals)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title="Enregistrer les constantes" onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
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
