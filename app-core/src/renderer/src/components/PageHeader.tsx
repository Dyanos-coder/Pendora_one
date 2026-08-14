import type { ReactNode } from 'react'

interface PageHeaderProps {
  breadcrumb: string[]
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ breadcrumb, title, subtitle, actions }: PageHeaderProps): JSX.Element {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="mb-1 text-xs text-gray-500">
          {breadcrumb.map((step, index) => (
            <span key={step}>
              {index > 0 && <span className="mx-1.5 text-gray-300">/</span>}
              <span className={index === breadcrumb.length - 1 ? 'font-medium text-gray-700' : ''}>
                {step}
              </span>
            </span>
          ))}
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
