import 'express-async-errors'
import express, { type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import type { AddressInfo } from 'net'
import { ConflictError } from './lib/conflict-error'
import { authRouter } from './routes/auth.routes'
import { healthRouter } from './routes/health.routes'
import { aiRouter } from './routes/ai.routes'
import { patientsRouter } from './routes/patients.routes'
import { employeesRouter } from './routes/employees.routes'
import { appointmentsRouter } from './routes/appointments.routes'
import { consultationsRouter } from './routes/consultations.routes'
import { hospitalizationsRouter } from './routes/hospitalizations.routes'
import { emergenciesRouter } from './routes/emergencies.routes'
import { operatingRoomRouter } from './routes/operating-room.routes'
import { laboratoryRouter } from './routes/laboratory.routes'
import { imagingRouter } from './routes/imaging.routes'
import { cardiologyRouter } from './routes/cardiology.routes'
import { pathologyRouter } from './routes/pathology.routes'
import { endoscopyRouter } from './routes/endoscopy.routes'
import { pharmacyRouter } from './routes/pharmacy.routes'
import { stocksRouter } from './routes/stocks.routes'
import { procurementRouter } from './routes/procurement.routes'
import { bloodBankRouter } from './routes/blood-bank.routes'
import { financeRouter } from './routes/finance.routes'
import { cashierRouter } from './routes/cashier.routes'
import { hrRouter } from './routes/hr.routes'
import { qualityRouter } from './routes/quality.routes'
import { riskRouter } from './routes/risk.routes'
import { auditComplianceRouter } from './routes/audit-compliance.routes'
import { documentsRouter } from './routes/documents.routes'
import { dashboardRouter } from './routes/dashboard.routes'
import { automationRouter } from './routes/automation.routes'
import { reportsRouter } from './routes/reports.routes'
import { usersRouter } from './routes/users.routes'
import { companyRouter } from './routes/company.routes'
import { notificationPreferencesRouter } from './routes/notification-preferences.routes'
import { picklistsRouter } from './routes/picklists.routes'
import { backupRouter } from './routes/backup.routes'
import { evaluateAutomationRules } from './services/automation.service'
import { bootstrapIfEmpty } from './services/bootstrap.service'
import { hasDbConnectionConfig } from './db/connection-config'
import { pingDatabase } from './db/client'
import { withDbLock } from './db/db-lock'
import { isDbReachable, setDbReachable } from './db/db-status'

// Backend embarqué (ex HOSPITAL/app-server, hébergé sur Render) — tourne dans le processus
// principal d'Electron et n'écoute que sur 127.0.0.1 : il n'est jamais joignable depuis le réseau.
// Seul le processus principal l'appelle (remote-api.client.ts), donc pas de CORS. Voir
// Plan-Backend-Embarque-Travaux.md.

/** Réponse renvoyée quand la base distante est injoignable : remote-api.client.ts la traduit en
 * erreur réseau, ce qui déclenche le repli hors-ligne exactement comme l'ancien serveur injoignable. */
function sendDbUnavailable(res: Response): void {
  res.status(503).json({ ok: false, error: 'Base de données injoignable.', dbUnavailable: true })
}

function createApp(): express.Express {
  const app = express()

  app.use(helmet())

  // express.json() global (limite par défaut 100 Ko) exclut volontairement /admin/backup : une
  // restauration complète dépasse largement cette limite, et backup.routes.ts pose son propre
  // express.json() avec une limite large sur /restore — un premier express.json() avec une limite
  // trop petite consommerait le corps avant lui.
  app.use((req, res, next) => {
    if (req.path.startsWith('/admin/backup')) {
      next()
      return
    }
    express.json()(req, res, next)
  })

  app.use('/health', healthRouter)

  // Base connue comme injoignable (dernière sonde en échec) : réponse immédiate plutôt que
  // d'attendre le délai de connexion du pool à chaque appel — le repli hors-ligne reste rapide.
  app.use((_req, res, next) => {
    if (!hasDbConnectionConfig() || !isDbReachable()) {
      sendDbUnavailable(res)
      return
    }
    next()
  })

  app.use('/auth', authRouter)
  app.use('/ai', aiRouter)
  app.use('/patients', patientsRouter)
  app.use('/employees', employeesRouter)
  app.use('/appointments', appointmentsRouter)
  app.use('/consultations', consultationsRouter)
  app.use('/hospitalizations', hospitalizationsRouter)
  app.use('/emergencies', emergenciesRouter)
  app.use('/operating-room', operatingRoomRouter)
  app.use('/laboratory', laboratoryRouter)
  app.use('/imaging', imagingRouter)
  app.use('/cardiology', cardiologyRouter)
  app.use('/pathology', pathologyRouter)
  app.use('/endoscopy', endoscopyRouter)
  app.use('/pharmacy', pharmacyRouter)
  app.use('/stocks', stocksRouter)
  app.use('/procurement', procurementRouter)
  app.use('/blood-bank', bloodBankRouter)
  app.use('/finance', financeRouter)
  app.use('/cashier', cashierRouter)
  app.use('/hr', hrRouter)
  app.use('/quality', qualityRouter)
  app.use('/risks', riskRouter)
  app.use('/audit-compliance', auditComplianceRouter)
  app.use('/documents', documentsRouter)
  app.use('/dashboard', dashboardRouter)
  app.use('/automation', automationRouter)
  app.use('/reports', reportsRouter)
  app.use('/users', usersRouter)
  app.use('/company', companyRouter)
  app.use('/notification-preferences', notificationPreferencesRouter)
  app.use('/picklists', picklistsRouter)
  app.use('/admin/backup', backupRouter)

  // Filet de sécurité : une erreur dans une route ne doit jamais faire tomber le backend. Si elle
  // vient d'une base devenue injoignable (vérifié par une sonde), on répond "base injoignable"
  // pour déclencher le repli hors-ligne plutôt qu'une erreur 500 affichée telle quelle.
  // Signature à 4 paramètres obligatoire pour qu'Express la reconnaisse comme gestionnaire d'erreurs.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(async (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return
    if (err instanceof ConflictError) {
      res.status(409).json({ ok: false, error: err.message, conflict: true, current: err.current })
      return
    }
    if (!(await pingDatabase(3000))) {
      setDbReachable(false)
      sendDbUnavailable(res)
      return
    }
    console.error('[unhandled route error]', err)
    res.status(500).json({ ok: false, error: 'Erreur serveur interne.' })
  })

  return app
}

/** Démarre le backend sur un port libre de 127.0.0.1 et renvoie son URL. */
export function startEmbeddedServer(): Promise<string> {
  const app = createApp()
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolve(`http://127.0.0.1:${port}`)
    })
    server.on('error', reject)
  })
}

const AUTOMATION_INTERVAL_MS = 15 * 60 * 1000
let backgroundTasksStarted = false

/** Tâches uniques pour tout l'hôpital (amorçage d'une base vide, automatisations) : lancées une
 * fois la base joignable et à jour, et protégées par un verrou MariaDB pour qu'un seul poste les
 * exécute à la fois même si plusieurs postes sont allumés. */
export function startBackgroundTasks(): void {
  void withDbLock('pandora_health_bootstrap', bootstrapIfEmpty, 30).catch((error) =>
    console.error('[bootstrap] échec de l’amorçage initial', error)
  )

  if (backgroundTasksStarted) return
  backgroundTasksStarted = true
  const runAutomation = (): void => {
    if (!hasDbConnectionConfig() || !isDbReachable()) return
    void withDbLock('pandora_health_automation', async () => {
      await evaluateAutomationRules()
    }).catch((error) => console.error('[automation] échec de l’évaluation', error))
  }
  runAutomation()
  setInterval(runAutomation, AUTOMATION_INTERVAL_MS)
}
