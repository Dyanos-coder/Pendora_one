import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

// Marge intérieure par défaut seulement si l'écran n'en impose pas une (p-0, px-…) : deux classes
// de marge en concurrence ne se départagent pas par leur ordre dans la chaîne.
const PADDING_OVERRIDE = /(^|\s)(p|px|py|pt|pb|pl|pr)-/

export function Card({ className = '', children, ...rest }: CardProps): JSX.Element {
  return (
    <div
      className={`rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(10,30,18,0.05),0_6px_18px_rgba(10,30,18,0.05)] ${PADDING_OVERRIDE.test(className) ? '' : 'p-6'} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
