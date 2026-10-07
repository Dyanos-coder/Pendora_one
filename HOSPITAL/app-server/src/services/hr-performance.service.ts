import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { EmployeePerformanceReview, PerformanceRating, Employee } from '../generated/prisma/client'

export interface CreatePerformanceReviewInput {
  employeeId: string
  reviewDate: string
  reviewerName: string
  rating: PerformanceRating
  comments?: string
  nextReviewDate?: string
}

export interface UpdatePerformanceReviewInput {
  reviewDate?: string
  reviewerName?: string
  rating?: PerformanceRating
  comments?: string | null
  nextReviewDate?: string | null
}

type ReviewWithEmployee = EmployeePerformanceReview & { employee: Employee }

function toDisplay(r: ReviewWithEmployee) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
    reviewDate: r.reviewDate.toISOString(),
    reviewerName: r.reviewerName,
    rating: r.rating,
    comments: r.comments,
    nextReviewDate: r.nextReviewDate?.toISOString() ?? null
  }
}

export async function listPerformanceReviews() {
  const prisma = getPrismaClient()
  const reviews = await prisma.employeePerformanceReview.findMany({
    where: { deletedAt: null },
    include: { employee: true },
    orderBy: { reviewDate: 'desc' }
  })
  return reviews.map(toDisplay)
}

export async function createPerformanceReview(input: CreatePerformanceReviewInput) {
  const prisma = getPrismaClient()
  const review = await prisma.employeePerformanceReview.create({
    data: {
      id: randomUUID(),
      employeeId: input.employeeId,
      reviewDate: new Date(input.reviewDate),
      reviewerName: input.reviewerName,
      rating: input.rating,
      comments: input.comments,
      nextReviewDate: input.nextReviewDate ? new Date(input.nextReviewDate) : undefined
    },
    include: { employee: true }
  })
  return toDisplay(review)
}

export async function updatePerformanceReview(id: string, input: UpdatePerformanceReviewInput) {
  const prisma = getPrismaClient()
  const review = await prisma.employeePerformanceReview.update({
    where: { id },
    data: {
      reviewDate: input.reviewDate !== undefined ? new Date(input.reviewDate) : undefined,
      reviewerName: input.reviewerName,
      rating: input.rating,
      comments: input.comments === undefined ? undefined : input.comments,
      nextReviewDate:
        input.nextReviewDate !== undefined ? (input.nextReviewDate ? new Date(input.nextReviewDate) : null) : undefined
    },
    include: { employee: true }
  })
  return toDisplay(review)
}

export async function deletePerformanceReview(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.employeePerformanceReview.update({ where: { id }, data: { deletedAt: new Date() } })
}
