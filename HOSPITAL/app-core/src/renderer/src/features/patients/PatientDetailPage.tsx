import type { ReactNode } from 'react'
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
  ScanLine,
  Siren,
  Syringe,
  Eye,
  Pill,
  Download
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ProgressRing } from '@renderer/components/ProgressRing'
import { Button } from '@renderer/components/Button'
import { MOCK_PATIENTS } from './mock-data'
import { PatientAvatar } from './PatientAvatar'
import { statusInfo, resultTone, consultationTone } from './status'
import type { TimelineEvent } from './types'

interface PatientDetailPageProps {
  patientId: string
  onBack: () => void
}

const TIMELINE_ICON: Record<TimelineEvent['type'], typeof Stethoscope> = {
  consultation: Stethoscope,
  exam: FlaskConical,
  emergency: Siren,
  vaccination: Syringe,
  admission: ScanLine
}

export function PatientDetailPage({ patientId, onBack }: PatientDetailPageProps): JSX.Element {
  const patient = MOCK_PATIENTS.find((p) => p.id === patientId)

  if (!patient) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-sm text-gray-500">
        Patient introuvable.
        <button onClick={onBack} className="mt-4 block text-accent-600 hover:text-accent-500">
          Retour à la liste des patients
        </button>
      </div>
    )
  }

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
            <Button variant="secondary">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button>Actions</Button>
          </div>
        </div>
      </div>

      {/* Identité */}
      <Card className="bg-gradient-to-br from-white to-accent-50/40">
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoTile
              label="Assurance"
              value={patient.insuranceProvider}
              hint={`N° ${patient.insuranceNumber} · Expire : ${patient.insuranceExpiry}`}
            />
            <InfoTile label="Statut" value={patient.admissionType} hint={`Dernière visite : ${patient.lastVisit}`} />
            <InfoTile label="Solde patient" value={`${patient.balance} FCFA`} hint="À jour" tone="success" />
            <InfoTile
              label="Contact d'urgence"
              value={patient.emergencyContact.name}
              hint={patient.emergencyContact.phone}
              icon={HeartHandshake}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Informations médicales clés</h3>
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
              <h3 className="text-sm font-semibold text-gray-900">Dernières consultations</h3>
            </div>
            {patient.consultations.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune consultation enregistrée.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-2.5 font-medium">Date</th>
                    <th className="px-6 py-2.5 font-medium">Service / Motif</th>
                    <th className="px-6 py-2.5 font-medium">Médecin</th>
                    <th className="px-6 py-2.5 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.consultations.map((c) => (
                    <tr key={`${c.date}-${c.time}`} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-3 text-gray-600">
                        {c.date} — {c.time}
                      </td>
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{c.service}</p>
                        <p className="text-xs text-gray-400">{c.motive}</p>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{c.doctor}</td>
                      <td className="px-6 py-3">
                        <StatusBadge label={c.status} tone={consultationTone(c.status)} />
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
                <h3 className="text-sm font-semibold text-gray-900">Ordonnances en cours</h3>
              </div>
              <RecordList
                items={patient.prescriptions}
                emptyMessage="Aucune ordonnance active."
                keyFn={(p) => p.name}
                renderRow={(p) => (
                  <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-3.5 last:border-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.dosage}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{p.remainingDays}j restants</span>
                  </div>
                )}
              />
              {patient.prescriptions.length > 0 && (
                <div className="flex gap-2 border-t border-gray-100 p-4">
                  <Button size="sm" className="flex-1">
                    Renouveler
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1">
                    <Download className="h-3.5 w-3.5" />
                    Télécharger
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Résultats récents</h3>
              </div>
              <RecordList
                items={patient.results}
                emptyMessage="Aucun résultat disponible."
                keyFn={(r) => r.label}
                renderRow={(r) => (
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3.5 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{r.label}</p>
                      <p className="text-xs text-gray-400">{r.date}</p>
                    </div>
                    <StatusBadge label={r.value} tone={resultTone(r.status)} />
                  </div>
                )}
              />
            </Card>
          </div>

          {patient.timeline.length > 0 && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Historique médical (Chronologie)</h3>
              <div className="flex gap-6 overflow-x-auto pb-2">
                {patient.timeline.map((event) => {
                  const Icon = TIMELINE_ICON[event.type]
                  return (
                    <div key={`${event.date}-${event.label}`} className="flex min-w-[110px] flex-col items-center text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-accent-200 bg-accent-50 text-accent-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-2 text-xs font-medium text-gray-900">{event.date}</p>
                      <p className="text-xs text-gray-500">{event.label}</p>
                      <p className="text-[11px] text-gray-400">{event.service}</p>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Résumé du dossier</h3>
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
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Signes vitaux récents</h3>
            </div>
            <RecordList
              items={patient.vitals}
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
              <h3 className="text-sm font-semibold text-gray-900">Prochains rendez-vous</h3>
            </div>
            <RecordList
              items={patient.upcomingAppointments}
              emptyMessage="Aucun rendez-vous planifié."
              keyFn={(a) => `${a.date}-${a.time}`}
              renderRow={(a) => (
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3.5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {a.date} — {a.time}
                    </p>
                    <p className="text-xs text-gray-500">
                      {a.service} · {a.doctor}
                    </p>
                  </div>
                  <StatusBadge label={a.status} tone={a.status === 'Confirmé' ? 'success' : 'warning'} />
                </div>
              )}
            />
          </Card>

          <Card className="p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Documents récents</h3>
            </div>
            <RecordList
              items={patient.documents}
              emptyMessage="Aucun document."
              keyFn={(d) => d.name}
              renderRow={(d) => (
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-400">
                      {d.date} · {d.size}
                    </p>
                  </div>
                  <Eye className="h-4 w-4 shrink-0 text-gray-400" />
                </div>
              )}
            />
          </Card>
        </div>
      </div>
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
      <p className={`mt-1 text-sm font-semibold ${tone === 'success' ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</p>
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
