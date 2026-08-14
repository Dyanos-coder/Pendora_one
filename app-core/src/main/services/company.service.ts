import { getCurrentToken } from './session.store'
import { getCompanyLogo, uploadCompanyLogo } from './remote-api.client'
import type { LogoUploadInput } from '../../shared/company-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function getLogo() {
  return getCompanyLogo(requireToken())
}

export function uploadLogo(input: LogoUploadInput) {
  return uploadCompanyLogo(requireToken(), input)
}
