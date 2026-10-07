import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { PAYMENT_MODE_LABEL, PAYMENT_MODES, type ApiCashRegister, type ApiCashSession, type ApiReceipt } from '@shared/cashier-types'
import { RECEIPT_STATUS, dateTime, dayRange, fcfa, todayInput } from '@renderer/features/cashier/format'
import { EmptyState } from '@renderer/components/ui/Feedback'

/** Comptabilité › Caisses : tout ce que les caisses envoient — journal des reçus, sessions et
 * clôtures (avec écarts), totaux par caisse et par mode (Plan-Module-Caisse.md étape 8). */
export function CashRegistersTab(): JSX.Element {
  const [from, setFrom] = useState(todayInput())
  const [to, setTo] = useState(todayInput())
  const [registerId, setRegisterId] = useState('')
  const [registers, setRegisters] = useState<ApiCashRegister[]>([])
  const [receipts, setReceipts] = useState<ApiReceipt[] | null>(null)
  const [sessions, setSessions] = useState<ApiCashSession[]>([])
  const [view, setView] = useState<'receipts' | 'sessions'>('receipts')
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    // La liste des caisses n'est lisible qu'avec un accès à la Caisse : filtre facultatif.
    window.api.cashier.registers().then((r) => r.ok && setRegisters(r.data.registers))
  }, [])

  useEffect(() => {
    let cancelled = false
    const filters = {
      ...dayRange(from, to),
      registerId: registerId || undefined
    }
    setReceipts(null)
    Promise.all([window.api.cashier.receipts(filters), window.api.cashier.sessions(filters)]).then(([r, s]) => {
      if (cancelled) return
      if (r.ok) setReceipts(r.data.receipts)
      else setError(r.error)
      if (s.ok) setSessions(s.data.sessions)
    })
    return () => {
      cancelled = true
    }
  }, [from, to, registerId])

  const totals = useMemo(() => {
    const paid = (receipts ?? []).filter((r) => r.status !== 'ANNULE')
    const byMode = Object.fromEntries(PAYMENT_MODES.map((m) => [m, 0])) as Record<string, number>
    for (const r of paid) byMode[r.paymentMode] += r.amount
    return {
      total: paid.reduce((sum, r) => sum + r.amount, 0),
      count: paid.length,
      cancelled: (receipts ?? []).filter((r) => r.status === 'ANNULE').length,
      refunded: (receipts ?? []).filter((r) => r.status === 'REMBOURSE').reduce((sum, r) => sum + r.amount, 0),
      byMode
    }
  }, [receipts])

  async function handleExport(): Promise<void> {
    setExporting(true)
    try {
      await window.api.cashier.exportJournal({
        ...dayRange(from, to),
        registerId: registerId || undefined
      })
    } finally {
      setExporting(false)
    }
  }

  const fieldClass =
    'rounded-[10px] border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          Du <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
          au <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
          {registers.length > 0 && (
            <select value={registerId} onChange={(e) => setRegisterId(e.target.value)} className={fieldClass}>
              <option value="">Toutes les caisses</option>
              {registers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
          Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-gray-100 px-6 py-4 md:grid-cols-4">
        <Stat label="Encaissé" value={fcfa(totals.total)} hint={`${totals.count} reçus`} />
        {PAYMENT_MODES.map((m) => (
          <Stat key={m} label={PAYMENT_MODE_LABEL[m]} value={fcfa(totals.byMode[m])} />
        ))}
        <Stat label="Reçus annulés" value={String(totals.cancelled)} />
        <Stat label="Remboursé" value={fcfa(totals.refunded)} />
        <Stat label="Sessions" value={String(sessions.length)} />
      </div>

      <div className="flex gap-1 px-6 pt-3">
        {(['receipts', 'sessions'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${view === v ? 'bg-accent-600 text-white shadow-sm shadow-accent-600/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {v === 'receipts' ? 'Journal des reçus' : 'Sessions et clôtures'}
          </button>
        ))}
      </div>

      {error && <p className="px-6 py-3 text-xs text-red-500">{error}</p>}

      <div className="overflow-x-auto px-6 py-3">
        {!receipts ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : view === 'receipts' ? (
          receipts.length === 0 ? (
            <EmptyState title="Aucun reçu sur cette période." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">N° reçu</th>
                  <th className="py-2 font-medium">Caisse</th>
                  <th className="py-2 font-medium">Patient</th>
                  <th className="py-2 font-medium">Service</th>
                  <th className="py-2 font-medium">Mode</th>
                  <th className="py-2 text-right font-medium">Montant</th>
                  <th className="py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100" title={r.cancelReason ?? r.refundReason ?? undefined}>
                    <td className="py-2 text-gray-500">{dateTime(r.issuedAt)}</td>
                    <td className="py-2 font-medium text-gray-900">{r.number}</td>
                    <td className="py-2 text-gray-600">
                      {r.registerName}
                      <span className="block text-[11px] text-gray-400">{r.cashierName}</span>
                    </td>
                    <td className="py-2 text-gray-700">{r.patientName}</td>
                    <td className="py-2 text-gray-600">{r.service}</td>
                    <td className="py-2 text-gray-600">{PAYMENT_MODE_LABEL[r.paymentMode]}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{fcfa(r.amount)}</td>
                    <td className="py-2">
                      <StatusBadge label={RECEIPT_STATUS[r.status].label} tone={RECEIPT_STATUS[r.status].tone} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : sessions.length === 0 ? (
          <EmptyState title="Aucune session sur cette période." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2 font-medium">Caisse</th>
                <th className="py-2 font-medium">Caissier</th>
                <th className="py-2 font-medium">Ouverture</th>
                <th className="py-2 font-medium">Clôture</th>
                <th className="py-2 text-right font-medium">Encaissé</th>
                <th className="py-2 text-right font-medium">Écart</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-gray-100" title={s.closingNote ?? undefined}>
                  <td className="py-2 font-medium text-gray-900">{s.registerName}</td>
                  <td className="py-2 text-gray-600">{s.cashierName}</td>
                  <td className="py-2 text-gray-500">{dateTime(s.openedAt)}</td>
                  <td className="py-2 text-gray-500">
                    {s.closedAt ? dateTime(s.closedAt) : <StatusBadge label="Ouverte" tone="success" />}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900">{fcfa(s.total)}</td>
                  <td
                    className={`py-2 text-right font-medium ${s.difference === null ? 'text-gray-400' : s.difference === 0 ? 'text-teal-600' : 'text-amber-700'}`}
                  >
                    {s.difference === null ? '—' : `${s.difference > 0 ? '+' : ''}${fcfa(s.difference)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}
