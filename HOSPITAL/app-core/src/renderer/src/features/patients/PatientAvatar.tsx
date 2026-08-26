import type { Patient } from './types'

interface PatientAvatarProps {
  patient: Pick<Patient, 'firstName' | 'lastName'>
  size?: 'sm' | 'lg'
}

const SIZE_CLASSES: Record<'sm' | 'lg', string> = {
  sm: 'h-8 w-8 text-xs',
  lg: 'h-16 w-16 text-lg'
}

export function PatientAvatar({ patient, size = 'sm' }: PatientAvatarProps): JSX.Element {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent-50 font-semibold text-accent-700 ${SIZE_CLASSES[size]}`}
    >
      {patient.firstName[0]}
      {patient.lastName[0]}
    </span>
  )
}
