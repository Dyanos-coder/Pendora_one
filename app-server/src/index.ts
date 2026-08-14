import 'dotenv/config'
import 'express-async-errors'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.routes'
import { healthRouter } from './routes/health.routes'
import { financeRouter } from './routes/finance.routes'
import { companyRouter } from './routes/company.routes'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/health', healthRouter)
app.use('/auth', authRouter)
app.use('/finance', financeRouter)
app.use('/company', companyRouter)

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

const port = Number(process.env['PORT'] ?? 3000)

app.listen(port, () => {
  console.log(`Pandora One server listening on http://localhost:${port}`)
})
