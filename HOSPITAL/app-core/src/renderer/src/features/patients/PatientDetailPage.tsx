import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Phone,
  Mail,
  Droplet,
  ShieldAlert,
  HeartHandshake,
  Printer,
  Stethoscope,
  FlaskConical,
  Siren,
  Scissors,
  BedDouble,
  Eye,
  Pill,
  Download,
  Loader2,
  Plus,
  Ban,
  RotateCcw,
  Upload,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ProgressRing } from '@renderer/components/ProgressRing'
import { Button } from '@renderer/components/Button'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { PatientAvatar } from './PatientAvatar'
import { PatientFormModal } from './PatientFormModal'
import { AddVitalsModal } from './AddVitalsModal'
import { AddPrescriptionModal } from './AddPrescriptionModal'
import { PatientDocumentFormModal } from './PatientDocumentFormModal'
import {
  statusInfo,
  resultTone,
  consultationTone,
  appointmentTone,
  CONSULTATION_STATUS_LABEL,
  APPOINTMENT_STATUS_LABEL,
  RESULT_STATUS_LABEL
} from './status'
import { formatFullDate, formatTime } from '@renderer/features/appointments/week'
import type { Patient } from './types'
import type {
  AdmissionType as ApiAdmissionType,
  ApiPatientDocument,
  ApiPatientDossier,
  ApiTimelineEventType,
  PatientDetail as ApiPatientDetail
} from '@shared/patient-types'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

interface PatientDetailPageProps {
  patientId: string
  onBack: () => void
}

const TIMELINE_ICON: Record<ApiTimelineEventType, typeof Stethoscope> = {
  consultation: Stethoscope,
  exam: FlaskConical,
  emergency: Siren,
  admission: BedDouble,
  surgery: Scissors
}

const ADMISSION_LABEL: Record<ApiAdmissionType, Patient['admissionType']> = {
  NON_ADMIS: 'Non admis',
  AMBULATOIRE: 'Ambulatoire',
  HOSPITALISE: 'Hospitalisé',
  URGENCE: 'Urgence'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

/** Consultations, RDV à venir, vitaux, ordonnances, résultats, chronologie et documents viennent
 * tous de vraies données à ce stade — documents via `window.api.patients.documents` (item 11,
 * voir `documents` state ci-dessous), le reste du dossier agrégé via `window.api.patients.dossier`
 * (`dossier` state, `ApiPatientDossier`). */
function mergePatient(api: ApiPatientDetail): Patient {
  return {
    id: api.id,
    code: api.code,
    firstName: api.firstName,
    lastName: api.lastName,
    age: api.age,
    gender: api.gender,
    birthDate: formatDate(api.birthDate),
    phone: api.phone ?? '—',
    email: api.email ?? '—',
    bloodType: api.bloodType ?? '—',
    allergies: api.allergies ?? 'Non renseignées',
    status: api.status === 'ACTIVE' ? 'active' : 'inactive',
    admissionType: ADMISSION_LABEL[api.admissionType],
    service: api.service ?? '—',
    insuranceProvider: api.insuranceProvider ?? '—',
    insuranceNumber: api.insuranceNumber ?? '—',
    insuranceExpiry: formatDate(api.insuranceExpiry),
    lastVisit: api.lastVisit ?? '—',
    emergencyContact: { name: api.emergencyContact.name ?? '—', phone: api.emergencyContact.phone ?? '—' },
    medicalHistory: api.medicalHistory,
    familyHistory: api.familyHistory,
    lifestyle: api.lifestyle,
    recordCompleteness: api.recordCompleteness
  }
}

export function PatientDetailPage({ patientId, onBack }: PatientDetailPageProps): JSX.Element {
  const [apiPatient, setApiPatient] = useState<ApiPatientDetail | null>(null)
  const [dossier, setDossier] = useState<ApiPatientDossier | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddVitalsModal, setShowAddVitalsModal] = useState(false)
  const [showAddPrescriptionModal, setShowAddPrescriptionModal] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)

  const [documents, setDocuments] = useState<ApiPatientDocument[]>([])
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false)
  const [deletingDocument, setDeletingDocument] = useState<ApiPatientDocument | null>(null)
  const [uploadingDocumentId, setUploadingDocumentId] = useState<string | null>(null)
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    Promise.all([window.api.patients.get(patientId), window.api.patients.dossier(patientId)]).then(
      ([patientResult, dossierResult]) => {
        if (cancelled) return
        if (patientResult.ok) {
          setApiPatient(patientResult.data.patient)
        } else {
          setNotFound(true)
        }
        if (dossierResult.ok) {
          setDossier(dossierResult.data.dossier)
        }
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [patientId])

  useEffect(() => {
    let cancelled = false
    window.api.patients.documents.list(patientId).then((result) => {
      if (cancelled) return
      if (result.ok) setDocuments(result.data.documents)
    })
    return () => {
      cancelled = true
    }
  }, [patientId])

  async function handleUploadDocument(documentId: string): Promise<void> {
    setUploadingDocumentId(documentId)
    setDocumentError(null)
    const result = await window.api.patients.documents.uploadFile(patientId, documentId)
    setUploadingDocumentId(null)
    if (result === null) return
    if (result.ok) {
      setDocuments((prev) => prev.map((d) => (d.id === documentId ? result.data.document : d)))
    } else {
      setDocumentError(result.error)
    }
  }

  async function handleViewDocument(documentId: string): Promise<void> {
    setViewingDocumentId(documentId)
    setDocumentError(null)
    try {
      await window.api.patients.documents.view(patientId, documentId)
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Impossible d'ouvrir le fichier.")
    }
    setViewingDocumentId(null)
  }

  async function handlePrint(): Promise<void> {
    setPrinting(true)
    setPrintError(null)
    try {
      await window.api.patients.print(patientId)
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : "Impossible de générer le document.")
    }
    setPrinting(false)
  }

  async function handleTogglePrescription(prescriptionId: string, active: boolean): Promise<void> {
    if (!dossier) return
    const result = await window.api.patients.updatePrescription(patientId, prescriptionId, { active })
    if (result.ok) {
      setDossier((prev) =>
        prev
          ? { ...prev, prescriptions: prev.prescriptions.map((p) => (p.id === prescriptionId ? result.data.prescription : p)) }
          : prev
      )
    }
  }

  if (loading) {
    return (
      <PulseLoader label="Chargement du dossier…" />
    )
  }

  if (notFound || !apiPatient) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-sm text-gray-500">
        Patient introuvable.
        <button onClick={onBack} className="mt-4 block text-accent-600 hover:text-accent-500">
          Retour à la liste des patients
        </button>
      </div>
    )
  }

  const patient = mergePatient(apiPatient)
  const consultations = dossier?.consultations ?? []
  const upcomingAppointments = dossier?.upcomingAppointments ?? []
  const vitals = dossier?.vitals ?? []
  const prescriptions = dossier?.prescriptions ?? []
  const results = dossier?.results ?? []
  const timeline = dossier?.timeline ?? []

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Accueil / Patients / Dossier patient
        </button>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Dossier patient</h1>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handlePrint} disabled={printing}>
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Imprimer
            </Button>
            <Button onClick={() => setShowEditModal(true)}>Modifier</Button>
          </div>
        </div>
        {printError && <p className="mt-2 text-right text-xs text-red-500">{printError}</p>}
      </div>

      {showEditModal && (
        <PatientFormModal
          editing={apiPatient}
          onClose={() => setShowEditModal(false)}
          onCreated={(updated) => {
            setApiPatient(updated)
            setShowEditModal(false)
          }}
        />
      )}

      {showAddVitalsModal && (
        <AddVitalsModal
          patientId={patientId}
          onClose={() => setShowAddVitalsModal(false)}
          onAdded={(newVitals) => {
            setDossier((prev) => (prev ? { ...prev, vitals: newVitals } : prev))
            setShowAddVitalsModal(false)
          }}
        />
      )}

      {showAddPrescriptionModal && (
        <AddPrescriptionModal
          patientId={patientId}
          onClose={() => setShowAddPrescriptionModal(false)}
          onAdded={(prescription) => {
            setDossier((prev) => (prev ? { ...prev, prescriptions: [prescription, ...prev.prescriptions] } : prev))
            setShowAddPrescriptionModal(false)
          }}
        />
      )}

      {showAddDocumentModal && (
        <PatientDocumentFormModal
          patientId={patientId}
          onClose={() => setShowAddDocumentModal(false)}
          onCreated={(document) => {
            setDocuments((prev) => [document, ...prev])
            setShowAddDocumentModal(false)
          }}
        />
      )}
      {deletingDocument && (
        <ConfirmDialog
          title="Supprimer le document"
          message={`Voulez-vous vraiment supprimer « ${deletingDocument.title} » ?`}
          onCancel={() => setDeletingDocument(null)}
          onConfirm={async () => {
            const result = await window.api.patients.documents.delete(patientId, deletingDocument.id)
            return result.ok ? { ok: true } : result
          }}
          onConfirmed={() => {
            setDocuments((prev) => prev.filter((d) => d.id !== deletingDocument.id))
            setDeletingDocument(null)
          }}
        />
      )}

      {/* Identité */}
      <Card className="bg-gradient-to-br from-surface to-accent-50/40">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full ring-4 ring-white">
              <PatientAvatar patient={patient} size="lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {patient.firstName} {patient.lastName}
                </h2>
                <BadgeCheck className="h-4 w-4 text-accent-500" />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                ID Patient : {patient.code} · <StatusBadge {...statusInfo(patient)} />
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {patient.age} ans · {patient.gender === 'M' ? 'Masculin' : 'Féminin'} · {patient.birthDate}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {patient.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {patient.email}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Droplet className="h-3.5 w-3.5" />
                  Groupe sanguin : <strong className="text-gray-700">{patient.bloodType}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Allergies : <strong className="text-gray-700">{patient.allergies}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoTile
              label="Assurance"
              value={patient.insuranceProvider}
              hint={`N° ${patient.insuranceNumber} · Expire : ${patient.insuranceExpiry}`}
            />
            <InfoTile label="Statut" value={patient.admissionType} hint={`Dernière visite : ${patient.lastVisit}`} />
            <InfoTile
              label="Contact d'urgence"
              value={patient.emergencyContact.name}
              hint={patient.emergencyContact.phone}
              icon={HeartHandshake}
            />
          </div>
        </div>
      </Card>

      <SortableGroup id="patientDetail.grid1" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-[15px] font-bold text-gray-900">Informations médicales clés</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Antécédents médicaux</p>
                {patient.medicalHistory.length === 0 ? (
                  <p className="text-sm text-gray-400">Non renseignés</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {patient.medicalHistory.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Antécédents familiaux</p>
                {patient.familyHistory.length === 0 ? (
                  <p className="text-sm text-gray-400">Non renseignés</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {patient.familyHistory.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                )}
                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Habitudes de vie</p>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  {patient.lifestyle.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-[15px] font-bold text-gray-900">Dernières consultations</h3>
            </div>
            {consultations.length === 0 ? (
              <EmptyState title="Aucune consultation enregistrée." />
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Service / Motif</th>
                    <th className="px-6 py-3 font-semibold">Médecin</th>
                    <th className="px-6 py-3 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-3 text-gray-600">
                        {formatFullDate(new Date(c.date))} — {formatTime(new Date(c.date))}
                      </td>
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{c.service ?? '—'}</p>
                        <p className="text-xs text-gray-400">{c.motive ?? '—'}</p>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{c.doctorName ?? '—'}</td>
                      <td className="px-6 py-3">
                        <StatusBadge label={CONSULTATION_STATUS_LABEL[c.status]} tone={consultationTone(c.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="text-[15px] font-bold text-gray-900">Ordonnances en cours</h3>
                <button
                  onClick={() => setShowAddPrescriptionModal(true)}
                  title="Ajouter une ordonnance"
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <RecordList
                items={prescriptions}
                emptyMessage="Aucune ordonnance active."
                keyFn={(p) => p.id}
                renderRow={(p) => (
                  <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-3.5 last:border-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${p.active ? 'bg-teal-500' : 'bg-gray-300'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.dosage}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{p.remainingDays}j restants</span>
                    <button
                      onClick={() => handleTogglePrescription(p.id, !p.active)}
                      title={p.active ? 'Arrêter le traitement' : 'Reprendre le traitement'}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    >
                      {p.active ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}
              />
              {prescriptions.length > 0 && (
                <div className="flex gap-2 border-t border-gray-100 p-4">
                  <Button variant="secondary" size="sm" className="flex-1">
                    <Download className="h-3.5 w-3.5" />
                    Télécharger
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="text-[15px] font-bold text-gray-900">Résultats récents</h3>
              </div>
              <RecordList
                items={results}
                emptyMessage="Aucun résultat disponible."
                keyFn={(r) => `${r.label}-${r.date}`}
                renderRow={(r) => (
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3.5 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{r.label}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                    </div>
                    <StatusBadge label={RESULT_STATUS_LABEL[r.status]} tone={resultTone(r.status)} />
                  </div>
                )}
              />
            </Card>
          </div>

          {timeline.length > 0 && (
            <Card>
              <h3 className="mb-4 text-[15px] font-bold text-gray-900">Historique médical (Chronologie)</h3>
              <div className="flex gap-6 overflow-x-auto pb-2">
                {timeline.map((event) => {
                  const Icon = TIMELINE_ICON[event.type]
                  return (
                    <div key={`${event.date}-${event.label}`} className="flex min-w-[110px] flex-col items-center text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-accent-200 bg-accent-50 text-accent-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-2 text-xs font-medium text-gray-900">{formatDate(event.date)}</p>
                      <p className="text-xs text-gray-500">{event.label}</p>
                      <p className="text-[11px] text-gray-400">{event.service ?? '—'}</p>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Colonne latérale */}
        <SortableGroup id="patientDetail.side1" className="space-y-6">
          <Card>
            <h3 className="mb-4 text-[15px] font-bold text-gray-900">Résumé du dossier</h3>
            <div className="flex items-center gap-4">
              <ProgressRing value={patient.recordCompleteness} />
              <div className="space-y-1 text-xs text-gray-500">
                <p>Informations personnelles</p>
                <p>Antécédents médicaux</p>
                <p>Examens récents</p>
                <p>Documents</p>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-[15px] font-bold text-gray-900">Signes vitaux récents</h3>
              <button
                onClick={() => setShowAddVitalsModal(true)}
                title="Enregistrer des constantes"
                className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <RecordList
              items={vitals}
              emptyMessage="Aucune donnée."
              keyFn={(v) => v.label}
              renderRow={(v) => (
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 last:border-0">
                  <span className="text-sm text-gray-600">{v.label}</span>
                  <span className="text-sm font-medium text-gray-900">{v.value}</span>
                </div>
              )}
            />
          </Card>

          <Card className="p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-[15px] font-bold text-gray-900">Prochains rendez-vous</h3>
            </div>
            <RecordList
              items={upcomingAppointments}
              emptyMessage="Aucun rendez-vous planifié."
              keyFn={(a) => a.id}
              renderRow={(a) => (
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3.5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatFullDate(new Date(a.date))} — {formatTime(new Date(a.date))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {a.service ?? '—'} · {a.doctorName ?? '—'}
                    </p>
                  </div>
                  <StatusBadge label={APPOINTMENT_STATUS_LABEL[a.status]} tone={appointmentTone(a.status)} />
                </div>
              )}
            />
          </Card>

          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-[15px] font-bold text-gray-900">Documents récents</h3>
              <button
                onClick={() => setShowAddDocumentModal(true)}
                title="Ajouter un document"
                className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {documentError && <p className="px-6 py-2 text-xs text-red-500">{documentError}</p>}
            <RecordList
              items={documents}
              emptyMessage="Aucun document."
              keyFn={(d) => d.id}
              renderRow={(d) => (
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-6 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {d.title}
                      {d.category && <span className="ml-1.5 text-xs font-normal text-gray-400">({d.category})</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(d.uploadedAt)} · {formatFileSize(d.fileSize)}
                      {!d.fileName && ' · Aucun fichier'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleViewDocument(d.id)}
                      disabled={!d.fileName || viewingDocumentId === d.id}
                      title={d.fileName ? `Voir ${d.fileName}` : 'Aucun fichier'}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {viewingDocumentId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleUploadDocument(d.id)}
                      disabled={uploadingDocumentId === d.id}
                      title={d.fileName ? 'Remplacer le fichier' : 'Téléverser un fichier'}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      {uploadingDocumentId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setDeletingDocument(d)}
                      title="Supprimer"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            />
          </Card>
        </SortableGroup>
      </SortableGroup>
    </div>
  )
}

function InfoTile({
  label,
  value,
  hint,
  tone,
  icon: Icon = Pill
}: {
  label: string
  value: string
  hint?: string
  tone?: StatusTone
  icon?: typeof Pill
}): JSX.Element {
  return (
    <div className="rounded-lg border border-gray-100 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={`mt-1 text-sm font-semibold ${tone === 'success' ? 'text-teal-600' : 'text-gray-900'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

/** Réduit le motif "liste ou état vide" répété par les sections de la colonne latérale
 * (ordonnances, résultats, signes vitaux, rendez-vous, documents) — chaque section garde
 * son propre rendu de ligne via `renderRow`, seul le branchement vide/liste est mutualisé. */
function RecordList<T>({
  items,
  emptyMessage,
  keyFn,
  renderRow
}: {
  items: T[]
  emptyMessage: string
  keyFn: (item: T) => string
  renderRow: (item: T) => ReactNode
}): JSX.Element {
  if (items.length === 0) {
    return <p className="px-6 py-8 text-center text-sm text-gray-400">{emptyMessage}</p>
  }
  return (
    <div>
      {items.map((item) => (
        <div key={keyFn(item)}>{renderRow(item)}</div>
      ))}
    </div>
  )
}
