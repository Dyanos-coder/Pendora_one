const DAY_ABBR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre'
]

export function mondayOf(date: Date): Date {
  const day = date.getDay() // 0 = dimanche ... 6 = samedi
  const diffToMonday = day === 0 ? -6 : 1 - day
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function dayIndexInWeek(monday: Date, date: Date): number {
  const diffMs = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - monday.getTime()
  return Math.round(diffMs / 86400000)
}

export function formatDayLabel(date: Date): string {
  const jsIndex = date.getDay()
  const abbr = DAY_ABBR[jsIndex === 0 ? 6 : jsIndex - 1]
  return `${abbr} ${date.getDate()}`
}

export function formatFullDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
