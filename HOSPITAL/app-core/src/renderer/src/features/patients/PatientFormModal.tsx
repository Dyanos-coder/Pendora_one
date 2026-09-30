import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { AdmissionType, CreatePatientInput, Gender, PatientDetail } from '@shared/patient-types'

interface PatientFormModalProps {
  onClose: () => void
  onCreated: (patient: PatientDetail) => void
  editing?: PatientDetail
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

export function PatientFormModal({ onClose, onCreated, editing }: PatientFormModalProps): JSX.Element {
  const [firstName, setFirstName] = useState(editing?.firstName ?? '')
  const [lastName, setLastName] = useState(editing?.lastName ?? '')
  const [gender, setGender] = useState<Gender>(editing?.gender ?? 'M')
  const [birthDate, setBirthDate] = useState(editing ? editing.birthDate.slice(0, 10) : '')
  const [phone, setPhone] = useState(editing?.phone ?? '')
  const [email, setEmail] = useState(editing?.email ?? '')
  const [bloodType, setBloodType] = useState(editing?.bloodType ?? '')
  const [admissionType, setAdmissionType] = useState<AdmissionType>(editing?.admissionType ?? 'NON_ADMIS')
  // Hospitalisé/Urgence : posés automatiquement par les pages Hospitalisation et Urgences — non
  // modifiables ici (le champ n'est alors pas envoyé).
  const automaticAdmission = admissionType === 'HOSPITALISE' || admissionType === 'URGENCE'
  const [service, setService] = useState(editing?.service ?? '')
  const [insuranceProvider, setInsuranceProvider] = useState(editing?.insuranceProvider ?? '')
  const [insuranceNumber, setInsuranceNumber] = useState(editing?.insuranceNumber ?? '')
  const [emergencyContactName, setEmergencyContactName] = useState(editing?.emergencyContact.name ?? '')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(editing?.emergencyContact.phone ?? '')
  const [allergies, setAllergies] = useState(editing?.allergies ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !birthDate) {
      setError('Prénom, nom et date de naissance sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.patients.update(editing.id, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender,
          birthDate,
          phone: phone.trim() || null,
          email: email.trim() || null,
          bloodType: bloodType.trim() || null,
          allergies: allergies.trim() || null,
          admissionType: automaticAdmission ? undefined : admissionType,
          service: service.trim() || null,
          insuranceProvider: insuranceProvider.trim() || null,
          insuranceNumber: insuranceNumber.trim() || null,
          emergencyContactName: emergencyContactName.trim() || null,
          emergencyContactPhone: emergencyContactPhone.trim() || null
        })
      : await window.api.patients.create({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender,
          birthDate,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          bloodType: bloodType.trim() || undefined,
          allergies: allergies.trim() || undefined,
          admissionType,
          service: service.trim() || undefined,
          insuranceProvider: insuranceProvider.trim() || undefined,
          insuranceNumber: insuranceNumber.trim() || undefined,
          emergencyContactName: emergencyContactName.trim() || undefined,
          emergencyContactPhone: emergencyContactPhone.trim() || undefined
        } as CreatePatientInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.patient)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le patient' : 'Nouveau patient'} onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Prénom *</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nom *</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Genre *</label>
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className={inputClass}>
              <option value="M">Homme</option>
              <option value="F">Femme</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Date de naissance *</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Groupe sanguin</label>
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className={inputClass}>
              <option value="">Non renseigné</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Type d&apos;admission</label>
            <select
              value={admissionType}
              onChange={(e) => setAdmissionType(e.target.value as AdmissionType)}
              disabled={automaticAdmission}
              className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
            >
              <option value="NON_ADMIS">Non admis</option>
              <option value="AMBULATOIRE">Ambulatoire</option>
              {automaticAdmission && <option value="HOSPITALISE">Hospitalisé</option>}
              {automaticAdmission && <option value="URGENCE">Urgence</option>}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">
              {automaticAdmission
                ? 'Défini automatiquement par la page ' + (admissionType === 'HOSPITALISE' ? 'Hospitalisation.' : 'Urgences.')
                : 'Hospitalisé / Urgence : mis à jour automatiquement depuis les pages Hospitalisation et Urgences.'}
            </p>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Service</label>
            <input value={service} onChange={(e) => setService(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Assurance</label>
            <input value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>N° d&apos;assurance</label>
            <input value={insuranceNumber} onChange={(e) => setInsuranceNumber(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Contact d&apos;urgence — nom</label>
            <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Contact d&apos;urgence — téléphone</label>
            <input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Allergies</label>
            <textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} rows={2} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : editing ? (
              'Enregistrer les modifications'
            ) : (
              'Créer le patient'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
