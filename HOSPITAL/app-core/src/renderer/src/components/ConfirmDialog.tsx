import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string }>
  onConfirmed: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Supprimer',
  onCancel,
  onConfirm,
  onConfirmed
}: ConfirmDialogProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm(): Promise<void> {
    setLoading(true)
    setError(null)
    const result = await onConfirm()
    setLoading(false)
    if (result.ok) {
      onConfirmed()
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={title} onClose={onCancel} widthClassName="max-w-sm">
      <p className="text-sm text-gray-600">{message}</p>
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button variant="danger" size="sm" onClick={handleConfirm} disabled={loading}>
          {loading ? 'Suppression…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
