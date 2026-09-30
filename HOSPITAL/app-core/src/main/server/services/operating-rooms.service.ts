import { getPrismaClient } from '../db/client'

export type EffectiveRoomStatus = 'OCCUPIED' | 'AVAILABLE' | 'MAINTENANCE'

export async function listOperatingRooms() {
  const prisma = getPrismaClient()
  const rooms = await prisma.operatingRoom.findMany({
    include: {
      surgeries: { where: { status: 'EN_COURS' }, take: 1 }
    },
    orderBy: { name: 'asc' }
  })

  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    status: (room.surgeries.length > 0 ? 'OCCUPIED' : room.status) as EffectiveRoomStatus
  }))
}
