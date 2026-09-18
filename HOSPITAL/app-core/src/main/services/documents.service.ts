import { getCurrentToken } from './session.store'
import { createProtocolDocument, deleteProtocolDocument, listProtocolDocuments, updateProtocolDocument } from './remote-api.client'
import type { CreateProtocolDocumentInput, UpdateProtocolDocumentInput } from '../../shared/documents-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listProtocolDocuments(requireToken())
}

export function create(input: CreateProtocolDocumentInput) {
  return createProtocolDocument(requireToken(), input)
}

export function update(id: string, input: UpdateProtocolDocumentInput) {
  return updateProtocolDocument(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteProtocolDocument(requireToken(), id)
}
