import { Router } from 'express'
import express from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { exportDatabase, importDatabase, type BackupFile } from '../services/backup.service'
import { logAudit } from '../services/audit.service'

export const backupRouter = Router()

backupRouter.use(requireAuth)
// Réservé au DIRIGEANT ('full' — voir DOMAIN_PERMISSIONS.settings) : une sauvegarde/restauration
// complète de la base est l'opération la plus sensible de toute l'application.
backupRouter.use(requireAccess('settings', 'full'))

backupRouter.get('/', async (req, res) => {
  const backup = await exportDatabase()
  await logAudit(req.auth!.userId, 'backup.export', 'Database', backup.database)
  res.json({ ok: true, backup })
})

// Limite dédiée, bien au-delà des 100 Ko par défaut d'express.json() — une sauvegarde complète
// (documents/logo en BLOB inclus) peut largement dépasser cette valeur par défaut.
const restoreJsonParser = express.json({ limit: '500mb' })

backupRouter.post('/restore', restoreJsonParser, async (req, res) => {
  const backup = req.body as BackupFile
  if (!backup || typeof backup !== 'object' || backup.version !== 1 || !Array.isArray(backup.tables)) {
    res.status(400).json({ ok: false, error: 'Fichier de sauvegarde invalide.' })
    return
  }

  await importDatabase(backup)
  await logAudit(req.auth!.userId, 'backup.restore', 'Database', backup.database)
  res.json({ ok: true })
})
