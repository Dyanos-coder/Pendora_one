import { HeartPulse } from 'lucide-react'

/** Icône de marque Pandora Health (carré dégradé fuchsia→indigo). La mise en forme du
 * wordmark à côté diffère selon le contexte (sidebar dense vs panneau de login spacieux),
 * donc seule cette icône est mutualisée. */
export function BrandMark({ className = 'h-9 w-9' }: { className?: string }): JSX.Element {
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-accent-500 text-white ${className}`}
    >
      <HeartPulse className="h-5 w-5" />
    </div>
  )
}
