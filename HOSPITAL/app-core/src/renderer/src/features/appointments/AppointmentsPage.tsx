import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Phone,
  RotateCcw,
  Pencil,
  X,
  MoreHorizontal,
  MessageSquare,
  CheckCircle2,
  Users,
  CalendarCheck,
  Hourglass,
  BadgeCheck,
  CalendarX,
  Loader2,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiAppointment, ApiAppointmentStatus, ApiAppointmentType } from '@shared/appointment-types'
import { CALENDAR_HOURS } from './mock-data'
import { appointmentStatusTone, appointmentTypeStyle, APPOINTMENT_TYPES } from './status'
import type { Appointment, AppointmentStatus, AppointmentType } from './types'
import { addDays, dayIndexInWeek, formatDayLabel, formatFullDate, formatTime, isSameDay, mondayOf } from './week'
import { AppointmentFormModal } from './AppointmentFormModal'

interface AppointmentsPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'upcoming' | 'waiting' | 'cancelled' | 'past'

const STATUS_LABEL: Record<ApiAppointmentStatus, AppointmentStatus> = {
  CONFIRME: 'Confirmé',
  EN_ATTENTE: 'En attente',
  ANNULE: 'Annulé',
  TERMINE: 'Terminé'
}

const TYPE_LABEL: Record<ApiAppointmentType, AppointmentType> = {
  CONSULTATION: 'Consultation',
  SUIVI: 'Suivi',
  EXAMEN: 'Examen',
  RESULTAT: 'Résultat',
  CHIRURGIE: 'Chirurgie',
  CAMPAGNE: 'Campagne',
  AUTRE: 'Autre'
}

function toAppointment(a: ApiAppointment): Appointment {
  return {
    id: a.id,
    patientId: a.patientId,
    patientName: a.patientName ?? 'Patient',
    patientCode: a.patientCode,
    patientPhone: a.patientPhone,
    age: a.age,
    date: new Date(a.date),
    durationMin: a.durationMin,
    service: a.service ?? '—',
    doctorId: a.doctorId,
    doctorName: a.doctorName ?? '—',
    room: a.room ?? '—',
    type: TYPE_LABEL[a.type],
    motive: a.motive ?? '—',
    status: STATUS_LABEL[a.status],
    reminder: a.reminder
  }
}

const FILTER_FIELDS = [
  { label: 'Période', value: 'Semaine' },
  { label: 'Service', value: 'Tous les services' },
  { label: 'Médecin', value: 'Tous les médecins' },
  { label: 'Statut', value: 'Tous les statuts' },
  { label: 'Type de rendez-vous', value: 'Tous les types' }
]

export function AppointmentsPage({ onOpenPatient }: AppointmentsPageProps): JSX.Element {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.appointments.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setAppointments(result.data.appointments.map(toAppointment))
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const today = useMemo(() => new Date(), [])
  const realMonday = useMemo(() => mondayOf(today), [today])
  const monday = useMemo(() => addDays(realMonday, weekOffset * 7), [realMonday, weekOffset])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday])

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => isSameDay(a.date, today))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [appointments, today]
  )
  const waitingAppointments = useMemo(() => appointments.filter((a) => a.status === 'En attente'), [appointments])
  const cancelledAppointments = useMemo(() => appointments.filter((a) => a.status === 'Annulé'), [appointments])
  const pastAppointments = useMemo(() => appointments.filter((a) => a.status === 'Terminé'), [appointments])

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Liste des rendez-vous', count: todayAppointments.length },
    { id: 'waiting', label: "Liste d'attente", count: waitingAppointments.length },
    { id: 'cancelled', label: 'Rendez-vous annulés', count: cancelledAppointments.length },
    { id: 'past', label: 'Rendez-vous passés', count: pastAppointments.length }
  ]

  const TAB_ROWS: Record<Tab, Appointment[]> = {
    upcoming: todayAppointments,
    waiting: waitingAppointments,
    cancelled: cancelledAppointments,
    past: pastAppointments
  }

  const rows = TAB_ROWS[activeTab]
  const selected = appointments.find((a) => a.id === selectedId) ?? todayAppointments[0] ?? appointments[0] ?? null

  const weekAppointments = useMemo(
    () => appointments.filter((a) => dayIndexInWeek(realMonday, a.date) >= 0 && dayIndexInWeek(realMonday, a.date) < 7),
    [appointments, realMonday]
  )
  const completionRate =
    pastAppointments.length + cancelledAppointments.length === 0
      ? null
      : Math.round((pastAppointments.length / (pastAppointments.length + cancelledAppointments.length)) * 100)

  async function handleDropOnSlot(day: Date, hour: string): Promise<void> {
    setDragOverCell(null)
    const movedId = draggingId
    setDraggingId(null)
    if (!movedId) return

    const occupant = appointments.find((a) => isSameDay(a.date, day) && formatTime(a.date) === hour)
    if (occupant && occupant.id !== movedId) {
      setMoveError('Ce créneau est déjà occupé — choisissez un autre horaire.')
      return
    }

    const moved = appointments.find((a) => a.id === movedId)
    if (!moved) return

    const [hours, minutes] = hour.split(':').map(Number)
    const newDate = new Date(day)
    newDate.setHours(hours, minutes, 0, 0)
    if (isSameDay(newDate, moved.date) && formatTime(newDate) === formatTime(moved.date)) return

    setMoveError(null)
    const previousDate = moved.date
    // Mise à jour optimiste — le glisser-déposer doit sembler instantané, on annule si le serveur refuse.
    setAppointments((prev) => prev.map((a) => (a.id === movedId ? { ...a, date: newDate } : a)))

    const result = await window.api.appointments.update(movedId, { date: newDate.toISOString() })
    if (!result.ok) {
      setAppointments((prev) => prev.map((a) => (a.id === movedId ? { ...a, date: previousDate } : a)))
      setMoveError(result.error)
    }
  }

  async function handleCancelAppointment(appointmentId: string): Promise<void> {
    setCancelling(true)
    const result = await window.api.appointments.update(appointmentId, { status: 'ANNULE' })
    setCancelling(false)
    if (result.ok) {
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? toAppointment(result.data.appointment) : a)))
    } else {
      setMoveError(result.error)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Rendez-vous']}
        title="Rendez-vous"
        subtitle="Planifiez, suivez et gérez tous les rendez-vous de l'établissement."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nouveau rendez-vous
          </Button>
        }
      />

      {showCreateModal && (
        <AppointmentFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(appointment) => {
            setAppointments((prev) => [...prev, toAppointment(appointment)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingAppointment && (
        <AppointmentFormModal
          editing={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onCreated={(appointment) => {
            setAppointments((prev) => prev.map((a) => (a.id === appointment.id ? toAppointment(appointment) : a)))
            setEditingAppointment(null)
          }}
        />
      )}

      {deletingAppointment && (
        <ConfirmDialog
          title="Supprimer le rendez-vous"
          message={`Voulez-vous vraiment supprimer le rendez-vous de ${deletingAppointment.patientName} du ${formatFullDate(deletingAppointment.date)} ?`}
          onCancel={() => setDeletingAppointment(null)}
          onConfirm={() => window.api.appointments.delete(deletingAppointment.id)}
          onConfirmed={() => {
            setAppointments((prev) => prev.filter((a) => a.id !== deletingAppointment.id))
            setSelectedId(null)
            setDeletingAppointment(null)
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des rendez-vous…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <CalendarCheck className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{todayAppointments.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Cette semaine</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{weekAppointments.length}</p>
            </Card>
            <Card className="border-t-4 border-t-amber-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Hourglass className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{waitingAppointments.length}</p>
              <p className="text-xs text-gray-400">Patients en liste d&apos;attente</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Consultations honorées</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{completionRate === null ? '—' : `${completionRate}%`}</p>
              <p className="text-xs text-gray-400">Taux de réalisation</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <CalendarX className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Rendez-vous annulés</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{cancelledAppointments.length}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Calendrier */}
            <Card className="p-0 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Calendrier</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-gray-200">
                    <button
                      onClick={() => setWeekOffset((w) => w - 1)}
                      className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setWeekOffset(0)}
                      className="border-x border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Aujourd&apos;hui
                    </button>
                    <button
                      onClick={() => setWeekOffset((w) => w + 1)}
                      className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatFullDate(monday)} – {formatFullDate(weekDays[6])}
                  </span>
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="overflow-x-auto p-4">
                <div className="grid min-w-[640px] grid-cols-[56px_repeat(7,1fr)]">
                  <div />
                  {weekDays.map((day, index) => {
                    const isToday = weekOffset === 0 && isSameDay(day, today)
                    return (
                      <div
                        key={index}
                        className={
                          'flex flex-col items-center gap-1 border-b-2 pb-2 text-xs font-medium ' +
                          (isToday ? 'border-accent-500 text-accent-700' : 'border-transparent text-gray-500')
                        }
                      >
                        {formatDayLabel(day)}
                        {isToday && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[11px] font-semibold text-white">
                            {day.getDate()}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {CALENDAR_HOURS.map((hour) => (
                    <Fragment key={hour}>
                      <div className="border-t border-gray-100 py-2 pr-2 text-right text-[11px] text-gray-400">{hour}</div>
                      {weekDays.map((day, dayIndex) => {
                        const appt = appointments.find((a) => isSameDay(a.date, day) && formatTime(a.date) === hour)
                        const isToday = weekOffset === 0 && isSameDay(day, today)
                        const cellKey = `${hour}-${dayIndex}`
                        const isDragOver = dragOverCell === cellKey
                        return (
                          <div
                            key={cellKey}
                            onDragOver={(e) => {
                              e.preventDefault()
                              if (dragOverCell !== cellKey) setDragOverCell(cellKey)
                            }}
                            onDragLeave={() => setDragOverCell((prev) => (prev === cellKey ? null : prev))}
                            onDrop={(e) => {
                              e.preventDefault()
                              handleDropOnSlot(day, hour)
                            }}
                            className={
                              'min-h-[46px] border-t border-l border-gray-100 p-0.5 transition-colors ' +
                              (isDragOver ? 'bg-accent-100' : isToday ? 'bg-accent-50/30' : '')
                            }
                          >
                            {appt && (
                              <button
                                draggable
                                onDragStart={() => setDraggingId(appt.id)}
                                onDragEnd={() => {
                                  setDraggingId(null)
                                  setDragOverCell(null)
                                }}
                                onClick={() => setSelectedId(appt.id)}
                                title="Glisser pour déplacer ce rendez-vous"
                                className={`w-full cursor-grab rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight transition-shadow hover:shadow-sm active:cursor-grabbing ${appointmentTypeStyle(appt.type).block} ${
                                  selected?.id === appt.id ? 'ring-2 ring-accent-500' : ''
                                } ${draggingId === appt.id ? 'opacity-40' : ''}`}
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

              {moveError && (
                <div className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                  <span>{moveError}</span>
                  <button onClick={() => setMoveError(null)} className="shrink-0 text-red-400 hover:text-red-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

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

              {selected && (
                <Card className="p-0">
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-900">Rendez-vous sélectionné</h3>
                    <StatusBadge label={selected.status} tone={appointmentStatusTone(selected.status)} />
                  </div>
                  <div className="p-5">
                    <p className="text-base font-semibold text-gray-900">{selected.patientName}</p>
                    {selected.patientId && (
                      <>
                        <p className="mt-0.5 text-xs text-gray-500">
                          ID Patient : {selected.patientCode} · {selected.age} ans
                        </p>
                        {selected.patientPhone && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="h-3 w-3" />
                            {selected.patientPhone}
                          </p>
                        )}
                      </>
                    )}

                    <dl className="mt-4 space-y-2.5 text-xs">
                      <Row label="Date & heure" value={`${formatFullDate(selected.date)} — ${formatTime(selected.date)}`} />
                      <Row label="Service" value={selected.service} />
                      <Row label="Médecin" value={selected.doctorName} />
                      <Row label="Type" value={selected.type} />
                      <Row label="Durée" value={`${selected.durationMin} minutes`} />
                      <Row label="Lieu" value={selected.room} />
                      <Row label="Motif" value={selected.motive} />
                    </dl>

                    <Button
                      className="mt-5 w-full"
                      disabled={!selected.patientId}
                      onClick={() => selected.patientId && onOpenPatient(selected.patientId)}
                    >
                      Voir le dossier patient
                    </Button>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditingAppointment(selected)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={cancelling || selected.status === 'Annulé'}
                        onClick={() => handleCancelAppointment(selected.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                        {selected.status === 'Annulé' ? 'Déjà annulé' : 'Annuler'}
                      </Button>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setDeletingAppointment(selected)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                    <p className="mt-2 text-center text-[11px] text-gray-400">
                      Astuce : glissez-déposez le rendez-vous dans le calendrier pour le déplacer.
                    </p>
                    <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      Autres actions
                    </button>
                  </div>
                </Card>
              )}

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="text-sm font-semibold text-gray-900">Rappels & Notifications</h3>
                </div>
                <div className="p-5">
                  {selected?.reminder ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{selected.reminder}</p>
                        <p className="text-xs text-gray-400">Rendez-vous du {formatFullDate(selected.date)}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-400">Aucun rappel pour le rendez-vous sélectionné.</p>
                  )}
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
                      onClick={() => setSelectedId(appt.id)}
                      className={
                        'cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 ' +
                        (selected?.id === appt.id ? 'bg-accent-50/50' : '')
                      }
                    >
                      <td className="px-6 py-3.5 font-medium text-gray-900">{formatTime(appt.date)}</td>
                      <td className="px-6 py-3.5 text-gray-900">{appt.patientName}</td>
                      <td className="px-6 py-3.5 text-gray-600">{appt.age ? `${appt.age} ans` : '—'}</td>
                      <td className="px-6 py-3.5 text-gray-600">{appt.service}</td>
                      <td className="px-6 py-3.5 text-gray-600">{appt.doctorName}</td>
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
              {appointments.length} rendez-vous au total dans l&apos;établissement.
            </div>
          </Card>
        </>
      )}
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
