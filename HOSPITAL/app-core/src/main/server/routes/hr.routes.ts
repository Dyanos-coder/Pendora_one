import { Router } from 'express'
import multer from 'multer'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createHrEmployee, deleteHrEmployee, exportHrEmployees, listHrEmployees, updateHrEmployee } from '../services/hr.service'
import { checkInAttendance, createAttendance, deleteAttendance, listAttendances, updateAttendance } from '../services/hr-attendance.service'
import { getPrismaClient } from '../db/client'
import { createContract, deleteContract, listContracts, updateContract } from '../services/hr-contracts.service'
import {
  createPerformanceReview,
  deletePerformanceReview,
  listPerformanceReviews,
  updatePerformanceReview
} from '../services/hr-performance.service'
import { createTraining, deleteTraining, listTrainings, updateTraining } from '../services/hr-training.service'
import { createPayrollEntry, deletePayrollEntry, listPayrollEntries, updatePayrollEntry } from '../services/hr-payroll.service'
import {
  createEmployeeDocument,
  deleteEmployeeDocument,
  getEmployeeDocumentFile,
  listEmployeeDocuments,
  uploadEmployeeDocumentFile
} from '../services/hr-documents.service'
import { logAudit } from '../services/audit.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

export const hrRouter = Router()

hrRouter.use(requireAuth)

// Pointeuse automatique à la connexion (item 14 PETITES MODIFS) — volontairement placée AVANT le
// `requireAccess('hr', 'read')` ci-dessous : un médecin/infirmier/technicien/pharmacien n'a aucun
// accès au domaine RH (voir permissions.ts), mais doit pouvoir pointer sa propre présence. Chacun
// ne peut pointer que pour soi-même (employeeId dérivé de `req.auth.userId`, jamais fourni par le
// client), donc pas besoin d'un contrôle RBAC plus large ici.
hrRouter.post('/attendance/check-in', async (req, res) => {
  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, include: { employee: true } })
  if (!user || !user.employee || user.role === 'DIRIGEANT') {
    res.json({ ok: true, attendance: null })
    return
  }

  const { latitude, longitude } = req.body ?? {}
  if ((latitude !== undefined && typeof latitude !== 'number') || (longitude !== undefined && typeof longitude !== 'number')) {
    res.status(400).json({ ok: false, error: 'Coordonnées invalides.' })
    return
  }

  const attendance = await checkInAttendance(user.employee.id, { latitude, longitude })
  res.json({ ok: true, attendance })
})

hrRouter.use(requireAccess('hr', 'read'))

// Doit rester avant toute route GET /:id du même routeur.
hrRouter.get('/export', async (_req, res) => {
  const document = await exportHrEmployees()
  res.json({ ok: true, document })
})

hrRouter.get('/', async (_req, res) => {
  const employees = await listHrEmployees()
  res.json({ ok: true, employees })
})

hrRouter.post('/', requireAccess('hr', 'write'), async (req, res) => {
  const { firstName, lastName, role } = req.body ?? {}
  if (typeof firstName !== 'string' || !firstName.trim() || typeof lastName !== 'string' || !lastName.trim()) {
    res.status(400).json({ ok: false, error: 'Prénom et nom sont requis.' })
    return
  }
  if (typeof role !== 'string' || !role.trim()) {
    res.status(400).json({ ok: false, error: 'Rôle requis.' })
    return
  }

  const employee = await createHrEmployee(req.body)
  await logAudit(req.auth!.userId, 'employee.create', 'Employee', employee.id)
  res.status(201).json({ ok: true, employee })
})

hrRouter.patch('/:id', requireAccess('hr', 'write'), async (req, res) => {
  const employee = await updateHrEmployee(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'employee.update', 'Employee', employee.id)
  res.json({ ok: true, employee })
})

hrRouter.delete('/:id', requireAccess('hr', 'full'), async (req, res) => {
  await deleteHrEmployee(req.params.id)
  await logAudit(req.auth!.userId, 'employee.delete', 'Employee', req.params.id)
  res.json({ ok: true })
})

// --- Présences & Absences (item 12) ---------------------------------------------------------

hrRouter.get('/attendance', async (_req, res) => {
  const attendances = await listAttendances()
  res.json({ ok: true, attendances })
})

hrRouter.post('/attendance', requireAccess('hr', 'write'), async (req, res) => {
  const { employeeId, date, status } = req.body ?? {}
  if (typeof employeeId !== 'string' || !employeeId.trim() || typeof date !== 'string' || typeof status !== 'string') {
    res.status(400).json({ ok: false, error: 'Employé, date et statut requis.' })
    return
  }

  const attendance = await createAttendance(req.body)
  await logAudit(req.auth!.userId, 'employeeAttendance.create', 'EmployeeAttendance', attendance.id)
  res.status(201).json({ ok: true, attendance })
})

hrRouter.patch('/attendance/:id', requireAccess('hr', 'write'), async (req, res) => {
  const attendance = await updateAttendance(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'employeeAttendance.update', 'EmployeeAttendance', attendance.id)
  res.json({ ok: true, attendance })
})

hrRouter.delete('/attendance/:id', requireAccess('hr', 'full'), async (req, res) => {
  await deleteAttendance(req.params.id)
  await logAudit(req.auth!.userId, 'employeeAttendance.delete', 'EmployeeAttendance', req.params.id)
  res.json({ ok: true })
})

// --- Contrats (item 12) -----------------------------------------------------------------------

hrRouter.get('/contracts', async (_req, res) => {
  const contracts = await listContracts()
  res.json({ ok: true, contracts })
})

hrRouter.post('/contracts', requireAccess('hr', 'write'), async (req, res) => {
  const { employeeId, type, contractNumber, position, startDate } = req.body ?? {}
  if (
    typeof employeeId !== 'string' ||
    !employeeId.trim() ||
    typeof type !== 'string' ||
    typeof contractNumber !== 'string' ||
    !contractNumber.trim() ||
    typeof position !== 'string' ||
    !position.trim() ||
    typeof startDate !== 'string'
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const contract = await createContract(req.body)
  await logAudit(req.auth!.userId, 'employeeContract.create', 'EmployeeContract', contract.id)
  res.status(201).json({ ok: true, contract })
})

hrRouter.patch('/contracts/:id', requireAccess('hr', 'write'), async (req, res) => {
  const contract = await updateContract(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'employeeContract.update', 'EmployeeContract', contract.id)
  res.json({ ok: true, contract })
})

hrRouter.delete('/contracts/:id', requireAccess('hr', 'full'), async (req, res) => {
  await deleteContract(req.params.id)
  await logAudit(req.auth!.userId, 'employeeContract.delete', 'EmployeeContract', req.params.id)
  res.json({ ok: true })
})

// --- Performances (item 12) -------------------------------------------------------------------

hrRouter.get('/performance-reviews', async (_req, res) => {
  const reviews = await listPerformanceReviews()
  res.json({ ok: true, reviews })
})

hrRouter.post('/performance-reviews', requireAccess('hr', 'write'), async (req, res) => {
  const { employeeId, reviewDate, reviewerName, rating } = req.body ?? {}
  if (
    typeof employeeId !== 'string' ||
    !employeeId.trim() ||
    typeof reviewDate !== 'string' ||
    typeof reviewerName !== 'string' ||
    !reviewerName.trim() ||
    typeof rating !== 'string'
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const review = await createPerformanceReview(req.body)
  await logAudit(req.auth!.userId, 'employeePerformanceReview.create', 'EmployeePerformanceReview', review.id)
  res.status(201).json({ ok: true, review })
})

hrRouter.patch('/performance-reviews/:id', requireAccess('hr', 'write'), async (req, res) => {
  const review = await updatePerformanceReview(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'employeePerformanceReview.update', 'EmployeePerformanceReview', review.id)
  res.json({ ok: true, review })
})

hrRouter.delete('/performance-reviews/:id', requireAccess('hr', 'full'), async (req, res) => {
  await deletePerformanceReview(req.params.id)
  await logAudit(req.auth!.userId, 'employeePerformanceReview.delete', 'EmployeePerformanceReview', req.params.id)
  res.json({ ok: true })
})

// --- Formations (item 12) ---------------------------------------------------------------------

hrRouter.get('/trainings', async (_req, res) => {
  const trainings = await listTrainings()
  res.json({ ok: true, trainings })
})

hrRouter.post('/trainings', requireAccess('hr', 'write'), async (req, res) => {
  const { employeeId, title, startDate } = req.body ?? {}
  if (typeof employeeId !== 'string' || !employeeId.trim() || typeof title !== 'string' || !title.trim() || typeof startDate !== 'string') {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const training = await createTraining(req.body)
  await logAudit(req.auth!.userId, 'employeeTraining.create', 'EmployeeTraining', training.id)
  res.status(201).json({ ok: true, training })
})

hrRouter.patch('/trainings/:id', requireAccess('hr', 'write'), async (req, res) => {
  const training = await updateTraining(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'employeeTraining.update', 'EmployeeTraining', training.id)
  res.json({ ok: true, training })
})

hrRouter.delete('/trainings/:id', requireAccess('hr', 'full'), async (req, res) => {
  await deleteTraining(req.params.id)
  await logAudit(req.auth!.userId, 'employeeTraining.delete', 'EmployeeTraining', req.params.id)
  res.json({ ok: true })
})

// --- Paie (item 12) ----------------------------------------------------------------------------

hrRouter.get('/payroll', async (_req, res) => {
  const entries = await listPayrollEntries()
  res.json({ ok: true, entries })
})

hrRouter.post('/payroll', requireAccess('hr', 'write'), async (req, res) => {
  const { employeeId, period, baseSalary } = req.body ?? {}
  if (typeof employeeId !== 'string' || !employeeId.trim() || typeof period !== 'string' || !period.trim() || typeof baseSalary !== 'number') {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const entry = await createPayrollEntry(req.body)
  await logAudit(req.auth!.userId, 'payrollEntry.create', 'PayrollEntry', entry.id)
  res.status(201).json({ ok: true, entry })
})

hrRouter.patch('/payroll/:id', requireAccess('hr', 'write'), async (req, res) => {
  const entry = await updatePayrollEntry(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'payrollEntry.update', 'PayrollEntry', entry.id)
  res.json({ ok: true, entry })
})

hrRouter.delete('/payroll/:id', requireAccess('hr', 'full'), async (req, res) => {
  await deletePayrollEntry(req.params.id)
  await logAudit(req.auth!.userId, 'payrollEntry.delete', 'PayrollEntry', req.params.id)
  res.json({ ok: true })
})

// --- Documents employé (item 12, même mécanisme BLOB que l'item 11) ---------------------------

hrRouter.get('/documents', async (_req, res) => {
  const documents = await listEmployeeDocuments()
  res.json({ ok: true, documents })
})

hrRouter.post('/documents', requireAccess('hr', 'write'), async (req, res) => {
  const { employeeId, title } = req.body ?? {}
  if (typeof employeeId !== 'string' || !employeeId.trim() || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ ok: false, error: 'Employé et titre requis.' })
    return
  }

  const document = await createEmployeeDocument(req.body)
  await logAudit(req.auth!.userId, 'employeeDocument.create', 'EmployeeDocument', document.id)
  res.status(201).json({ ok: true, document })
})

hrRouter.delete('/documents/:id', requireAccess('hr', 'full'), async (req, res) => {
  await deleteEmployeeDocument(req.params.id)
  await logAudit(req.auth!.userId, 'employeeDocument.delete', 'EmployeeDocument', req.params.id)
  res.json({ ok: true })
})

hrRouter.get('/documents/:id/file', async (req, res) => {
  const document = await getEmployeeDocumentFile(req.params.id)
  if (!document) {
    res.status(404).json({ ok: false, error: 'Aucun fichier pour ce document.' })
    return
  }
  res.json({ ok: true, document })
})

hrRouter.post('/documents/:id/file', requireAccess('hr', 'write'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }

  const document = await uploadEmployeeDocumentFile(req.params.id, {
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    content: req.file.buffer
  })
  await logAudit(req.auth!.userId, 'employeeDocument.uploadFile', 'EmployeeDocument', document.id)
  res.json({ ok: true, document })
})
