import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
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
  Users,
  CalendarCheck,
  Hourglass,
  BadgeCheck,
  CalendarX,
  Trash2,
  Maximize2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { Modal } from '@renderer/components/Modal'
import type { ApiAppointment, ApiAppointmentStatus, ApiAppointmentType } from '@shared/appointment-types'
import { CALENDAR_HOURS } from './mock-data'
import { appointmentStatusTone, appointmentTypeStyle, APPOINTMENT_TYPES } from './status'
import type { Appointment, AppointmentStatus, AppointmentType } from './types'
import { addDays, dayIndexInWeek, formatDayLabel, formatFullDate, formatTime, isSameDay, mondayOf } from './week'
import { AppointmentFormModal } from './AppointmentFormModal'
import type { Session } from '@shared/auth-types'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader } from '@renderer/components/ui/Feedback'

interface AppointmentsPageProps {
  onOpenPatient: (patientId: string) => void
  session: Session
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

const ALL_FILTER = '__all__'
type PeriodFilter = 'all' | 'today' | 'week' | 'month'

export function AppointmentsPage({ onOpenPatient, session }: AppointmentsPageProps): JSX.Element {
  // Un médecin ne doit pouvoir programmer/déplacer que ses propres rendez-vous (demande
  // explicite) — les autres rôles gardent un accès complet. `myDoctorId` est `null` pour un
  // médecin dont le compte n'est rattaché à aucune fiche employé (cas limite, voir §auth-types).
  const isDoctor = session.user.role === 'MEDECIN'
  const myDoctorId = session.user.employeeId
  function canManage(appt: Appointment): boolean {
    return !isDoctor || appt.doctorId === myDoctorId
  }
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  // Vue agrandie (demande explicite) : plusieurs médecins peuvent avoir un rendez-vous au même
  // horaire — la grille compacte n'a pas la place d'afficher confortablement plusieurs cartes par
  // créneau. Cette vue réutilise exactement le même état/les mêmes gestionnaires (glisser-déposer,
  // navigation de semaine...) à une taille de cellule plus grande.
  const [expanded, setExpanded] = useState(false)
  // Navigation automatique de semaine pendant un glisser-déposer : aucune fenêtre de taille fixe
  // (même 2 semaines) ne peut éliminer le cas où le rendez-vous cible tombe hors champ (ex. le
  // dernier dimanche visible vers le lundi suivant) — la vraie solution est de faire défiler le
  // calendrier PENDANT le glisser, sans le relâcher, aussi loin que nécessaire. Survoler la bordure
  // gauche/droite de la grille (zone large, voir `renderEdgeNavZone`) déclenche un premier saut de
  // semaine après un court délai, puis continue automatiquement tant que le survol dure.
  const weekNavHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [weekNavPending, setWeekNavPending] = useState<1 | -1 | null>(null)
  function handleWeekNavDragEnter(direction: 1 | -1): void {
    setWeekNavPending(direction)
    if (weekNavHoverTimer.current) return
    const advance = (): void => {
      setWeekOffset((w) => w + direction)
      weekNavHoverTimer.current = setTimeout(advance, 900)
    }
    weekNavHoverTimer.current = setTimeout(advance, 600)
  }
  function clearWeekNavHover(): void {
    setWeekNavPending(null)
    if (weekNavHoverTimer.current) {
      clearTimeout(weekNavHoverTimer.current)
      weekNavHoverTimer.current = null
    }
  }

  // Zone de survol large (toute la hauteur de la grille, pas juste les petites flèches ◀/▶) pour
  // déclencher la navigation ci-dessus — n'existe dans le DOM que pendant un glisser actif
  // (`draggingId`), pour ne jamais gêner les clics normaux le reste du temps.
  function renderEdgeNavZone(direction: 1 | -1): JSX.Element | null {
    if (!draggingId) return null
    const isPending = weekNavPending === direction
    return (
      <div
        onDragEnter={() => handleWeekNavDragEnter(direction)}
        onDragLeave={clearWeekNavHover}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          clearWeekNavHover()
        }}
        title={direction === -1 ? 'Maintenir ici pour reculer, semaine par semaine' : 'Maintenir ici pour avancer, semaine par semaine'}
        className={`absolute top-0 bottom-0 z-10 flex w-12 items-center justify-center rounded-lg transition-colors ${
          direction === -1 ? 'left-0' : 'right-0'
        } ${isPending ? 'bg-accent-200/80' : 'bg-accent-50/50'}`}
      >
        {direction === -1 ? (
          <ChevronLeft className={`h-5 w-5 text-accent-700 ${isPending ? 'animate-pulse' : ''}`} />
        ) : (
          <ChevronRight className={`h-5 w-5 text-accent-700 ${isPending ? 'animate-pulse' : ''}`} />
        )}
      </div>
    )
  }
  const [moveError, setMoveError] = useState<string | null>(null)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null)
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('all')
  const [filterService, setFilterService] = useState(ALL_FILTER)
  const [filterDoctor, setFilterDoctor] = useState(ALL_FILTER)
  const [filterStatus, setFilterStatus] = useState(ALL_FILTER)
  const [filterType, setFilterType] = useState(ALL_FILTER)

  useEffect(() => {
    return () => {
      if (weekNavHoverTimer.current) clearTimeout(weekNavHoverTimer.current)
    }
  }, [])

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

  const serviceOptions = useMemo(
    () => Array.from(new Set(appointments.map((a) => a.service).filter((s) => s && s !== '—'))).sort(),
    [appointments]
  )
  const doctorOptions = useMemo(
    () => Array.from(new Set(appointments.map((a) => a.doctorName).filter((d) => d && d !== '—'))).sort(),
    [appointments]
  )

  const filteredRows = useMemo(
    () =>
      rows.filter((a) => {
        if (filterService !== ALL_FILTER && a.service !== filterService) return false
        if (filterDoctor !== ALL_FILTER && a.doctorName !== filterDoctor) return false
        if (filterStatus !== ALL_FILTER && a.status !== filterStatus) return false
        if (filterType !== ALL_FILTER && a.type !== filterType) return false
        if (filterPeriod === 'today' && !isSameDay(a.date, today)) return false
        if (filterPeriod === 'week') {
          const idx = dayIndexInWeek(realMonday, a.date)
          if (idx < 0 || idx >= 7) return false
        }
        if (filterPeriod === 'month' && (a.date.getMonth() !== today.getMonth() || a.date.getFullYear() !== today.getFullYear())) {
          return false
        }
        return true
      }),
    [rows, filterService, filterDoctor, filterStatus, filterType, filterPeriod, today, realMonday]
  )

  function handleResetFilters(): void {
    setFilterPeriod('all')
    setFilterService(ALL_FILTER)
    setFilterDoctor(ALL_FILTER)
    setFilterStatus(ALL_FILTER)
    setFilterType(ALL_FILTER)
  }

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

    const moved = appointments.find((a) => a.id === movedId)
    if (!moved) return
    if (moved.date < today) {
      setMoveError('Un rendez-vous passé ne peut pas être déplacé.')
      return
    }
    if (!canManage(moved)) {
      setMoveError("Vous ne pouvez déplacer que vos propres rendez-vous.")
      return
    }

    // Occupation par MÉDECIN, pas par créneau seul — deux médecins différents peuvent avoir un
    // rendez-vous à la même heure (c'est justement ce que la vue agrandie permet de voir).
    const occupant = appointments.find(
      (a) => a.id !== movedId && isSameDay(a.date, day) && formatTime(a.date) === hour && a.doctorId === moved.doctorId
    )
    if (occupant) {
      setMoveError('Ce médecin a déjà un rendez-vous sur ce créneau — choisissez un autre horaire.')
      return
    }

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

  // Rendu de la grille jour × heure, partagé entre la vue compacte (dans la carte) et la vue
  // agrandie (dans la modale plein écran) — même état/mêmes gestionnaires des deux côtés. La vue
  // agrandie affiche 14 jours (2 semaines) plutôt que 7 : une grille d'une seule semaine ne permet
  // jamais de glisser un rendez-vous du dimanche d'une semaine vers le lundi suivant (ils ne sont
  // jamais visibles ensemble) — avec 2 semaines affichées simultanément, ce cas devient un
  // glisser-déposer ordinaire, sans manipulation particulière. Un créneau peut aussi contenir
  // plusieurs rendez-vous (des médecins différents à la même heure) : chacun est glissable
  // individuellement, sous réserve de ne pas être passé et — pour un médecin — de lui appartenir.
  function renderCalendarGrid(large: boolean): JSX.Element {
    const cellMinHeight = large ? 'min-h-[110px]' : 'min-h-[46px]'
    const cardTextSize = large ? 'text-xs' : 'text-[11px]'
    const gridDays = large ? Array.from({ length: 14 }, (_, i) => addDays(monday, i)) : weekDays
    return (
      <div className={`grid min-w-[640px] ${large ? 'grid-cols-[56px_repeat(14,1fr)] gap-y-0.5' : 'grid-cols-[56px_repeat(7,1fr)]'}`}>
        <div />
        {gridDays.map((day, index) => {
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
            {gridDays.map((day, dayIndex) => {
              const cellAppointments = appointments.filter((a) => isSameDay(a.date, day) && formatTime(a.date) === hour)
              const isToday = weekOffset === 0 && isSameDay(day, today)
              const cellKey = `${large ? 'L' : 'S'}-${hour}-${dayIndex}`
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
                    `${cellMinHeight} flex flex-col gap-0.5 border-t border-l border-gray-100 p-0.5 transition-colors ` +
                    (isDragOver ? 'bg-accent-100' : isToday ? 'bg-accent-50/30' : '')
                  }
                >
                  {cellAppointments.map((appt) => {
                    const isPast = appt.date < today
                    const managed = canManage(appt)
                    const draggableNow = !isPast && managed
                    const title = isPast
                      ? 'Rendez-vous passé — non déplaçable'
                      : !managed
                        ? "Rendez-vous d'un autre médecin — non déplaçable"
                        : 'Glisser pour déplacer ce rendez-vous'
                    return (
                      <button
                        key={appt.id}
                        draggable={draggableNow}
                        onDragStart={() => draggableNow && setDraggingId(appt.id)}
                        onDragEnd={() => {
                          setDraggingId(null)
                          setDragOverCell(null)
                        }}
                        onClick={() => setSelectedId(appt.id)}
                        title={title}
                        className={`w-full rounded-md border px-1.5 py-1 text-left leading-tight transition-shadow ${cardTextSize} ${appointmentTypeStyle(appt.type).block} ${
                          draggableNow ? 'cursor-grab hover:shadow-sm active:cursor-grabbing' : 'cursor-default opacity-60'
                        } ${selected?.id === appt.id ? 'ring-2 ring-accent-500' : ''} ${draggingId === appt.id ? 'opacity-40' : ''}`}
                      >
                        <p className="truncate font-medium">{appt.patientName}</p>
                        <p className="truncate opacity-80">
                          {appt.type}
                          {appt.doctorName !== '—' ? ` · ${appt.doctorName}` : ''}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    )
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
          session={session}
          onClose={() => setShowCreateModal(false)}
          onCreated={(appointment) => {
            setAppointments((prev) => [...prev, toAppointment(appointment)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingAppointment && (
        <AppointmentFormModal
          session={session}
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

      {expanded && (
        <Modal
          title={`Calendrier — ${formatFullDate(monday)} – ${formatFullDate(addDays(monday, 13))} (2 semaines)`}
          onClose={() => setExpanded(false)}
          widthClassName="max-w-[96vw]"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center rounded-lg border border-gray-200">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                onDragEnter={() => handleWeekNavDragEnter(-1)}
                onDragLeave={clearWeekNavHover}
                onDragOver={(e) => e.preventDefault()}
                onDrop={clearWeekNavHover}
                title="Semaine précédente — glisser un rendez-vous ici pour y naviguer"
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
                onDragEnter={() => handleWeekNavDragEnter(1)}
                onDragLeave={clearWeekNavHover}
                onDragOver={(e) => e.preventDefault()}
                onDrop={clearWeekNavHover}
                title="Semaine suivante — glisser un rendez-vous ici pour y naviguer"
                className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {moveError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs text-red-600">
                <span>{moveError}</span>
                <button onClick={() => setMoveError(null)} className="shrink-0 text-red-400 hover:text-red-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            {renderEdgeNavZone(-1)}
            <div className="max-h-[78vh] overflow-auto">{renderCalendarGrid(true)}</div>
            {renderEdgeNavZone(1)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
            {APPOINTMENT_TYPES.map((type) => (
              <span key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`h-2 w-2 rounded-full ${appointmentTypeStyle(type).dot}`} />
                {type}
              </span>
            ))}
          </div>
        </Modal>
      )}

      {loading ? (
        <PulseLoader label="Chargement des rendez-vous…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="appointments.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <CalendarCheck className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{todayAppointments.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Cette semaine</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{weekAppointments.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-amber-50">
                <Hourglass className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{waitingAppointments.length}</p>
              <p className="text-xs text-gray-400">Patients en liste d&apos;attente</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
                <BadgeCheck className="h-5 w-5 text-teal-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Consultations honorées</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{completionRate === null ? '—' : `${completionRate}%`}</p>
              <p className="text-xs text-gray-400">Taux de réalisation</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
                <CalendarX className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Rendez-vous annulés</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{cancelledAppointments.length}</p>
            </Card>
          </SortableGroup>

          <SortableGroup id="appointments.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Calendrier */}
            <Card className="p-0 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-[15px] font-bold text-gray-900">Calendrier</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-gray-200">
                    <button
                      onClick={() => setWeekOffset((w) => w - 1)}
                      onDragEnter={() => handleWeekNavDragEnter(-1)}
                      onDragLeave={clearWeekNavHover}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={clearWeekNavHover}
                      title="Semaine précédente — glisser un rendez-vous ici pour y naviguer"
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
                      onDragEnter={() => handleWeekNavDragEnter(1)}
                      onDragLeave={clearWeekNavHover}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={clearWeekNavHover}
                      title="Semaine suivante — glisser un rendez-vous ici pour y naviguer"
                      className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatFullDate(monday)} – {formatFullDate(weekDays[6])}
                  </span>
                  <button
                    onClick={() => setExpanded(true)}
                    title="Agrandir le calendrier — 2 semaines affichées ensemble (glisser-déposer d'un dimanche vers le lundi suivant possible), pratique aussi quand plusieurs médecins ont un rendez-vous à la même heure"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="relative">
                {renderEdgeNavZone(-1)}
                <div className="overflow-x-auto p-4">{renderCalendarGrid(false)}</div>
                {renderEdgeNavZone(1)}
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
            <SortableGroup id="appointments.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Filtres</h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Période</label>
                    <select
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value as PeriodFilter)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value="all">Toutes les périodes</option>
                      <option value="today">Aujourd&apos;hui</option>
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois-ci</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Service</label>
                    <select
                      value={filterService}
                      onChange={(e) => setFilterService(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les services</option>
                      {serviceOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Médecin</label>
                    <select
                      value={filterDoctor}
                      onChange={(e) => setFilterDoctor(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les médecins</option>
                      {doctorOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Statut</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les statuts</option>
                      {Object.values(STATUS_LABEL).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Type de rendez-vous</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les types</option>
                      {APPOINTMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button variant="secondary" size="sm" className="w-full" onClick={handleResetFilters}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Réinitialiser les filtres
                  </Button>
                </div>
              </Card>

              {selected && (
                <Card className="p-0">
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <h3 className="text-[15px] font-bold text-gray-900">Rendez-vous sélectionné</h3>
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
                      <Button variant="secondary" size="sm" disabled={!canManage(selected)} onClick={() => setEditingAppointment(selected)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={cancelling || selected.status === 'Annulé' || !canManage(selected)}
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
                      disabled={!canManage(selected)}
                      onClick={() => setDeletingAppointment(selected)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                    {isDoctor && !canManage(selected) ? (
                      <p className="mt-2 text-center text-[11px] text-amber-600">
                        Rendez-vous d&apos;un autre médecin — non modifiable.
                      </p>
                    ) : (
                      <p className="mt-2 text-center text-[11px] text-gray-400">
                        Astuce : glissez-déposez le rendez-vous dans le calendrier pour le déplacer.
                      </p>
                    )}
                    <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      Autres actions
                    </button>
                  </div>
                </Card>
              )}

            </SortableGroup>
          </SortableGroup>

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

            {filteredRows.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">
                {rows.length === 0 ? 'Aucun rendez-vous dans cette catégorie.' : 'Aucun rendez-vous ne correspond aux filtres.'}
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                    <th className="px-6 py-3 font-semibold">Heure</th>
                    <th className="px-6 py-3 font-semibold">Patient</th>
                    <th className="px-6 py-3 font-semibold">Âge</th>
                    <th className="px-6 py-3 font-semibold">Service</th>
                    <th className="px-6 py-3 font-semibold">Médecin</th>
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold">Motif</th>
                    <th className="px-6 py-3 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((appt) => (
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
