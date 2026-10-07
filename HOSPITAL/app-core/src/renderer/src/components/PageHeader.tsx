import type { ReactNode } from 'react'
import { EcgLine } from './ui/EcgLine'

interface PageHeaderProps {
  breadcrumb: string[]
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ breadcrumb, title, subtitle, actions }: PageHeaderProps): JSX.Element {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-1.5 text-xs text-gray-500">
          {breadcrumb.map((step, index) => (
            <span key={step}>
              {index > 0 && <span className="mx-1.5 text-gray-300">/</span>}
              <span className={index === breadcrumb.length - 1 ? 'font-medium text-gray-700' : ''}>{step}</span>
            </span>
          ))}
        </p>
        <h1 className="text-[26px] leading-tight font-extrabold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-gray-500">{subtitle}</p>}
        <EcgLine className="mt-2.5 h-3.5 w-28 text-accent-500" />
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
