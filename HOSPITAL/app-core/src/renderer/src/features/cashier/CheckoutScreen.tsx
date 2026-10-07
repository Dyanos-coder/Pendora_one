import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Loader2,
  Lock,
  Printer,
  Search,
  TriangleAlert,
  UserPlus,
  X
} from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Modal } from '@renderer/components/Modal'
import {
  PAYMENT_MODE_LABEL,
  PAYMENT_MODES,
  type ApiCashSession,
  type ApiPaymentMode,
  type ApiPendingExam,
  type ApiReceipt,
  type ApiTariffItem,
  type ReceiptLineInput
} from '@shared/cashier-types'
import type { PatientSummary } from '@shared/patient-types'
import { CloseSessionModal, QuickPatientModal, ReasonModal, inputClass, type QuickPatient } from './CashierModals'
import { RECEIPT_STATUS, fcfa, tileClass, time } from './format'
import { EmptyState } from '@renderer/components/ui/Feedback'

interface CartLine {
  key: string
  label: string
  price: number
  service: string
  input: ReceiptLineInput
}

interface SelectedPatient {
  id: string
  code: string
  name: string
}

interface CheckoutScreenProps {
  sessionId: string
  isAdmin: boolean
  onBack: () => void
}

/** Écran unique d'encaissement (Plan-Module-Caisse.md étape 5) : patient → tuile → Encaisser, le
 * reçu s'imprime aussitôt. Journal de la session et clôture accessibles depuis la barre du haut. */
export function CheckoutScreen({ sessionId, isAdmin, onBack }: CheckoutScreenProps): JSX.Element {
  const [session, setSession] = useState<ApiCashSession | null>(null)
  const [tariffs, setTariffs] = useState<ApiTariffItem[]>([])
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [patient, setPatient] = useState<SelectedPatient | null>(null)
  const [showQuickPatient, setShowQuickPatient] = useState(false)
  const [exams, setExams] = useState<ApiPendingExam[]>([])
  const [examsLoading, setExamsLoading] = useState(false)

  const [serviceFilter, setServiceFilter] = useState<string | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [paymentMode, setPaymentMode] = useState<ApiPaymentMode>('ESPECES')
  const [paymentReference, setPaymentReference] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [lastReceipt, setLastReceipt] = useState<{
    receipt: ApiReceipt
    printError: string | null
  } | null>(null)

  const [showJournal, setShowJournal] = useState(false)
  const [showClose, setShowClose] = useState(false)

  async function refreshSession(): Promise<void> {
    const result = await window.api.cashier.getSession(sessionId)
    if (result.ok) setSession(result.data.session)
    else setLoadError(result.error)
  }

  useEffect(() => {
    // Tout est chargé une fois à l'ouverture : l'encaissement ne fait ensuite qu'un seul appel.
    void refreshSession()
    window.api.cashier.tariffs().then((r) => (r.ok ? setTariffs(r.data.tariffs.filter((t) => t.isActive)) : setLoadError(r.error)))
    window.api.patients.list().then((r) => r.ok && setPatients(r.data.patients))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    if (!patient) {
      setExams([])
      return
    }
    let cancelled = false
    setExamsLoading(true)
    window.api.cashier.pendingExams(patient.id).then((r) => {
      if (cancelled) return
      setExams(r.ok ? r.data.exams : [])
      setExamsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [patient])

  const services = useMemo(() => [...new Set(tariffs.map((t) => t.service))], [tariffs])
  const visibleTariffs = serviceFilter ? tariffs.filter((t) => t.service === serviceFilter) : tariffs

  // Liste déroulante de tous les patients de l'hôpital, triés par nom, filtrée pendant la frappe.
  const sortedPatients = useMemo(
    () => [...patients].sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr')),
    [patients]
  )
  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr-FR')
    if (!q) return sortedPatients
    return sortedPatients.filter((p) =>
      `${p.lastName} ${p.firstName} ${p.firstName} ${p.lastName} ${p.code}`.toLocaleLowerCase('fr-FR').includes(q)
    )
  }, [sortedPatients, query])
  const [listOpen, setListOpen] = useState(false)
  const MAX_LISTED = 300

  const total = cart.reduce((sum, l) => sum + l.price, 0)
  const cartService = cart[0]?.service ?? null

  function selectPatient(p: SelectedPatient): void {
    setPatient(p)
    setQuery('')
    setLastReceipt(null)
    setCart([])
  }

  function addLine(line: CartLine): void {
    setNotice(null)
    setLastReceipt(null)
    if (cart.some((l) => l.key === line.key)) return
    // Un reçu = un service : ajouter un autre service remplace le panier.
    if (cartService && line.service !== cartService) {
      setCart([line])
      setNotice(`Un reçu par service : le panier « ${cartService} » a été remplacé.`)
      return
    }
    setCart([...cart, line])
  }

  async function handleCheckout(): Promise<void> {
    if (!patient || cart.length === 0) return
    setPaying(true)
    setPayError(null)
    const result = await window.api.cashier.checkout({
      sessionId,
      patientId: patient.id,
      lines: cart.map((l) => l.input),
      paymentMode,
      paymentReference: paymentMode === 'ESPECES' ? null : paymentReference.trim() || null
    })
    setPaying(false)
    if (!result.ok) {
      setPayError(result.error)
      return
    }
    setLastReceipt({
      receipt: result.data.receipt,
      printError: result.printError
    })
    // Prêt pour le patient suivant.
    setCart([])
    setPatient(null)
    setPaymentMode('ESPECES')
    setPaymentReference('')
    setNotice(null)
    void refreshSession()
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour aux caisses
        </Button>
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{loadError}</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    )
  }

  const closed = Boolean(session.closedAt)

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Barre de la caisse */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} title="Retour aux caisses" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-semibold text-gray-900">{session.registerName}</p>
            <p className="text-xs text-gray-500">
              {session.cashierName} · ouverte à {time(session.openedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Encaissé</p>
            <p className="text-sm font-semibold text-gray-900">
              {fcfa(session.total)} <span className="text-xs font-normal text-gray-400">({session.receiptCount} reçus)</span>
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowJournal(true)}>
            <ClipboardList className="h-3.5 w-3.5" />
            Journal
          </Button>
          {!closed && (
            <Button variant="secondary" size="sm" onClick={() => setShowClose(true)}>
              <Lock className="h-3.5 w-3.5" />
              Clôturer
            </Button>
          )}
        </div>
      </div>

      {closed ? (
        <p className="rounded-lg bg-gray-100 p-4 text-sm text-gray-600">Cette session est clôturée.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* 1. Patient */}
          <div className="space-y-3 lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">1. Patient</p>
            {patient ? (
              <div className="flex items-start justify-between rounded-xl border-2 border-accent-500 bg-accent-50 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{patient.name}</p>
                  <p className="text-xs text-gray-500">{patient.code}</p>
                </div>
                <button onClick={() => setPatient(null)} title="Changer de patient" className="text-gray-400 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setListOpen(true)
                    }}
                    onFocus={() => setListOpen(true)}
                    onClick={() => setListOpen(true)}
                    // Laisse le temps au clic sur un patient de la liste d'être pris en compte.
                    onBlur={() => setTimeout(() => setListOpen(false), 150)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setListOpen(false)
                      if (e.key === 'Enter' && matches[0]) {
                        const p = matches[0]
                        selectPatient({
                          id: p.id,
                          code: p.code,
                          name: `${p.lastName.toLocaleUpperCase('fr-FR')} ${p.firstName}`
                        })
                        setListOpen(false)
                      }
                    }}
                    autoFocus
                    placeholder="Choisir un patient…"
                    className={`${inputClass} pl-9 pr-9`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setListOpen(!listOpen)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${listOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {listOpen && (
                    <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <p className="px-3 pb-1 pt-1.5 text-[11px] text-gray-400">
                        {matches.length} patient{matches.length > 1 ? 's' : ''}
                      </p>
                      {matches.slice(0, MAX_LISTED).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            selectPatient({
                              id: p.id,
                              code: p.code,
                              name: `${p.lastName.toLocaleUpperCase('fr-FR')} ${p.firstName}`
                            })
                            setListOpen(false)
                          }}
                          className="block w-full px-3 py-2 text-left hover:bg-accent-50"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {p.lastName.toLocaleUpperCase('fr-FR')} {p.firstName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {p.code} · {p.age} ans
                          </p>
                        </button>
                      ))}
                      {matches.length > MAX_LISTED && (
                        <p className="px-3 py-2 text-[11px] text-gray-400">
                          … {matches.length - MAX_LISTED} autres : tapez un nom ou un n° pour affiner.
                        </p>
                      )}
                      {matches.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Aucun patient trouvé.</p>}
                    </div>
                  )}
                </div>
                <Button variant="secondary" onClick={() => setShowQuickPatient(true)} className="w-full">
                  <UserPlus className="h-4 w-4" />
                  Nouveau patient
                </Button>
              </>
            )}
          </div>

          {/* 2. Service à payer */}
          <div className="space-y-3 lg:col-span-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">2. Service à payer</p>

            {patient && (examsLoading || exams.length > 0) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <p className="mb-2 text-xs font-semibold text-amber-800">Examens prescrits non payés</p>
                {examsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                ) : (
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                    {exams.map((exam) => (
                      <button
                        key={exam.examId}
                        disabled={exam.price === null}
                        onClick={() =>
                          exam.price !== null &&
                          addLine({
                            key: `exam-${exam.examId}`,
                            label: exam.label,
                            price: exam.price,
                            service: exam.service,
                            input: {
                              examType: exam.examType,
                              examId: exam.examId
                            }
                          })
                        }
                        title={exam.price === null ? 'Aucun tarif défini dans le catalogue pour cet examen' : undefined}
                        className="rounded-lg border border-amber-200 bg-white p-2.5 text-left transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <p className="truncate text-sm font-medium text-gray-900">{exam.label}</p>
                        <p className="text-xs text-gray-500">{exam.service}</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {exam.price === null ? 'Tarif non défini' : fcfa(exam.price)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setServiceFilter(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${serviceFilter === null ? 'bg-accent-600 text-white shadow-sm shadow-accent-600/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Tous
              </button>
              {services.map((s) => (
                <button
                  key={s}
                  onClick={() => setServiceFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${serviceFilter === s ? 'bg-accent-600 text-white shadow-sm shadow-accent-600/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {tariffs.length === 0 ? (
              <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                Le catalogue de tarifs est vide.{' '}
                {isAdmin ? 'Ajoutez des tarifs dans les paramètres de la caisse.' : 'Demandez au dirigeant de le compléter.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                {visibleTariffs.map((t) => (
                  <button
                    key={t.id}
                    disabled={!patient}
                    onClick={() =>
                      addLine({
                        key: `tariff-${t.id}`,
                        label: t.label,
                        price: t.price,
                        service: t.service,
                        input: { tariffItemId: t.id }
                      })
                    }
                    className={`min-h-[84px] rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tileClass(t.color)}`}
                  >
                    <p className="text-sm font-semibold leading-tight">{t.label}</p>
                    <p className="mt-0.5 text-[11px] opacity-70">{t.service}</p>
                    <p className="mt-1.5 text-sm font-bold">{fcfa(t.price)}</p>
                  </button>
                ))}
              </div>
            )}
            {!patient && tariffs.length > 0 && <p className="text-xs text-gray-400">Sélectionnez d&apos;abord un patient.</p>}
          </div>

          {/* 3. Paiement */}
          <div className="space-y-3 lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">3. Paiement</p>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              {cart.length === 0 ? (
                <EmptyState title="Aucun service sélectionné." />
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500">{cartService}</p>
                  {cart.map((line) => (
                    <div key={line.key} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-gray-700">{line.label}</span>
                      <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-gray-900">
                        {fcfa(line.price)}
                        <button
                          onClick={() => setCart(cart.filter((l) => l.key !== line.key))}
                          className="text-gray-300 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {notice && <p className="mt-2 text-[11px] text-amber-700">{notice}</p>}
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-xl font-display font-extrabold tabular-nums text-gray-900">{fcfa(total)}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {PAYMENT_MODES.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium ${paymentMode === mode ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {PAYMENT_MODE_LABEL[mode]}
                  </button>
                ))}
              </div>
              {paymentMode !== 'ESPECES' && (
                <input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={paymentMode === 'PRISE_EN_CHARGE' ? 'Organisme / n° de prise en charge' : 'N° de transaction'}
                  className={`${inputClass} mt-2`}
                />
              )}

              {payError && <p className="mt-2 text-xs text-red-500">{payError}</p>}
              <Button onClick={handleCheckout} disabled={!patient || cart.length === 0 || paying} className="mt-3 w-full py-3 text-base">
                {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Encaisser
              </Button>
            </div>

            {lastReceipt && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-teal-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Reçu {lastReceipt.receipt.number}
                </p>
                <p className="mt-1 text-xs text-teal-700">
                  {lastReceipt.receipt.patientName} — {fcfa(lastReceipt.receipt.amount)}
                </p>
                {lastReceipt.receipt.queueNumber !== null && (
                  <p className="mt-2 text-sm text-teal-800">
                    N° de passage <span className="text-2xl font-bold">{lastReceipt.receipt.queueNumber}</span>
                  </p>
                )}
                {lastReceipt.printError && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {lastReceipt.printError}
                  </p>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.api.cashier.printReceipt(lastReceipt.receipt.id, true)}
                  className="mt-2"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Réimprimer
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {showQuickPatient && (
        <QuickPatientModal
          onClose={() => setShowQuickPatient(false)}
          onCreated={(p: QuickPatient) => {
            setShowQuickPatient(false)
            selectPatient({
              id: p.id,
              code: p.code,
              name: `${p.lastName.toLocaleUpperCase('fr-FR')} ${p.firstName}`
            })
          }}
        />
      )}

      {showJournal && (
        <SessionJournal sessionId={sessionId} isAdmin={isAdmin} onClose={() => setShowJournal(false)} onChanged={refreshSession} />
      )}

      {showClose && (
        <CloseSessionModal
          session={session}
          onClose={() => setShowClose(false)}
          onClosed={async (countedAmounts, note) => {
            const result = await window.api.cashier.closeSession(sessionId, {
              countedAmounts,
              note
            })
            if (!result.ok) return result.error
            await window.api.cashier.printSessionReport(sessionId)
            setShowClose(false)
            onBack()
            return null
          }}
        />
      )}
    </div>
  )
}

/** Journal de la session : réimpression, annulation (motif), remboursement (dirigeant). */
function SessionJournal({
  sessionId,
  isAdmin,
  onClose,
  onChanged
}: {
  sessionId: string
  isAdmin: boolean
  onClose: () => void
  onChanged: () => void
}): JSX.Element {
  const [receipts, setReceipts] = useState<ApiReceipt[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<{
    kind: 'cancel' | 'refund'
    receipt: ApiReceipt
  } | null>(null)

  async function load(): Promise<void> {
    const result = await window.api.cashier.receipts({ sessionId })
    if (result.ok) setReceipts(result.data.receipts)
    else setError(result.error)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  return (
    <Modal title="Journal de la caisse" onClose={onClose} widthClassName="max-w-4xl">
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      {!receipts ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-300" />
      ) : receipts.length === 0 ? (
        <EmptyState title="Aucun reçu pour cette session." />
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2 font-medium">Heure</th>
                <th className="py-2 font-medium">N°</th>
                <th className="py-2 font-medium">Patient</th>
                <th className="py-2 font-medium">Service</th>
                <th className="py-2 text-right font-medium">Montant</th>
                <th className="py-2 font-medium">Statut</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="py-2 text-gray-500">{time(r.issuedAt)}</td>
                  <td className="py-2 font-medium text-gray-900">{r.number}</td>
                  <td className="py-2 text-gray-700">{r.patientName}</td>
                  <td className="py-2 text-gray-600">{r.service}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{fcfa(r.amount)}</td>
                  <td className="py-2">
                    <StatusBadge label={RECEIPT_STATUS[r.status].label} tone={RECEIPT_STATUS[r.status].tone} />
                  </td>
                  <td className="py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => window.api.cashier.printReceipt(r.id, true)}
                        title="Réimprimer"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      {r.status === 'PAYE' && (
                        <button
                          onClick={() => setAction({ kind: 'cancel', receipt: r })}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Annuler
                        </button>
                      )}
                      {r.status === 'PAYE' && isAdmin && (
                        <button
                          onClick={() => setAction({ kind: 'refund', receipt: r })}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                        >
                          Rembourser
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {action && (
        <ReasonModal
          title={action.kind === 'cancel' ? `Annuler le reçu ${action.receipt.number}` : `Rembourser le reçu ${action.receipt.number}`}
          description={
            action.kind === 'cancel'
              ? 'Le reçu passera à « Annulé » et la recette correspondante sera annulée en Comptabilité.'
              : 'Une sortie « Remboursement caisse » sera enregistrée en Comptabilité.'
          }
          confirmLabel={action.kind === 'cancel' ? 'Annuler le reçu' : 'Rembourser'}
          onClose={() => setAction(null)}
          onConfirm={async (reason) => {
            const result =
              action.kind === 'cancel'
                ? await window.api.cashier.cancelReceipt(action.receipt.id, reason)
                : await window.api.cashier.refundReceipt(action.receipt.id, reason)
            if (!result.ok) return result.error
            setAction(null)
            await load()
            onChanged()
            return null
          }}
        />
      )}
    </Modal>
  )
}
