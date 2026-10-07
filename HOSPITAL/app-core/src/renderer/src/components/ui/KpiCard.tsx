import type { ComponentType, ReactNode } from 'react'

type KpiTone = 'default' | 'gold' | 'danger' | 'info'

interface KpiCardProps {
  label: string
  value: ReactNode
  /** Petit badge à droite du libellé (évolution, alerte…). */
  badge?: ReactNode
  hint?: string
  icon?: ComponentType<{ className?: string }>
  /** Valeurs récentes : mini-courbe sous le chiffre. */
  trend?: number[]
  tone?: KpiTone
}

const TONE: Record<KpiTone, { stroke: string; fill: string; card: string; icon: string }> = {
  default: { stroke: 'var(--color-accent-500)', fill: 'var(--color-accent-50)', card: '', icon: 'bg-accent-50 text-accent-700' },
  info: { stroke: 'var(--color-blue-500)', fill: 'var(--color-blue-50)', card: '', icon: 'bg-blue-50 text-blue-700' },
  danger: { stroke: 'var(--color-red-500)', fill: 'var(--color-red-50)', card: '', icon: 'bg-red-50 text-red-700' },
  gold: {
    stroke: 'var(--color-gold-500)',
    fill: 'var(--color-gold-100)',
    card: 'border-gold-300/70 bg-gradient-to-br from-gold-50 via-surface to-surface',
    icon: 'bg-gold-100 text-gold-700'
  }
}

function Sparkline({ values, stroke, fill }: { values: number[]; stroke: string; fill: string }): JSX.Element | null {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((v, i) => [(i / (values.length - 1)) * 120, 30 - ((v - min) / span) * 24])
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [lx, ly] = points[points.length - 1]
  return (
    <svg viewBox="0 0 120 34" preserveAspectRatio="none" className="block h-8 w-full" aria-hidden="true">
      <path d={`${line} V34 H0 Z`} style={{ fill }} />
      <path d={line} fill="none" style={{ stroke }} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.6" style={{ fill: stroke }} />
    </svg>
  )
}

/** Indicateur clé du tableau de bord : libellé, chiffre, mini-courbe. `gold` pour l'indicateur phare. */
export function KpiCard({ label, value, badge, hint, icon: Icon, trend, tone = 'default' }: KpiCardProps): JSX.Element {
  const t = TONE[tone]
  return (
    <div
      className={`grid min-w-0 gap-1.5 rounded-2xl border border-gray-200/80 bg-white px-4 pt-4 pb-3 shadow-[0_1px_2px_rgba(10,30,18,0.05),0_6px_18px_rgba(10,30,18,0.05)] ${t.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && (
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${t.icon}`}>
              <Icon className="h-4 w-4" />
            </span>
          )}
          <span className="truncate text-xs font-medium text-gray-500">{label}</span>
        </div>
        {badge}
      </div>
      <div className="font-display text-[26px] leading-tight font-extrabold text-gray-900 tabular-nums">{value}</div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {trend && <Sparkline values={trend} stroke={t.stroke} fill={t.fill} />}
    </div>
  )
}
