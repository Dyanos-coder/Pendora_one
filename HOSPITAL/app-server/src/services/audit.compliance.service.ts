import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { Audit, AuditFinding, AuditType, ComplianceFramework, GovernanceAuditStatus } from '../generated/prisma/client'

export interface CreateAuditInput {
  title: string
  type: AuditType
  service: string
  scheduledAt: string
  status?: GovernanceAuditStatus
}

export interface UpdateAuditInput {
  title?: string
  type?: AuditType
  service?: string
  scheduledAt?: string
  status?: GovernanceAuditStatus
  score?: number | null
}

function toAudit(a: Audit) {
  return {
    id: a.id,
    title: a.title,
    type: a.type,
    service: a.service,
    scheduledAt: a.scheduledAt.toISOString(),
    status: a.status,
    score: a.score
  }
}

function toFinding(f: AuditFinding) {
  return { id: f.id, auditId: f.auditId, category: f.category, description: f.description }
}

function toFramework(f: ComplianceFramework) {
  return { id: f.id, name: f.name, compliancePercent: f.compliancePercent }
}

export async function listAudits() {
  const prisma = getPrismaClient()
  const audits = await prisma.audit.findMany({ where: { deletedAt: null }, orderBy: { scheduledAt: 'desc' } })
  return audits.map(toAudit)
}

export async function deleteAudit(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.audit.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function listAuditFindings() {
  const prisma = getPrismaClient()
  const findings = await prisma.auditFinding.findMany()
  return findings.map(toFinding)
}

export async function listComplianceFrameworks() {
  const prisma = getPrismaClient()
  const frameworks = await prisma.complianceFramework.findMany({ orderBy: { compliancePercent: 'desc' } })
  return frameworks.map(toFramework)
}

export async function createAudit(input: CreateAuditInput) {
  const prisma = getPrismaClient()
  const audit = await prisma.audit.create({
    data: {
      id: randomUUID(),
      title: input.title,
      type: input.type,
      service: input.service,
      scheduledAt: new Date(input.scheduledAt),
      status: input.status ?? 'PLANIFIE'
    }
  })
  return toAudit(audit)
}

export async function updateAudit(id: string, input: UpdateAuditInput) {
  const prisma = getPrismaClient()
  const audit = await prisma.audit.update({
    where: { id },
    data: {
      title: input.title,
      type: input.type,
      service: input.service,
      scheduledAt: input.scheduledAt !== undefined ? new Date(input.scheduledAt) : undefined,
      status: input.status,
      score: input.score === undefined ? undefined : input.score
    }
  })
  return toAudit(audit)
}
