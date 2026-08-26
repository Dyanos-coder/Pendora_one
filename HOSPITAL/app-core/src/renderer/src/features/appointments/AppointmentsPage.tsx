import { Fragment, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Phone,
  RotateCcw,
  Pencil,
  X,
  ArrowLeftRight,
  MoreHorizontal,
  MessageSquare,
  Mail,
  PhoneCall,
  CheckCircle2,
  Users,
  CalendarCheck,
  Hourglass,
  BadgeCheck,
  CalendarX
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { MOCK_PATIENTS } from '@renderer/features/patients/mock-data'
import { WEEK_DAYS, TODAY_INDEX, TODAY_LABEL, CALENDAR_HOURS, MOCK_APPOINTMENTS, MOCK_TODAY_LIST, MOCK_CANCELLED } from './mock-data'
import { appointmentStatusTone, appointmentTypeStyle, APPOINTMENT_TYPES } from './status'
import type { Appointment } from './types'

interface AppointmentsPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'upcoming' | 'waiting' | 'cancelled' | 'past'

const PAST_APPOINTMENTS = MOCK_APPOINTMENTS.filter((a) => a.status === 'Terminé')
const WAITING_APPOINTMENTS = MOCK_TODAY_LIST.filter((a) => a.status === 'En attente')

const TABS: { id: Tab; label: string; count: number }[] = [
  { id: 'upcoming', label: 'Liste des rendez-vous', count: MOCK_TODAY_LIST.length },
  { id: 'waiting', label: "Liste d'attente", count: 56 },
  { id: 'cancelled', label: 'Rendez-vous annulés', count: 18 },
  { id: 'past', label: 'Rendez-vous passés', count: PAST_APPOINTMENTS.length }
]

const TAB_ROWS: Record<Tab, Appointment[]> = {
  upcoming: MOCK_TODAY_LIST,
  waiting: WAITING_APPOINTMENTS,
  cancelled: MOCK_CANCELLED,
  past: PAST_APPOINTMENTS
}

const FILTER_FIELDS = [
  { label: 'Période', value: 'Semaine' },
  { label: 'Date', value: '21/05/2025' },
  { label: 'Service', value: 'Tous les services' },
  { label: 'Médecin', value: 'Tous les médecins' },
  { label: 'Statut', value: 'Tous les statuts' },
  { label: 'Type de rendez-vous', value: 'Tous les types' }
]

export function AppointmentsPage({ onOpenPatient }: AppointmentsPageProps): JSX.Element {
  const [selected, setSelected] = useState<Appointment>(MOCK_TODAY_LIST[0])
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')

  const rows = TAB_ROWS[activeTab]
  const linkedPatient = MOCK_PATIENTS.find((p) => p.id === selected.patientId)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Rendez-vous']}
        title="Rendez-vous"
        subtitle="Planifiez, suivez et gérez tous les rendez-vous de l'établissement."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Nouveau rendez-vous
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-t-4 border-t-violet-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <CalendarCheck className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Aujourd&apos;hui</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">124</p>
            <span className="text-xs font-medium text-emerald-600">↑ 12% vs hier</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-blue-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <CalendarDays className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Cette semaine</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">842</p>
            <span className="text-xs font-medium text-emerald-600">↑ 15% vs sem. passée</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-amber-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
            <Hourglass className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">En attente</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">56</p>
          <p className="text-xs text-gray-400">Patients en liste d&apos;attente</p>
        </Card>
        <Card className="border-t-4 border-t-emerald-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <BadgeCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Consultations honorées</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">92%</p>
          <p className="text-xs text-gray-400">Taux de réalisation</p>
        </Card>
        <Card className="border-t-4 border-t-red-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
            <CalendarX className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Rendez-vous annulés</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">18</p>
            <span className="text-xs font-medium text-red-600">↑ 4% vs sem. passée</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendrier */}
        <Card className="p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Calendrier</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-gray-200">
                <button className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button className="border-x border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Aujourd&apos;hui
                </button>
                <button className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-sm font-semibold text-gray-900">{TODAY_LABEL}</span>
              <CalendarDays className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            <div className="grid min-w-[640px] grid-cols-[56px_repeat(7,1fr)]">
              <div />
              {WEEK_DAYS.map((day, index) => (
                <div
                  key={day.label}
                  className={
                    'flex flex-col items-center gap-1 border-b-2 pb-2 text-xs font-medium ' +
                    (index === TODAY_INDEX ? 'border-accent-500 text-accent-700' : 'border-transparent text-gray-500')
                  }
                >
                  {day.label}
                  {index === TODAY_INDEX && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[11px] font-semibold text-white">
                      21
                    </span>
                  )}
                </div>
              ))}

              {CALENDAR_HOURS.map((hour) => (
                <Fragment key={hour}>
                  <div className="border-t border-gray-100 py-2 pr-2 text-right text-[11px] text-gray-400">
                    {hour}
                  </div>
                  {WEEK_DAYS.map((_, dayIndex) => {
                    const appt = MOCK_APPOINTMENTS.find((a) => a.dayIndex === dayIndex && a.time === hour)
                    return (
                      <div
                        key={`${hour}-${dayIndex}`}
                        className={
                          'min-h-[46px] border-t border-l border-gray-100 p-0.5 ' +
                          (dayIndex === TODAY_INDEX ? 'bg-accent-50/30' : '')
                        }
                      >
                        {appt && (
                          <button
                            onClick={() => setSelected(appt)}
                            className={`w-full rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight transition-shadow hover:shadow-sm ${appointmentTypeStyle(appt.type).block} ${
                              selected.id === appt.id ? 'ring-2 ring-accent-500' : ''
                            }`}
                          >
                            <p className="truncate font-medium">{appt.patientName}</p>
                            <p className="truncate opacity-80">{appt.type}</p>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100 px-6 py-3">
            {APPOINTMENT_TYPES.map((type) => (
              <span key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`h-2 w-2 rounded-full ${appointmentTypeStyle(type).dot}`} />
                {type}
              </span>
            ))}
          </div>
        </Card>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Filtres</h3>
            <div className="space-y-3">
              {FILTER_FIELDS.map((field) => (
                <div key={field.label}>
                  <label className="mb-1 block text-xs font-medium text-gray-500">{field.label}</label>
                  <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none">
                    <option>{field.value}</option>
                  </select>
                </div>
              ))}
              <Button variant="secondary" size="sm" className="w-full">
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser les filtres
              </Button>
            </div>
          </Card>

          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Rendez-vous sélectionné</h3>
              <StatusBadge label={selected.status} tone={appointmentStatusTone(selected.status)} />
            </div>
            <div className="p-5">
              <p className="text-base font-semibold text-gray-900">{selected.patientName}</p>
              {linkedPatient && (
                <>
                  <p className="mt-0.5 text-xs text-gray-500">
                    ID Patient : {linkedPatient.code} · {selected.age} ans
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone className="h-3 w-3" />
                    {linkedPatient.phone}
                  </p>
                </>
              )}

              <dl className="mt-4 space-y-2.5 text-xs">
                <Row label="Date & heure" value={`${TODAY_LABEL.replace('21', String(19 + selected.dayIndex))} — ${selected.time}`} />
                <Row label="Service" value={selected.service} />
                <Row label="Médecin" value={selected.doctor} />
                <Row label="Type" value={selected.type} />
                <Row label="Durée" value={`${selected.durationMin} minutes`} />
                <Row label="Lieu" value={selected.room} />
                <Row label="Motif" value={selected.motive} />
                {selected.reminder && <Row label="Rappel" value={selected.reminder} />}
              </dl>

              <Button
                className="mt-5 w-full"
                disabled={!selected.patientId}
                onClick={() => selected.patientId && onOpenPatient(selected.patientId)}
              >
                Voir le dossier patient
              </Button>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Button variant="secondary" size="sm">
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </Button>
                <Button variant="secondary" size="sm">
                  <X className="h-3.5 w-3.5" />
                  Annuler
                </Button>
                <Button variant="secondary" size="sm">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Déplacer
                </Button>
              </div>
              <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                <MoreHorizontal className="h-3.5 w-3.5" />
                Autres actions
              </button>
            </div>
          </Card>

          <Card className="p-0">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Rappels & Notifications</h3>
            </div>
            <div className="space-y-3 p-5">
              <Reminder icon={MessageSquare} label="SMS envoyé" date="20/05/2025 · 10:30" />
              <Reminder icon={Mail} label="Email envoyé" date="20/05/2025 · 10:31" />
              <Reminder icon={PhoneCall} label="Appel effectué" date="20/05/2025 · 10:40" />
            </div>
          </Card>
        </div>
      </div>

      {/* Liste */}
      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 px-4 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                'rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' +
                (activeTab === tab.id
                  ? 'border-accent-500 text-accent-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800')
              }
            >
              {tab.label} <span className="text-xs text-gray-400">({tab.count})</span>
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun rendez-vous dans cette catégorie.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Heure</th>
                <th className="px-6 py-2.5 font-medium">Patient</th>
                <th className="px-6 py-2.5 font-medium">Âge</th>
                <th className="px-6 py-2.5 font-medium">Service</th>
                <th className="px-6 py-2.5 font-medium">Médecin</th>
                <th className="px-6 py-2.5 font-medium">Type</th>
                <th className="px-6 py-2.5 font-medium">Motif</th>
                <th className="px-6 py-2.5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((appt) => (
                <tr
                  key={appt.id}
                  onClick={() => setSelected(appt)}
                  className={
                    'cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 ' +
                    (selected.id === appt.id ? 'bg-accent-50/50' : '')
                  }
                >
                  <td className="px-6 py-3.5 font-medium text-gray-900">{appt.time}</td>
                  <td className="px-6 py-3.5 text-gray-900">{appt.patientName}</td>
                  <td className="px-6 py-3.5 text-gray-600">{appt.age > 0 ? `${appt.age} ans` : '—'}</td>
                  <td className="px-6 py-3.5 text-gray-600">{appt.service}</td>
                  <td className="px-6 py-3.5 text-gray-600">{appt.doctor}</td>
                  <td className="px-6 py-3.5 text-gray-600">{appt.type}</td>
                  <td className="px-6 py-3.5 text-gray-600">{appt.motive}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge label={appt.status} tone={appointmentStatusTone(appt.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex items-center gap-2 border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
          <Users className="h-3.5 w-3.5" />
          Données de démonstration — filtres, pagination et création de rendez-vous seront
          étoffés avec la spécification du module Rendez-vous.
        </div>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  )
}

function Reminder({ icon: Icon, label, date }: { icon: typeof Mail; label: string; date: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{date}</p>
      </div>
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
    </div>
  )
}
