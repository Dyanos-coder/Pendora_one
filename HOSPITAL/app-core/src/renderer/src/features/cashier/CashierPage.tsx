import { useEffect, useState } from 'react'
import { Loader2, MapPin, Plus, Settings, Wallet } from 'lucide-react'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { StatusBadge } from '@renderer/components/StatusBadge'
import type { Session } from '@shared/auth-types'
import type { ApiCashRegister } from '@shared/cashier-types'
import { accessLevel, hasAccess } from '@shared/permissions'
import { CheckoutScreen } from './CheckoutScreen'
import { CashierSettings } from './CashierSettings'
import { OpenSessionModal } from './CashierModals'
import { fcfa, time } from './format'

type View = { kind: 'home' } | { kind: 'session'; sessionId: string } | { kind: 'settings' }

/** Module Caisse (Plan-Module-Caisse.md) : une carte par caisse (statut, caissier, total du jour),
 * ouverture avec fond de caisse, puis écran d'encaissement. Un caissier qui a déjà une caisse
 * ouverte y revient directement. */
export function CashierPage({ session }: { session: Session }): JSX.Element {
  const me = session.user
  const level = accessLevel(me.role, 'cashier')
  const isAdmin = hasAccess(level, 'full')
  const canCash = hasAccess(level, 'write')

  const [view, setView] = useState<View>({ kind: 'home' })
  const [registers, setRegisters] = useState<ApiCashRegister[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState<ApiCashRegister | null>(null)
  const [autoResumed, setAutoResumed] = useState(false)

  async function load(): Promise<void> {
    const result = await window.api.cashier.registers()
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setRegisters(result.data.registers)
    // Arrivée sur le module : reprise automatique de sa propre caisse ouverte.
    if (!autoResumed) {
      setAutoResumed(true)
      const mine = result.data.registers.find((r) => r.openSession?.cashierId === me.id)
      if (mine?.openSession && canCash) setView({ kind: 'session', sessionId: mine.openSession.id })
    }
  }

  useEffect(() => {
    if (view.kind === 'home') void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind])

  if (view.kind === 'session') {
    return <CheckoutScreen sessionId={view.sessionId} isAdmin={isAdmin} onBack={() => setView({ kind: 'home' })} />
  }
  if (view.kind === 'settings') {
    return <CashierSettings onBack={() => setView({ kind: 'home' })} />
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Finance', 'Caisse']}
        title="Caisse"
        subtitle="Encaissement des patients — chaque reçu remonte automatiquement en Comptabilité."
        actions={
          isAdmin ? (
            <Button variant="secondary" size="sm" onClick={() => setView({ kind: 'settings' })}>
              <Settings className="h-3.5 w-3.5" />
              Paramètres de la caisse
            </Button>
          ) : undefined
        }
      />

      {error && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {!registers && !error ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : registers && registers.length === 0 ? (
        <Card className="py-12 text-center">
          <Wallet className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Aucune caisse n&apos;a encore été créée.</p>
          {isAdmin && (
            <Button onClick={() => setView({ kind: 'settings' })} className="mt-4">
              <Plus className="h-4 w-4" />
              Créer la première caisse
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {registers?.map((r) => {
            const open = r.openSession
            const mine = open?.cashierId === me.id
            const authorized = isAdmin || r.cashierIds.includes(me.id)
            return (
              <Card key={r.id} className={`flex flex-col ${r.isActive ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{r.name}</p>
                    {r.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {r.location}
                      </p>
                    )}
                  </div>
                  <StatusBadge
                    label={!r.isActive ? 'Désactivée' : open ? 'Ouverte' : 'Fermée'}
                    tone={!r.isActive ? 'neutral' : open ? 'success' : 'neutral'}
                  />
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <p className="text-gray-500">
                    Caissier : <span className="font-medium text-gray-800">{open ? open.cashierName : '—'}</span>
                    {open && <span className="text-xs text-gray-400"> · depuis {time(open.openedAt)}</span>}
                  </p>
                  <p className="text-gray-500">
                    Aujourd&apos;hui : <span className="font-semibold text-gray-900">{fcfa(r.todayTotal)}</span>{' '}
                    <span className="text-xs text-gray-400">({r.todayCount} reçus)</span>
                  </p>
                </div>
                <div className="mt-4 flex-1" />
                {open ? (
                  mine || isAdmin ? (
                    <Button onClick={() => setView({ kind: 'session', sessionId: open.id })} className="w-full">
                      {mine ? 'Reprendre' : 'Superviser'}
                    </Button>
                  ) : (
                    <Button disabled className="w-full" variant="secondary">
                      Ouverte par {open.cashierName}
                    </Button>
                  )
                ) : (
                  <Button onClick={() => setOpening(r)} disabled={!r.isActive || !canCash || !authorized} className="w-full">
                    Ouvrir
                  </Button>
                )}
                {!open && r.isActive && canCash && !authorized && (
                  <p className="mt-1.5 text-center text-[11px] text-gray-400">Vous n&apos;êtes pas autorisé(e) sur cette caisse.</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {opening && (
        <OpenSessionModal
          registerName={opening.name}
          onClose={() => setOpening(null)}
          onOpened={async (openingFloat) => {
            const result = await window.api.cashier.openSession(opening.id, openingFloat)
            if (!result.ok) return result.error
            setOpening(null)
            setView({ kind: 'session', sessionId: result.data.session.id })
            return null
          }}
        />
      )}
    </div>
  )
}
