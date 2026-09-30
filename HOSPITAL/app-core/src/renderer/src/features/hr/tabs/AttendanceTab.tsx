import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiAttendance, ApiEmployeeDailyStatus, ApiHrEmployee } from '@shared/hr-types'
import { AttendanceFormModal } from './AttendanceFormModal'

const STATUS_LABEL: Record<ApiEmployeeDailyStatus, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  CONGE: 'Congé',
  RETARD: 'Retard'
}

const STATUS_TONE: Record<ApiEmployeeDailyStatus, StatusTone> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  CONGE: 'info',
  RETARD: 'warning'
}

function formatTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'
}

export function AttendanceTab({ employees }: { employees: ApiHrEmployee[] }): JSX.Element {
  const [attendances, setAttendances] = useState<ApiAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiAttendance | null>(null)
  const [deleting, setDeleting] = useState<ApiAttendance | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.hr.attendance.list().then((result) => {
      if (cancelled) return
      if (result.ok) setAttendances(result.data.attendances)
      else setError(result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement…
      </div>
    )
  }
  if (error) return <p className="px-6 py-8 text-center text-sm text-red-500">{error}</p>

  return (
    <>
      <div className="flex items-center justify-end border-b border-gray-100 px-6 py-3">
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle présence
        </Button>
      </div>

      {showCreateModal && (
        <AttendanceFormModal
          employees={employees}
          onClose={() => setShowCreateModal(false)}
          onSaved={(a) => {
            setAttendances((prev) => [a, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <AttendanceFormModal
          employees={employees}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(a) => {
            setAttendances((prev) => prev.map((x) => (x.id === a.id ? a : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer la présence"
          message={`Voulez-vous vraiment supprimer cette présence pour ${deleting.employeeName} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.hr.attendance.delete(deleting.id)}
          onConfirmed={() => {
            setAttendances((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {attendances.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucune présence enregistrée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Employé</th>
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-6 py-2.5 font-medium">Statut</th>
                <th className="px-6 py-2.5 font-medium">Arrivée</th>
                <th className="px-6 py-2.5 font-medium">Départ</th>
                <th className="px-6 py-2.5 font-medium">Note</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {attendances.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{a.employeeName}</td>
                  <td className="px-6 py-3 text-gray-600">{new Date(a.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={STATUS_LABEL[a.status]} tone={STATUS_TONE[a.status]} />
                  </td>
                  <td className="px-6 py-3 text-gray-600">{formatTime(a.checkIn)}</td>
                  <td className="px-6 py-3 text-gray-600">{formatTime(a.checkOut)}</td>
                  <td className="px-6 py-3 text-xs text-gray-400">{a.note ?? '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(a)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(a)}
                        title="Supprimer"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
