import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { listPicklistValues, PICKLIST_KEYS } from '../services/picklist.service'

// Lecture seule, n'importe quel rôle connecté : ce ne sont que des suggestions de saisie (voir
// picklist.service.ts) — l'écriture ne se fait jamais via cette route, seulement en effet de bord
// des créations/modifications déjà protégées par leur propre domaine RBAC.
export const picklistsRouter = Router()
picklistsRouter.use(requireAuth)

const KNOWN_KEYS = new Set<string>(Object.values(PICKLIST_KEYS))

picklistsRouter.get('/:listKey', async (req, res) => {
  if (!KNOWN_KEYS.has(req.params.listKey)) {
    res.status(404).json({ ok: false, error: 'Liste inconnue.' })
    return
  }
  const values = await listPicklistValues(req.params.listKey)
  res.json({ ok: true, values })
})
