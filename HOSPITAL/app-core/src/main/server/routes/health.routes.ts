import { Router } from 'express'
import { hasDbConnectionConfig } from '../db/connection-config'
import { pingDatabase } from '../db/client'
import { setDbReachable } from '../db/db-status'

export const healthRouter = Router()

// Le backend étant embarqué, il répond toujours : la sonde de connectivité doit donc vérifier la
// base distante elle-même (`SELECT 1`), sinon l'app se croirait en ligne alors que MariaDB est
// injoignable.
healthRouter.get('/', async (_req, res) => {
  const ok = hasDbConnectionConfig() && (await pingDatabase(5000))
  setDbReachable(ok)
  if (!ok) {
    res.status(503).json({ status: 'db_unavailable', service: 'pandora-health-server' })
    return
  }
  res.json({ status: 'ok', service: 'pandora-health-server' })
})
