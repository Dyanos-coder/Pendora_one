import type { StatusTone } from '@renderer/components/StatusBadge'
import type { TransactionStatus } from './types'

export function transactionStatusTone(status: TransactionStatus): StatusTone {
  if (status === 'Payé') return 'success'
  if (status === 'En attente') return 'warning'
  if (status === 'Annulé') return 'neutral'
  return 'danger'
}

export const EXPENSE_CATEGORY_COLOR: Record<string, string> = {
  'Achats & approvisionnement': '#3b82f6',
  'Masse salariale': '#12a04a',
  'Charges fixes': '#dea127',
  'Services médicaux': '#14b8a6',
  'Maintenance & énergie': '#ef4444',
  Autres: '#9ca3af'
}
