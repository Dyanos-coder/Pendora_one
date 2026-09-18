// Types partagés entre main, preload et renderer pour le domaine Gestion des risques.

export type ApiRiskLevel = 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE'
export type ApiRiskStatus = 'OUVERT' | 'EN_TRAITEMENT' | 'CLOS'

export interface ApiRisk {
  id: string
  title: string
  category: string
  probability: number
  impact: number
  level: ApiRiskLevel
  status: ApiRiskStatus
  owner: string
  identifiedAt: string
}

export interface CreateRiskInput {
  title: string
  category: string
  probability: number
  impact: number
  owner: string
  status?: ApiRiskStatus
}

export interface UpdateRiskInput {
  title?: string
  category?: string
  probability?: number
  impact?: number
  owner?: string
  status?: ApiRiskStatus
}
