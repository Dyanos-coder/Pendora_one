import type { StatusTone } from '@renderer/components/StatusBadge'
import type { RiskLevel, RiskStatus } from './types'

export function riskLevelTone(level: RiskLevel): StatusTone {
  if (level === 'Critique') return 'danger'
  if (level === 'Élevé') return 'risk'
  if (level === 'Modéré') return 'warning'
  return 'success'
}

export function riskStatusTone(status: RiskStatus): StatusTone {
  if (status === 'Clos') return 'success'
  if (status === 'En traitement') return 'info'
  return 'warning'
}

export const LEVEL_CELL_COLOR: Record<RiskLevel, string> = {
  Faible: 'bg-emerald-100 text-emerald-700',
  Modéré: 'bg-amber-100 text-amber-700',
  Élevé: 'bg-orange-100 text-orange-700',
  Critique: 'bg-red-100 text-red-700'
}

export function levelFromScore(score: number): RiskLevel {
  if (score >= 12) return 'Critique'
  if (score >= 8) return 'Élevé'
  if (score >= 4) return 'Modéré'
  return 'Faible'
}
