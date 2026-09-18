// Types partagés entre main, preload et renderer pour le domaine Audit & Conformité.

export type ApiAuditType = 'INTERNE' | 'EXTERNE'
export type ApiGovernanceAuditStatus = 'PLANIFIE' | 'EN_COURS' | 'TERMINE'

export interface ApiAudit {
  id: string
  title: string
  type: ApiAuditType
  service: string
  scheduledAt: string
  status: ApiGovernanceAuditStatus
  score: number | null
}

export interface ApiAuditFinding {
  id: string
  auditId: string
  category: string
  description: string
}

export interface ApiComplianceFramework {
  id: string
  name: string
  compliancePercent: number
}

export interface CreateAuditInput {
  title: string
  type: ApiAuditType
  service: string
  scheduledAt: string
  status?: ApiGovernanceAuditStatus
}

export interface UpdateAuditInput {
  title?: string
  type?: ApiAuditType
  service?: string
  scheduledAt?: string
  status?: ApiGovernanceAuditStatus
  score?: number | null
}
