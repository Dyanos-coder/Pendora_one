import 'dotenv/config'
import 'express-async-errors'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { apiLimiter } from './config/rate-limit'
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
import { hrRouter } from './routes/hr.routes'
import { qualityRouter } from './routes/quality.routes'
import { riskRouter } from './routes/risk.routes'
import { auditComplianceRouter } from './routes/audit-compliance.routes'
import { documentsRouter } from './routes/documents.routes'
import { dashboardRouter } from './routes/dashboard.routes'
import { automationRouter } from './routes/automation.routes'
import { evaluateAutomationRules } from './services/automation.service'
import { reportsRouter } from './routes/reports.routes'
import { usersRouter } from './routes/users.routes'

const app = express()

// Headers de sécurité standards (X-Content-Type-Options, X-Frame-Options, Strict-Transport-
// Security, etc.). Cette API ne sert que du JSON (jamais de HTML), donc la CSP par défaut de
// helmet ne restreint rien qui nous concerne — elle reste utile si une route venait un jour à
// servir du contenu HTML/statique.
app.use(helmet())

// L'app desktop (app-core) parle à ce serveur depuis le process principal d'Electron
// (Node.js/fetch), pas depuis un navigateur — aucune origine n'est donc envoyée sur ce trafic et
// cette restriction ne le concerne pas. Elle protège contre un client web tiers qui tenterait
// d'appeler l'API directement depuis le navigateur d'un utilisateur (ex: script malveillant sur
// un autre site). Voir ALLOWED_ORIGINS dans .env.example.
const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

// /health reste hors quota (sondes de supervision, pas de risque d'abus) ; tout le reste passe
// par le garde-fou général — /auth/login a en plus son propre limiteur plus strict (voir
// auth.routes.ts) contre le brute-force spécifiquement.
app.use('/health', healthRouter)
app.use(apiLimiter)

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
app.use('/hr', hrRouter)
app.use('/quality', qualityRouter)
app.use('/risks', riskRouter)
app.use('/audit-compliance', auditComplianceRouter)
app.use('/documents', documentsRouter)
app.use('/dashboard', dashboardRouter)
app.use('/automation', automationRouter)
app.use('/reports', reportsRouter)
app.use('/users', usersRouter)

// Filet de sécurité : une erreur dans une route (DB, réseau, etc.) ne doit jamais faire tomber
// tout le serveur — on la journalise et on répond 500 au seul client concerné.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled route error]', err)
  if (res.headersSent) return
  res.status(500).json({ ok: false, error: 'Erreur serveur interne.' })
})

// Dernier filet pour les rejets de promesse qui échapperaient malgré tout à Express — on
// journalise au lieu de laisser Node terminer le process (comportement par défaut depuis Node 15).
process.on('unhandledRejection', (reason) => {
  console.error('[unhandled rejection]', reason)
})

const port = Number(process.env['PORT'] ?? 3001)

app.listen(port, () => {
  console.log(`Pandora Health server listening on http://localhost:${port}`)
})

// Moteur Automation Studio (Phase 6) : vraie évaluation périodique des règles actives, pas une
// simulation d'UI — voir automation.service.ts::evaluateAutomationRules(). Une première passe
// immédiate au démarrage évite d'attendre 15 min avant que le journal contienne des données.
const AUTOMATION_INTERVAL_MS = 15 * 60 * 1000
evaluateAutomationRules().catch((error) => console.error('[automation] échec de la première évaluation', error))
setInterval(() => {
  evaluateAutomationRules().catch((error) => console.error('[automation] échec de l’évaluation périodique', error))
}, AUTOMATION_INTERVAL_MS)
