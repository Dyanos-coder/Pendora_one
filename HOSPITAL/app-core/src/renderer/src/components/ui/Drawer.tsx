import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  widthClassName?: string
}

/** Panneau latéral : consulter ou modifier un élément sans quitter la liste. */
export function Drawer({ title, subtitle, onClose, children, footer, widthClassName = 'max-w-xl' }: DrawerProps): JSX.Element {
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`animate-slide-in flex h-full w-full ${widthClassName} flex-col border-l border-gray-200 bg-surface shadow-[-24px_0_60px_rgba(5,20,12,0.22)]`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">{footer}</footer>}
      </aside>
    </div>
  )
}
