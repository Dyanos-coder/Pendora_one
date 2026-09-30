import { getPrismaClient } from '../db/client'

export type EffectiveBedStatus = 'OCCUPIED' | 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE'

export async function listBeds() {
  const prisma = getPrismaClient()
  const beds = await prisma.bed.findMany({
    include: { hospitalizations: { where: { status: 'HOSPITALISE' }, take: 1 } },
    orderBy: [{ room: 'asc' }, { label: 'asc' }]
  })

  return beds.map((bed) => ({
    id: bed.id,
    room: bed.room,
    label: bed.label,
    service: bed.service,
    status: (bed.hospitalizations.length > 0 ? 'OCCUPIED' : bed.status) as EffectiveBedStatus
  }))
}

export async function bedOccupancySummary() {
  const beds = await listBeds()
  const counts = { OCCUPIED: 0, AVAILABLE: 0, CLEANING: 0, MAINTENANCE: 0 }
  for (const bed of beds) counts[bed.status] += 1
  return { total: beds.length, ...counts }
}
