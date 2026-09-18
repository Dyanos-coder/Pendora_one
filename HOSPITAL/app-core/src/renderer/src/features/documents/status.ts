import type { StatusTone } from '@renderer/components/StatusBadge'
import type { DocumentStatus } from './types'

export function documentStatusTone(status: DocumentStatus): StatusTone {
  if (status === 'Publié') return 'success'
  if (status === 'En validation') return 'info'
  return 'warning'
}

export const CATEGORY_CHART_COLOR: Record<string, string> = {
  'Protocoles cliniques': '#3b82f6',
  'Procédures qualité': '#10b981',
  'Hygiène & sécurité': '#f59e0b',
  Administratif: '#9ca3af'
}
