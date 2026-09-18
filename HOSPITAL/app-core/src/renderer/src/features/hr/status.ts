import type { StatusTone } from '@renderer/components/StatusBadge'
import type { EmployeeStatus } from './types'

export function employeeStatusTone(status: EmployeeStatus): StatusTone {
  if (status === 'Présent') return 'success'
  if (status === 'Congé') return 'info'
  if (status === 'Retard') return 'warning'
  return 'danger'
}

export const DAY_STATUS_COLOR: Record<EmployeeStatus, string> = {
  Présent: '#10b981',
  Absent: '#ef4444',
  Congé: '#3b82f6',
  Retard: '#f59e0b'
}
