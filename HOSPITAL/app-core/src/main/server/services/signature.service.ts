import { randomUUID } from 'crypto'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { getPrismaClient } from '../db/client'
import type { AuthTokenPayload } from '../types'
import type { ProtocolDocument, SignatureRequest, User } from '../generated/prisma/client'
import type { ApiSignatureImage, ApiSignatureRequest } from '../../../shared/documents-types'

// Signature électronique (Documents & signature électronique) : le dirigeant téléverse l'image de
// sa signature ; tout utilisateur peut demander la signature d'un document PDF ; quand le
// dirigeant signe, sa signature est apposée sur la dernière page du PDF (avec son nom et la date),
// le PDF d'origine étant conservé sur la demande pour la traçabilité.

/** Règle métier non respectée : renvoyée en 400 avec son message par documents.routes.ts. */
export class SignatureError extends Error {}

export const SIGNATURE_MIME_TYPES = ['image/png', 'image/jpeg']
const PDF_MIME = 'application/pdf'

// --- Image de signature du dirigeant ---------------------------------------------------------

export async function getUserSignature(userId: string): Promise<ApiSignatureImage | null> {
  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { signatureImage: true, signatureMimeType: true } })
  if (!user?.signatureImage || !user.signatureMimeType) return null
  return { mimeType: user.signatureMimeType, contentBase64: Buffer.from(user.signatureImage).toString('base64') }
}

export async function setUserSignature(userId: string, file: { mimeType: string; content: Buffer } | null): Promise<void> {
  const prisma = getPrismaClient()
  if (file && !SIGNATURE_MIME_TYPES.includes(file.mimeType)) {
    throw new SignatureError('Format non pris en charge : utilisez une image PNG (idéalement sur fond transparent) ou JPEG.')
  }
  await prisma.user.update({
    where: { id: userId },
    data: file ? { signatureImage: new Uint8Array(file.content), signatureMimeType: file.mimeType } : { signatureImage: null, signatureMimeType: null }
  })
}

// --- Demandes de signature ---------------------------------------------------------------------

type RequestWithRelations = SignatureRequest & {
  document: Pick<ProtocolDocument, 'title' | 'fileName'>
  requestedBy: Pick<User, 'name'>
  decidedBy: Pick<User, 'name'> | null
}

const REQUEST_INCLUDE = {
  document: { select: { title: true, fileName: true } },
  requestedBy: { select: { name: true } },
  decidedBy: { select: { name: true } }
} as const

function toDisplay(r: RequestWithRelations): ApiSignatureRequest {
  return {
    id: r.id,
    documentId: r.documentId,
    documentTitle: r.document.title,
    documentFileName: r.document.fileName,
    requestedById: r.requestedById,
    requestedByName: r.requestedBy.name,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    decidedByName: r.decidedBy?.name ?? null,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    refusalReason: r.refusalReason
  }
}

/** Le dirigeant voit toutes les demandes ; les autres utilisateurs, seulement les leurs. */
export async function listSignatureRequests(auth: AuthTokenPayload): Promise<ApiSignatureRequest[]> {
  const prisma = getPrismaClient()
  const requests = await prisma.signatureRequest.findMany({
    where: auth.role === 'DIRIGEANT' ? {} : { requestedById: auth.userId },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 500
  })
  return requests.map(toDisplay)
}

export async function requestSignature(auth: AuthTokenPayload, documentId: string, message?: string | null): Promise<ApiSignatureRequest> {
  const prisma = getPrismaClient()
  const document = await prisma.protocolDocument.findUnique({ where: { id: documentId } })
  if (!document || document.deletedAt) throw new SignatureError('Document introuvable.')
  if (!document.content || document.mimeType !== PDF_MIME) {
    throw new SignatureError('Seul un document PDF téléversé peut être signé électroniquement.')
  }
  const pending = await prisma.signatureRequest.findFirst({ where: { documentId, status: 'EN_ATTENTE' } })
  if (pending) throw new SignatureError('Une demande de signature est déjà en attente pour ce document.')

  const request = await prisma.signatureRequest.create({
    data: { id: randomUUID(), documentId, requestedById: auth.userId, message: message?.trim() || null },
    include: REQUEST_INCLUDE
  })
  await prisma.protocolDocument.update({ where: { id: documentId }, data: { status: 'EN_VALIDATION' } })
  return toDisplay(request)
}

/** Demande de signature d'un nouveau document PDF, téléversé pour l'occasion (ouvert à tous les
 * utilisateurs, même sans droit d'écriture sur la bibliothèque de documents). */
export async function requestSignatureForNewDocument(
  auth: AuthTokenPayload,
  input: { title: string; message?: string | null; fileName: string; mimeType: string; content: Buffer }
): Promise<ApiSignatureRequest> {
  const prisma = getPrismaClient()
  if (!input.title?.trim()) throw new SignatureError('Le titre du document est obligatoire.')
  if (input.mimeType !== PDF_MIME) throw new SignatureError('Le document à signer doit être un PDF.')
  const requester = await prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } })

  const document = await prisma.protocolDocument.create({
    data: {
      id: randomUUID(),
      title: input.title.trim(),
      category: 'À signer',
      version: '1.0',
      owner: requester?.name ?? '—',
      status: 'EN_VALIDATION',
      revisedAt: new Date(),
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.content.length,
      content: new Uint8Array(input.content)
    }
  })
  return requestSignature(auth, document.id, input.message)
}

/** Remplace les caractères absents de la police standard du PDF (hors Latin-1) plutôt que d'échouer. */
const OUTSIDE_LATIN1 = new RegExp(`[^${String.fromCharCode(0x20)}-${String.fromCharCode(0x7e)}${String.fromCharCode(0xa0)}-${String.fromCharCode(0xff)}]`, 'g')

function pdfSafe(text: string): string {
  return text.replace(OUTSIDE_LATIN1, '?')
}

async function stampSignature(pdfBytes: Uint8Array, signature: { mimeType: string; bytes: Uint8Array }, signerName: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes)
  const image = signature.mimeType === 'image/png' ? await pdf.embedPng(signature.bytes) : await pdf.embedJpg(signature.bytes)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const pages = pdf.getPages()
  const page = pages[pages.length - 1]
  const { width } = page.getSize()

  // Bloc de signature en bas à droite de la dernière page : image (150 pt de large maximum,
  // 60 pt de haut maximum, proportions conservées), puis nom et date en dessous.
  const scale = Math.min(150 / image.width, 60 / image.height, 1)
  const w = image.width * scale
  const h = image.height * scale
  const blockWidth = 170
  const x = width - blockWidth - 36
  const y = 64
  page.drawImage(image, { x: x + (blockWidth - w) / 2, y, width: w, height: h })
  const now = new Date()
  const date = `${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  page.drawText(pdfSafe(`Signé électroniquement par ${signerName}`), { x, y: y - 12, size: 7.5, font, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(pdfSafe(`le ${date}`), { x, y: y - 22, size: 7.5, font, color: rgb(0.2, 0.2, 0.2) })
  return pdf.save()
}

export async function signRequest(auth: AuthTokenPayload, id: string): Promise<ApiSignatureRequest> {
  const prisma = getPrismaClient()
  if (auth.role !== 'DIRIGEANT') throw new SignatureError('Seul le dirigeant peut signer.')
  const request = await prisma.signatureRequest.findUnique({ where: { id }, include: { document: true } })
  if (!request) throw new SignatureError('Demande introuvable.')
  if (request.status !== 'EN_ATTENTE') throw new SignatureError('Cette demande a déjà été traitée.')
  const document = request.document
  if (!document.content || document.mimeType !== PDF_MIME) throw new SignatureError('Le document n’est plus un PDF signable.')

  const signer = await prisma.user.findUnique({ where: { id: auth.userId } })
  if (!signer?.signatureImage || !signer.signatureMimeType) {
    throw new SignatureError('Téléversez d’abord votre signature (bloc « Ma signature »).')
  }

  let signed: Uint8Array
  try {
    signed = await stampSignature(
      new Uint8Array(document.content),
      { mimeType: signer.signatureMimeType, bytes: new Uint8Array(signer.signatureImage) },
      signer.name
    )
  } catch {
    throw new SignatureError('Impossible de signer ce PDF (fichier protégé ou endommagé).')
  }

  await prisma.$transaction(async (tx) => {
    await tx.protocolDocument.update({
      where: { id: document.id },
      data: {
        content: new Uint8Array(signed),
        fileSize: signed.length,
        fileName: document.fileName?.replace(/(\.pdf)?$/i, ' (signé).pdf') ?? 'document (signé).pdf',
        status: 'PUBLIE',
        revisedAt: new Date()
      }
    })
    await tx.signatureRequest.update({
      where: { id },
      data: { status: 'SIGNE', decidedById: auth.userId, decidedAt: new Date(), originalContent: new Uint8Array(document.content!) }
    })
  })
  const updated = await prisma.signatureRequest.findUniqueOrThrow({ where: { id }, include: REQUEST_INCLUDE })
  return toDisplay(updated)
}

export async function refuseRequest(auth: AuthTokenPayload, id: string, reason: string): Promise<ApiSignatureRequest> {
  const prisma = getPrismaClient()
  if (auth.role !== 'DIRIGEANT') throw new SignatureError('Seul le dirigeant peut refuser une signature.')
  if (!reason?.trim()) throw new SignatureError('Le motif du refus est obligatoire.')
  const request = await prisma.signatureRequest.findUnique({ where: { id } })
  if (!request) throw new SignatureError('Demande introuvable.')
  if (request.status !== 'EN_ATTENTE') throw new SignatureError('Cette demande a déjà été traitée.')

  const updated = await prisma.signatureRequest.update({
    where: { id },
    data: { status: 'REFUSE', decidedById: auth.userId, decidedAt: new Date(), refusalReason: reason.trim() },
    include: REQUEST_INCLUDE
  })
  await prisma.protocolDocument.update({ where: { id: request.documentId }, data: { status: 'A_REVISER' } })
  return toDisplay(updated)
}
