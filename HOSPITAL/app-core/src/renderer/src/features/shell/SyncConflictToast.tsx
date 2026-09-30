import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import type { SyncConflictNotification } from '@shared/sync-types'

const ENTITY_LABEL: Record<string, string> = {
  patient: 'Patient',
  consultation: 'Consultation',
  appointment: 'Rendez-vous',
  emergencyVisit: 'Passage aux urgences',
  hospitalization: 'Hospitalisation',
  surgery: 'Intervention au bloc opératoire',
  labRequest: 'Demande de laboratoire',
  imagingRequest: 'Demande d’imagerie',
  cardioExam: 'Examen de cardiologie',
  pathologyRequest: 'Demande d’anatomopathologie',
  endoscopyProcedure: 'Procédure d’endoscopie',
  medication: 'Médicament',
  bloodPouch: 'Poche de sang',
  depotItem: 'Article de dépôt',
  procurementRequest: 'Besoin d’approvisionnement',
  financeTransaction: 'Opération financière',
  hrEmployee: 'Employé'
}

interface ToastEntry extends SyncConflictNotification {
  id: string
}

// Mode hors-ligne — détection de conflit (voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3).
// Contrairement au badge de la file de synchro (ConnectivityIndicator, qu'il faut ouvrir pour
// voir), ce composant affiche une alerte active et visible dès qu'un conflit survient, pour que
// l'utilisateur comprenne tout de suite qu'une de ses modifications hors-ligne n'a pas pu être
// appliquée et doit être vérifiée manuellement.
export function SyncConflictToast(): JSX.Element | null {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  useEffect(() => {
    const unsubscribe = window.api.sync.onConflict((notification) => {
      setToasts((prev) => [...prev, { ...notification, id: `${notification.entityType}-${notification.entityId}-${Date.now()}` }])
    })
    return unsubscribe
  }, [])

  function dismiss(id: string): void {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-96 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Conflit de synchronisation — {ENTITY_LABEL[toast.entityType] ?? toast.entityType}
            </p>
            <p className="mt-1 text-xs text-red-700">{toast.message}</p>
            <p className="mt-1 text-xs text-red-600">
              Votre modification hors-ligne n’a pas été appliquée. Vérifiez la fiche actuelle puis relancez votre
              changement si besoin.
            </p>
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            title="Fermer"
            className="text-red-400 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
