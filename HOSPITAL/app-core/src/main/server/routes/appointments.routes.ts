import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createAppointment,
  deleteAppointment,
  getAppointmentById,
  listAppointments,
  updateAppointment
} from '../services/appointments.service'
import { logAudit } from '../services/audit.service'

export const appointmentsRouter = Router()

appointmentsRouter.use(requireAuth)
appointmentsRouter.use(requireAccess('appointments', 'read'))

appointmentsRouter.get('/', async (_req, res) => {
  const appointments = await listAppointments()
  res.json({ ok: true, appointments })
})

appointmentsRouter.get('/:id', async (req, res) => {
  const appointment = await getAppointmentById(req.params.id)
  if (!appointment) {
    res.status(404).json({ ok: false, error: 'Rendez-vous introuvable.' })
    return
  }
  res.json({ ok: true, appointment })
})

appointmentsRouter.post('/', requireAccess('appointments', 'write'), async (req, res) => {
  const { date } = req.body ?? {}
  if (typeof date !== 'string' || Number.isNaN(Date.parse(date))) {
    res.status(400).json({ ok: false, error: 'Date invalide.' })
    return
  }

  const appointment = await createAppointment(req.body)
  await logAudit(req.auth!.userId, 'appointment.create', 'Appointment', appointment.id)
  res.status(201).json({ ok: true, appointment })
})

appointmentsRouter.patch('/:id', requireAccess('appointments', 'write'), async (req, res) => {
  const { date } = req.body ?? {}
  if (date !== undefined && (typeof date !== 'string' || Number.isNaN(Date.parse(date)))) {
    res.status(400).json({ ok: false, error: 'Date invalide.' })
    return
  }

  const appointment = await updateAppointment(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'appointment.update', 'Appointment', appointment.id)
  res.json({ ok: true, appointment })
})

appointmentsRouter.delete('/:id', requireAccess('appointments', 'full'), async (req, res) => {
  await deleteAppointment(req.params.id)
  await logAudit(req.auth!.userId, 'appointment.delete', 'Appointment', req.params.id)
  res.json({ ok: true })
})
