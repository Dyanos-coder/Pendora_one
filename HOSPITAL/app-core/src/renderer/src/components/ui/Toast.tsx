import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, CircleAlert, Info, X } from 'lucide-react'

// Notifications passagères (« Reçu enregistré », « Erreur de connexion »…), empilées en bas à droite.

type ToastTone = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

interface ToastApi {
  show: (toast: { tone?: ToastTone; title: string; description?: string; durationMs?: number }) => void
}

const ToastContext = createContext<ToastApi>({ show: () => undefined })

const TONE: Record<ToastTone, { icon: typeof Check; color: string }> = {
  success: { icon: Check, color: 'text-[#34cc6b]' },
  error: { icon: CircleAlert, color: 'text-[#f87171]' },
  warning: { icon: AlertTriangle, color: 'text-[#efbc48]' },
  info: { icon: Info, color: 'text-[#6aa5ff]' }
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const show = useCallback<ToastApi['show']>(
    ({ tone = 'success', title, description, durationMs = 4500 }) => {
      const id = nextId++
      setToasts((list) => [...list.slice(-3), { id, tone, title, description }])
      setTimeout(() => dismiss(id), durationMs)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed right-5 bottom-5 z-[90] flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const { icon: Icon, color } = TONE[t.tone]
          return (
            <div
              key={t.id}
              className="animate-pop-in pointer-events-auto flex items-start gap-3 rounded-xl border border-white/[0.06] bg-ink-900 px-4 py-3 text-sm text-[#d3e0d8] shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
            >
              <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${color}`} strokeWidth={2.4} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-[#8fa398]">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} aria-label="Fermer" className="text-[#74877c] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  return useContext(ToastContext)
}
