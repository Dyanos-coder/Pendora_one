import type { ApiReceiptStatus } from '@shared/cashier-types'
import type { StatusTone } from '@renderer/components/StatusBadge'

export function fcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

export function dateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export const RECEIPT_STATUS: Record<ApiReceiptStatus, { label: string; tone: StatusTone }> = {
  PAYE: { label: 'Payé', tone: 'success' },
  ANNULE: { label: 'Annulé', tone: 'danger' },
  REMBOURSE: { label: 'Remboursé', tone: 'warning' }
}

/** Couleurs de tuiles du catalogue — classes écrites en entier pour que Tailwind les détecte. */
export const TILE_COLORS: Record<string, { label: string; tile: string; swatch: string }> = {
  emerald: { label: 'Vert', tile: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900', swatch: 'bg-emerald-400' },
  sky: { label: 'Bleu', tile: 'border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-900', swatch: 'bg-sky-400' },
  violet: { label: 'Violet', tile: 'border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-900', swatch: 'bg-violet-400' },
  amber: { label: 'Orange', tile: 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900', swatch: 'bg-amber-400' },
  rose: { label: 'Rose', tile: 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900', swatch: 'bg-rose-400' },
  slate: { label: 'Gris', tile: 'border-gray-200 bg-white hover:bg-gray-50 text-gray-900', swatch: 'bg-gray-400' }
}

export function tileClass(color: string | null): string {
  return (TILE_COLORS[color ?? 'slate'] ?? TILE_COLORS.slate).tile
}

/** Bornes ISO d'une journée locale (champ date `AAAA-MM-JJ`). */
export function dayRange(from: string, to: string): { from: string; to: string } {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T23:59:59.999`)
  return { from: start.toISOString(), to: end.toISOString() }
}

export function todayInput(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
