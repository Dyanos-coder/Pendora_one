import { getCurrentToken } from './session.store'
import { listPicklistValues } from './remote-api.client'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

// Lecture seule, jamais hors-ligne : ce sont de simples suggestions de saisie (voir
// Plan-Mode-Hors-Ligne-Synchronisation.md — hors périmètre, dégradation acceptable en absence de
// réseau, l'utilisateur retape simplement la valeur en texte libre).
export function list(listKey: string) {
  return listPicklistValues(requireToken(), listKey)
}
