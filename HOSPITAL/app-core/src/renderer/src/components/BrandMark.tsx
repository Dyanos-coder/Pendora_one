import logo from '../assets/pandora_health_logo.png'

/** Icône de marque Pandora Health. La mise en forme du wordmark à côté diffère selon le
 * contexte (sidebar dense vs panneau de login spacieux), donc seule cette icône est
 * mutualisée. */
export function BrandMark({ className = 'h-9 w-9' }: { className?: string }): JSX.Element {
  return <img src={logo} alt="Pandora Health" className={`rounded-xl ${className}`} />
}
