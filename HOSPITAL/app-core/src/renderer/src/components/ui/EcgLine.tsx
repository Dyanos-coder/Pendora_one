// Tracé de pouls (ECG), signature visuelle de la marque : séparateur sous les titres, indicateur de
// chargement. La couleur suit `currentColor` (classe text-*).

const ECG_PATH = 'M0 35 H120 L132 35 L140 22 L148 35 H170 L180 35 L188 6 L198 62 L206 35 H240 L252 28 L262 35 H400'

interface EcgLineProps {
  className?: string
  /** Le pouls défile en continu (chargement). */
  animated?: boolean
  strokeWidth?: number
}

export function EcgLine({ className = '', animated = false, strokeWidth = 2.2 }: EcgLineProps): JSX.Element {
  return (
    <svg className={`block ${className}`} viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true">
      <path
        className={animated ? 'animate-ecg-fast' : undefined}
        d={ECG_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
