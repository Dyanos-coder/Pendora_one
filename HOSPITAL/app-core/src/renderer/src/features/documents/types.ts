// Modèle "Documents & Protocoles" — écran conçu sans maquette source, en cohérence visuelle
// avec le reste de l'application.

export type DocumentStatus = 'Publié' | 'En validation' | 'À réviser'

export interface ProtocolDocument {
  id: string
  title: string
  category: string
  version: string
  status: DocumentStatus
  updatedOn: string
  owner: string
}
