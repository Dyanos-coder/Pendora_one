import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary : action principale (vert) · secondary · ghost : action discrète · danger · gold :
   * moment important (abonnement), à utiliser avec parcimonie. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-gradient-to-b from-accent-500 to-accent-600 text-white shadow-sm shadow-accent-600/25 hover:from-accent-600 hover:to-accent-700 hover:shadow-[0_0_0_4px_var(--color-accent-100),0_0_18px_rgba(52,204,107,0.35)]',
  secondary: 'border border-gray-300 bg-white text-gray-800 hover:border-gray-400 hover:bg-gray-50',
  ghost: 'text-accent-700 hover:bg-accent-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-[0_0_0_4px_var(--color-red-100)]',
  gold: 'bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 hover:shadow-[0_0_0_4px_var(--color-gold-100),0_6px_20px_rgba(222,161,39,0.35)]'
}

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-[15px]'
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }: ButtonProps): JSX.Element {
  return (
    <button
      className={
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none ' +
        `${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`
      }
      {...rest}
    >
      {children}
    </button>
  )
}
