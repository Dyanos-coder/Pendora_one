import type { StatusTone } from '@renderer/components/StatusBadge'
import type { AuditStatus } from './types'

export function auditStatusTone(status: AuditStatus): StatusTone {
  if (status === 'Terminé') return 'success'
  if (status === 'En cours') return 'info'
  return 'neutral'
}
