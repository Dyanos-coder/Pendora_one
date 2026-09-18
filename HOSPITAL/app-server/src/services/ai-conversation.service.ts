import type { Content } from '@google/genai'
import { getPrismaClient } from '../db/client'
import { runAssistant } from './ai-assistant.service'

const DEFAULT_TITLE = 'Nouvelle conversation'
const TITLE_MAX_LENGTH = 60

function deriveTitle(question: string): string {
  const trimmed = question.trim()
  return trimmed.length > TITLE_MAX_LENGTH ? `${trimmed.slice(0, TITLE_MAX_LENGTH)}…` : trimmed
}

export async function listConversations() {
  const prisma = getPrismaClient()
  return prisma.aiConversation.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, createdAt: true, updatedAt: true }
  })
}

export async function createConversation(title?: string) {
  const prisma = getPrismaClient()
  return prisma.aiConversation.create({
    data: { title: title?.trim() || DEFAULT_TITLE }
  })
}

export async function renameConversation(id: string, title: string) {
  const prisma = getPrismaClient()
  return prisma.aiConversation.update({
    where: { id },
    data: { title: title.trim() || DEFAULT_TITLE }
  })
}

export async function getConversationMessages(conversationId: string) {
  const prisma = getPrismaClient()
  return prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' }
  })
}

export async function askInConversation(conversationId: string, question: string): Promise<string> {
  const prisma = getPrismaClient()

  const conversation = await prisma.aiConversation.findUnique({ where: { id: conversationId } })
  if (!conversation) {
    throw new Error('Conversation introuvable.')
  }

  const history = await prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' }
  })

  const contents: Content[] = history.map((m) => ({
    role: m.role === 'USER' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }))
  contents.push({ role: 'user', parts: [{ text: question }] })

  const answer = await runAssistant(contents)

  await prisma.$transaction([
    prisma.aiMessage.create({ data: { conversationId, role: 'USER', text: question } }),
    prisma.aiMessage.create({ data: { conversationId, role: 'ASSISTANT', text: answer } }),
    prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        title: history.length === 0 && conversation.title === DEFAULT_TITLE ? deriveTitle(question) : undefined
      }
    })
  ])

  return answer
}
