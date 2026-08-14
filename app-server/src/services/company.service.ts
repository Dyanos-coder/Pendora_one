import { getPrismaClient } from '../db/client'

export async function getCompany() {
  const prisma = getPrismaClient()
  return prisma.company.findFirst()
}

export async function getCompanyLogo(): Promise<{ data: Buffer; mimeType: string } | null> {
  const prisma = getPrismaClient()
  const company = await prisma.company.findFirst({ select: { logo: true, logoMimeType: true } })
  if (!company?.logo || !company.logoMimeType) return null
  return { data: Buffer.from(company.logo), mimeType: company.logoMimeType }
}

export async function updateCompanyLogo(data: Buffer, mimeType: string): Promise<void> {
  const prisma = getPrismaClient()
  const company = await prisma.company.findFirst()
  if (!company) {
    throw new Error("Aucune entreprise n'est configurée sur ce serveur.")
  }
  await prisma.company.update({
    where: { id: company.id },
    data: { logo: Uint8Array.from(data), logoMimeType: mimeType }
  })
}
