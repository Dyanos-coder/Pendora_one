import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-sm shadow-accent-500/30 hover:shadow-md hover:shadow-accent-500/40 hover:brightness-105',
  secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700'
}

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-3.5 py-2 text-sm'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      className={
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ' +
        `${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`
      }
      {...rest}
    >
      {children}
    </button>
  )
}
