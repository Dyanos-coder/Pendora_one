import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { EmployeeAttendance, EmployeeDailyStatus, Employee } from '../generated/prisma/client'

export interface CreateAttendanceInput {
  employeeId: string
  date: string
  status: EmployeeDailyStatus
  checkIn?: string
  checkOut?: string
  note?: string
}

export interface UpdateAttendanceInput {
  date?: string
  status?: EmployeeDailyStatus
  checkIn?: string | null
  checkOut?: string | null
  note?: string | null
}

type AttendanceWithEmployee = EmployeeAttendance & { employee: Employee }

function toDisplay(a: AttendanceWithEmployee) {
  return {
    id: a.id,
    employeeId: a.employeeId,
    employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
    date: a.date.toISOString(),
    status: a.status,
    checkIn: a.checkIn?.toISOString() ?? null,
    checkOut: a.checkOut?.toISOString() ?? null,
    latitude: a.latitude,
    longitude: a.longitude,
    note: a.note
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Pointeuse automatique à la connexion (item 14 PETITES MODIFS) — appelée après chaque login
 * réussi d'un compte lié à un `Employee` (voir auth.service.ts), jamais pour un compte sans fiche
 * employé (ex. DIRIGEANT sans Employee associé). Une seule fois par jour : les logins suivants du
 * même jour ne créent pas de doublon, ils ne touchent pas non plus l'entrée déjà posée (pas de
 * ré-écrasement de l'heure d'arrivée à chaque reconnexion). Position purement informative — jamais
 * de blocage/refus si absente ou éloignée de l'établissement.
 */
export async function checkInAttendance(employeeId: string, coords: { latitude?: number; longitude?: number }) {
  const prisma = getPrismaClient()
  const today = startOfDay(new Date())

  const existing = await prisma.employeeAttendance.findFirst({
    where: { employeeId, date: today, deletedAt: null }
  })
  if (existing) return null

  const attendance = await prisma.employeeAttendance.create({
    data: {
      id: randomUUID(),
      employeeId,
      date: today,
      status: 'PRESENT',
      checkIn: new Date(),
      latitude: coords.latitude,
      longitude: coords.longitude
    },
    include: { employee: true }
  })
  return toDisplay(attendance)
}

export async function listAttendances() {
  const prisma = getPrismaClient()
  const attendances = await prisma.employeeAttendance.findMany({
    where: { deletedAt: null },
    include: { employee: true },
    orderBy: { date: 'desc' }
  })
  return attendances.map(toDisplay)
}

export async function createAttendance(input: CreateAttendanceInput) {
  const prisma = getPrismaClient()
  const attendance = await prisma.employeeAttendance.create({
    data: {
      id: randomUUID(),
      employeeId: input.employeeId,
      date: new Date(input.date),
      status: input.status,
      checkIn: input.checkIn ? new Date(input.checkIn) : undefined,
      checkOut: input.checkOut ? new Date(input.checkOut) : undefined,
      note: input.note
    },
    include: { employee: true }
  })
  return toDisplay(attendance)
}

export async function updateAttendance(id: string, input: UpdateAttendanceInput) {
  const prisma = getPrismaClient()
  const attendance = await prisma.employeeAttendance.update({
    where: { id },
    data: {
      date: input.date !== undefined ? new Date(input.date) : undefined,
      status: input.status,
      checkIn: input.checkIn !== undefined ? (input.checkIn ? new Date(input.checkIn) : null) : undefined,
      checkOut: input.checkOut !== undefined ? (input.checkOut ? new Date(input.checkOut) : null) : undefined,
      note: input.note === undefined ? undefined : input.note
    },
    include: { employee: true }
  })
  return toDisplay(attendance)
}

export async function deleteAttendance(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.employeeAttendance.update({ where: { id }, data: { deletedAt: new Date() } })
}
