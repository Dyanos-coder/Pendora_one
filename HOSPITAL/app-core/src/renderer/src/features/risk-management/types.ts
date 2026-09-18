// Modèle "Gestion des risques" — écran conçu sans maquette source, en cohérence visuelle
// avec le reste de l'application.

export type RiskLevel = 'Faible' | 'Modéré' | 'Élevé' | 'Critique'
export type RiskStatus = 'Ouvert' | 'En traitement' | 'Clos'

export interface Risk {
  id: string
  title: string
  category: string
  probability: 1 | 2 | 3 | 4
  impact: 1 | 2 | 3 | 4
  level: RiskLevel
  status: RiskStatus
  owner: string
  identifiedOn: string
}
