import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Building2, ShieldCheck, Bell, History, ImageOff } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import type { Session } from '@shared/auth-types'

interface SettingsPageProps {
  session: Session
}

type Tab = 'general' | 'security' | 'notifications' | 'audit'

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: 'general', label: 'Général', icon: Building2 },
  { id: 'security', label: 'Sécurité', icon: ShieldCheck },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'audit', label: 'Audit & traçabilité', icon: History }
]

const AUDIT_LOG = [
  { date: "Aujourd'hui, 08:12", user: 'Amina Dirigeante', action: 'Connexion', detail: 'Depuis ce poste' },
  { date: 'Hier, 18:40', user: 'Jean Lefebvre', action: 'Facture créée', detail: '#INV-2023-089' },
  { date: 'Hier, 14:02', user: 'Amina Dirigeante', action: 'Utilisateur invité', detail: 'sophie.r@entreprise.com' },
  { date: '12 Oct 2023, 09:15', user: 'Marc Kone', action: 'Stock ajusté', detail: 'Produit X : -12 unités' }
]

function Toggle({ defaultChecked }: { defaultChecked?: boolean }): JSX.Element {
  const [checked, setChecked] = useState(Boolean(defaultChecked))
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => setChecked((c) => !c)}
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-accent-500' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function SettingsPage({ session }: SettingsPageProps): JSX.Element {
  const [tab, setTab] = useState<Tab>('general')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoLoading, setLogoLoading] = useState(true)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoObjectUrl = useRef<string | null>(null)

  async function loadLogo(): Promise<void> {
    setLogoLoading(true)
    setLogoError(null)

    const result = await window.api.company.getLogo()

    if (!result.ok) {
      if (result.error !== 'Aucun logo configuré.') setLogoError(result.error)
      setLogoUrl(null)
      setLogoLoading(false)
      return
    }

    if (logoObjectUrl.current) URL.revokeObjectURL(logoObjectUrl.current)
    const url = URL.createObjectURL(new Blob([result.data.data], { type: result.data.mimeType }))
    logoObjectUrl.current = url
    setLogoUrl(url)
    setLogoLoading(false)
  }

  useEffect(() => {
    loadLogo()
    return () => {
      if (logoObjectUrl.current) URL.revokeObjectURL(logoObjectUrl.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setLogoUploading(true)
    setLogoError(null)
    const data = await file.arrayBuffer()
    const result = await window.api.company.uploadLogo({ data, mimeType: file.type })
    setLogoUploading(false)

    if (!result.ok) {
      setLogoError(result.error)
      return
    }

    await loadLogo()
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader breadcrumb={['Entreprise', 'Paramètres']} title="Paramètres" />

      <div className="flex gap-8">
        <nav className="w-48 shrink-0 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
                (tab === t.id ? 'bg-accent-50 text-accent-700' : 'text-gray-600 hover:bg-gray-100')
              }
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1">
          {tab === 'general' && (
            <div className="space-y-6">
            <Card>
              <h2 className="text-sm font-semibold text-gray-900">Logo de l&apos;entreprise</h2>
              <p className="mt-1 text-xs text-gray-500">
                Utilisé sur les PDF générés automatiquement pour les factures sans photo jointe.
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {logoLoading ? (
                    <span className="text-xs text-gray-400">…</span>
                  ) : logoUrl ? (
                    <img src={logoUrl} alt="Logo de l'entreprise" className="h-full w-full object-contain" />
                  ) : (
                    <ImageOff className="h-6 w-6 text-gray-300" />
                  )}
                </div>
                <div>
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    {logoUploading ? 'Envoi…' : logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      disabled={logoUploading}
                      className="hidden"
                    />
                  </label>
                  {logoError && <p className="mt-2 text-xs text-red-600">{logoError}</p>}
                </div>
              </div>
            </Card>
            <Card>
              <h2 className="text-sm font-semibold text-gray-900">Informations de l&apos;entreprise</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Nom de l&apos;entreprise</label>
                  <input
                    readOnly
                    value={session.company.name}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Secteur</label>
                  <input
                    readOnly
                    value={session.company.sector ?? 'Non défini'}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 capitalize"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Administrateur</label>
                  <input
                    readOnly
                    value={`${session.user.name} — ${session.user.email}`}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                  />
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-400">
                Modification des informations d&apos;entreprise disponible dans une prochaine itération.
              </p>
            </Card>
            </div>
          )}

          {tab === 'security' && (
            <Card>
              <h2 className="text-sm font-semibold text-gray-900">Changer de mot de passe</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Mot de passe actuel</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Nouveau mot de passe</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                  />
                </div>
                <button className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
                  Mettre à jour le mot de passe
                </button>
              </div>
            </Card>
          )}

          {tab === 'notifications' && (
            <Card>
              <h2 className="text-sm font-semibold text-gray-900">Préférences d&apos;alertes</h2>
              <p className="mt-1 text-xs text-gray-500">Choisissez les niveaux d&apos;alerte qui déclenchent une notification.</p>
              <div className="mt-4 divide-y divide-gray-100">
                {[
                  { label: 'Critique', desc: 'Action immédiate requise', checked: true },
                  { label: 'Élevé', desc: 'Risque important à court terme', checked: true },
                  { label: 'Prévention', desc: 'Tendance à surveiller', checked: false },
                  { label: 'Opportunité', desc: 'Possibilité de croissance détectée', checked: true }
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{row.label}</p>
                      <p className="text-xs text-gray-500">{row.desc}</p>
                    </div>
                    <Toggle defaultChecked={row.checked} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'audit' && (
            <Card className="p-0">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Journal d&apos;audit</h2>
                <p className="text-xs text-gray-500">Registre immuable de toutes les actions significatives (§3.8).</p>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-2.5 font-medium">Date</th>
                    <th className="px-6 py-2.5 font-medium">Utilisateur</th>
                    <th className="px-6 py-2.5 font-medium">Action</th>
                    <th className="px-6 py-2.5 font-medium">Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {AUDIT_LOG.map((entry) => (
                    <tr key={entry.date + entry.action} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-3 text-gray-500">{entry.date}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{entry.user}</td>
                      <td className="px-6 py-3 text-gray-700">{entry.action}</td>
                      <td className="px-6 py-3 text-gray-500">{entry.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
