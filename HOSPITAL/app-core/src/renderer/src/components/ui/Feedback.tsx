import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { EcgLine } from './EcgLine'

/** Écran vide (aucune donnée) : croix médicale de la marque, message et action éventuelle. */
export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center">
      <div className="grid h-13 w-13 place-items-center rounded-2xl bg-accent-50 text-accent-700 ring-1 ring-accent-500/15">
        {icon ?? <Plus className="h-6 w-6" strokeWidth={2.6} />}
      </div>
      <p className="font-display text-[15px] font-bold text-gray-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Indicateur de chargement : le pouls défile. */
export function PulseLoader({ label = 'Chargement…', className = '' }: { label?: string; className?: string }): JSX.Element {
  return (
    <div className={`flex items-center justify-center gap-3 py-8 text-sm text-gray-500 ${className}`} role="status">
      <EcgLine animated className="h-7 w-28 text-accent-500" />
      {label}
    </div>
  )
}

/** Lignes de chargement (à la place d'un écran vide pendant le chargement d'une liste). */
export function Skeleton({ lines = 3, className = '' }: { lines?: number; className?: string }): JSX.Element {
  const widths = ['w-4/5', 'w-3/5', 'w-2/3', 'w-1/2', 'w-3/4']
  return (
    <div className={`grid gap-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={`animate-shimmer h-3 rounded-md ${widths[i % widths.length]}`} />
      ))}
    </div>
  )
}
