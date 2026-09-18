import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { QualityAction, QualityCertification, QualityIndicator, QualityIndicatorStatus } from '../generated/prisma/client'

export interface CreateQualityIndicatorInput {
  name: string
  category: string
  currentValue: string
  target: string
  status?: QualityIndicatorStatus
}

export interface CreateQualityCertificationInput {
  name: string
  issuer: string
  expiryDate: string
}

export interface CreateQualityActionInput {
  label: string
  owner: string
  progress: number
}

export interface UpdateQualityIndicatorInput {
  name?: string
  category?: string
  currentValue?: string
  target?: string
  status?: QualityIndicatorStatus
}

export interface UpdateQualityCertificationInput {
  name?: string
  issuer?: string
  expiryDate?: string
}

export interface UpdateQualityActionInput {
  label?: string
  owner?: string
  progress?: number
}

function toIndicator(i: QualityIndicator) {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    currentValue: i.currentValue,
    target: i.target,
    status: i.status,
    lastMeasuredAt: i.lastMeasuredAt.toISOString()
  }
}

function toCertification(c: QualityCertification) {
  return {
    id: c.id,
    name: c.name,
    issuer: c.issuer,
    expiryDate: c.expiryDate.toISOString()
  }
}

function toAction(a: QualityAction) {
  return { id: a.id, label: a.label, owner: a.owner, progress: a.progress }
}

export async function listQualityIndicators() {
  const prisma = getPrismaClient()
  const indicators = await prisma.qualityIndicator.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } })
  return indicators.map(toIndicator)
}

export async function listQualityCertifications() {
  const prisma = getPrismaClient()
  const certifications = await prisma.qualityCertification.findMany({
    where: { deletedAt: null },
    orderBy: { expiryDate: 'asc' }
  })
  return certifications.map(toCertification)
}

export async function listQualityActions() {
  const prisma = getPrismaClient()
  const actions = await prisma.qualityAction.findMany({ where: { deletedAt: null }, orderBy: { progress: 'asc' } })
  return actions.map(toAction)
}

export async function deleteQualityIndicator(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.qualityIndicator.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function deleteQualityCertification(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.qualityCertification.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function deleteQualityAction(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.qualityAction.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createQualityIndicator(input: CreateQualityIndicatorInput) {
  const prisma = getPrismaClient()
  const indicator = await prisma.qualityIndicator.create({
    data: {
      id: randomUUID(),
      name: input.name,
      category: input.category,
      currentValue: input.currentValue,
      target: input.target,
      status: input.status ?? 'CONFORME',
      lastMeasuredAt: new Date()
    }
  })
  return toIndicator(indicator)
}

export async function createQualityCertification(input: CreateQualityCertificationInput) {
  const prisma = getPrismaClient()
  const certification = await prisma.qualityCertification.create({
    data: {
      id: randomUUID(),
      name: input.name,
      issuer: input.issuer,
      expiryDate: new Date(input.expiryDate)
    }
  })
  return toCertification(certification)
}

export async function createQualityAction(input: CreateQualityActionInput) {
  const prisma = getPrismaClient()
  const action = await prisma.qualityAction.create({
    data: { id: randomUUID(), label: input.label, owner: input.owner, progress: input.progress }
  })
  return toAction(action)
}

export async function updateQualityIndicator(id: string, input: UpdateQualityIndicatorInput) {
  const prisma = getPrismaClient()
  const indicator = await prisma.qualityIndicator.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      currentValue: input.currentValue,
      target: input.target,
      status: input.status
    }
  })
  return toIndicator(indicator)
}

export async function updateQualityCertification(id: string, input: UpdateQualityCertificationInput) {
  const prisma = getPrismaClient()
  const certification = await prisma.qualityCertification.update({
    where: { id },
    data: {
      name: input.name,
      issuer: input.issuer,
      expiryDate: input.expiryDate !== undefined ? new Date(input.expiryDate) : undefined
    }
  })
  return toCertification(certification)
}

export async function updateQualityAction(id: string, input: UpdateQualityActionInput) {
  const prisma = getPrismaClient()
  const action = await prisma.qualityAction.update({
    where: { id },
    data: { label: input.label, owner: input.owner, progress: input.progress }
  })
  return toAction(action)
}
