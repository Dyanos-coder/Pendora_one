import { useEffect, useState } from 'react'
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { Button } from '@renderer/components/Button'
import type { ApiCompanyLogo } from '@shared/company-types'

/** Base64 → URL `blob:` (la politique de sécurité du renderer n'autorise pas les images `data:`). */
function toObjectUrl(logo: ApiCompanyLogo): string {
  const bytes = Uint8Array.from(atob(logo.contentBase64), (c) => c.charCodeAt(0))
  return URL.createObjectURL(new Blob([bytes], { type: logo.mimeType }))
}

/** Paramètres › Établissement : logo repris sur les reçus de caisse et les documents imprimés. */
export function CompanyLogoCard({ canEdit }: { canEdit: boolean }): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function showLogo(logo: ApiCompanyLogo | null): void {
    setUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return logo ? toObjectUrl(logo) : null
    })
  }

  async function reload(): Promise<void> {
    const result = await window.api.company.getLogo()
    if (result.ok) showLogo(result.data.logo)
    else setError(result.error)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
    return () => showLogo(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpload(): Promise<void> {
    setBusy(true)
    setError(null)
    const result = await window.api.company.uploadLogo()
    if (result && !result.ok) setError(result.error)
    if (result?.ok) await reload()
    setBusy(false)
  }

  async function handleRemove(): Promise<void> {
    setBusy(true)
    setError(null)
    const result = await window.api.company.removeLogo()
    if (result.ok) showLogo(null)
    else setError(result.error)
    setBusy(false)
  }

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Logo de l&apos;établissement</h3>
      <p className="mb-4 text-xs text-gray-500">Imprimé en tête des reçus de caisse. PNG, JPEG ou WebP, 2 Mo maximum.</p>
      <div className="flex items-center gap-5">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          ) : url ? (
            <img src={url} alt="Logo de l'établissement" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-7 w-7 text-gray-300" />
          )}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleUpload} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {url ? 'Changer le logo' : 'Téléverser un logo'}
            </Button>
            {url && (
              <Button size="sm" variant="secondary" onClick={handleRemove} disabled={busy}>
                <Trash2 className="h-3.5 w-3.5" />
                Retirer
              </Button>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </Card>
  )
}
