import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

// Champs de saisie communs : même hauteur, même focus (anneau vert), même état d'erreur partout.

export const inputClass =
  'w-full rounded-[10px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-[inset_0_1px_1px_rgba(10,30,18,0.03)] placeholder:text-gray-400 transition-[border-color,box-shadow] focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500'

const invalidClass = 'border-red-400 focus:border-red-500 focus:ring-red-500/15'

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string | null
  required?: boolean
  children: ReactNode
  className?: string
}

/** Libellé + champ + aide ou erreur. */
export function Field({ label, htmlFor, hint, error, required, children, className = '' }: FieldProps): JSX.Element {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-gray-800">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

interface InvalidProp {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & InvalidProp>(function Input(
  { invalid, className = '', ...rest },
  ref
) {
  return <input ref={ref} className={`${inputClass} ${invalid ? invalidClass : ''} ${className}`} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & InvalidProp>(
  function Textarea({ invalid, className = '', ...rest }, ref) {
    return <textarea ref={ref} className={`${inputClass} min-h-[88px] ${invalid ? invalidClass : ''} ${className}`} {...rest} />
  }
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & InvalidProp>(function Select(
  { invalid, className = '', children, ...rest },
  ref
) {
  return (
    <select ref={ref} className={`${inputClass} cursor-pointer pr-8 ${invalid ? invalidClass : ''} ${className}`} {...rest}>
      {children}
    </select>
  )
})

/** Montant en FCFA, chiffres alignés à droite. */
export const MoneyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & InvalidProp & { currency?: string }>(
  function MoneyInput({ invalid, className = '', currency = 'FCFA', ...rest }, ref) {
    return (
      <div className="relative">
        <input
          ref={ref}
          inputMode="numeric"
          className={`${inputClass} pr-16 text-right tabular-nums ${invalid ? invalidClass : ''} ${className}`}
          {...rest}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-gray-400">
          {currency}
        </span>
      </div>
    )
  }
)
