import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { CornerDownLeft, Loader2, Search, UserRound } from 'lucide-react'
import type { PatientSummary } from '@shared/patient-types'

// Recherche universelle (Ctrl+K) — Plan-Refonte-Graphique.md §4 : taper un nom de patient, un n° de
// dossier ou un écran, puis Entrée. Les patients sont chargés à la première ouverture puis gardés
// le temps de la session (rafraîchis à chaque ouverture, en arrière-plan).

export interface PaletteCommand {
  id: string
  group: 'Écrans' | 'Actions'
  label: string
  hint?: string
  keywords?: string
  icon?: ComponentType<{ className?: string }>
  run: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: PaletteCommand[]
  /** Recherche de patients (absent si le rôle n'a pas accès aux patients). */
  onOpenPatient?: (id: string) => void
}

interface Option {
  key: string
  group: string
  label: string
  hint?: string
  icon?: ComponentType<{ className?: string }>
  run: () => void
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

let patientCache: PatientSummary[] | null = null

export function CommandPalette({ open, onClose, commands, onOpenPatient }: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [patients, setPatients] = useState<PatientSummary[]>(patientCache ?? [])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    setTimeout(() => inputRef.current?.focus(), 0)
    if (!onOpenPatient) return
    setLoadingPatients(patientCache === null)
    window.api.patients
      .list()
      .then((result) => {
        if (result.ok) {
          patientCache = result.data.patients
          setPatients(result.data.patients)
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingPatients(false))
  }, [open, onOpenPatient])

  const options = useMemo<Option[]>(() => {
    const q = normalize(query.trim())
    const words = q.split(/\s+/).filter(Boolean)
    const matches = (text: string): boolean => words.every((w) => text.includes(w))

    // Les écrans dont le nom correspond passent avant ceux qui ne correspondent que par leur groupe
    // (« stocks » doit ouvrir Stocks & Dépôts, pas Pharmacie du groupe « Médicaments & stocks »).
    const labelRank = (c: PaletteCommand): number => (q && matches(normalize(c.label)) ? 0 : 1)
    const commandOptions = commands
      .filter((c) => !q || matches(normalize(`${c.label} ${c.hint ?? ''} ${c.keywords ?? ''}`)))
      .sort((a, b) => labelRank(a) - labelRank(b))
      .map((c) => ({ key: c.id, group: c.group, label: c.label, hint: c.hint, icon: c.icon, run: c.run }))

    const patientOptions: Option[] =
      onOpenPatient && q.length >= 2
        ? patients
            .filter((p) => matches(normalize(`${p.lastName} ${p.firstName} ${p.code}`)))
            .slice(0, 8)
            .map((p) => ({
              key: `patient:${p.id}`,
              group: 'Patients',
              label: `${p.lastName.toUpperCase()} ${p.firstName}`,
              hint: `${p.code} · ${p.age} ans`,
              icon: UserRound,
              run: () => onOpenPatient(p.id)
            }))
        : []

    // Patients d'abord quand on tape un nom, écrans et actions sinon.
    return [...patientOptions, ...commandOptions.filter((o) => o.group === 'Écrans'), ...commandOptions.filter((o) => o.group === 'Actions')]
  }, [query, commands, patients, onOpenPatient])

  useEffect(() => {
    if (selected >= options.length) setSelected(Math.max(0, options.length - 1))
  }, [options.length, selected])

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (!open) return null

  function choose(option: Option | undefined): void {
    if (!option) return
    onClose()
    option.run()
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((i) => Math.min(options.length - 1, i + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((i) => Math.max(0, i - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(options[selected])
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  let lastGroup = ''
  return (
    <div
      className="animate-fade-in fixed inset-0 z-[80] flex items-start justify-center bg-ink-950/55 px-4 pt-[12vh] backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche universelle"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="animate-pop-in w-full max-w-[620px] overflow-hidden rounded-2xl border border-gray-200 bg-surface shadow-[0_28px_70px_rgba(5,20,12,0.35)]"
      >
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3.5">
          <Search className="h-[18px] w-[18px] text-accent-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(0)
            }}
            placeholder="Rechercher un patient, un n° de dossier, un écran…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
          />
          {loadingPatients && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          <kbd className="rounded-md border border-gray-300 bg-gray-50 px-1.5 py-1 font-mono text-[11px] text-gray-500">Échap</kbd>
        </div>

        <ul ref={listRef} role="listbox" className="max-h-[360px] overflow-y-auto p-2">
          {options.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-gray-500">
              {query.trim().length < 2 && onOpenPatient ? 'Tapez au moins 2 lettres pour chercher un patient.' : 'Aucun résultat.'}
            </li>
          )}
          {options.map((option, index) => {
            const header =
              option.group !== lastGroup ? (
                <li key={`g-${option.group}`} className="px-3 pt-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-gray-400 uppercase">
                  {option.group}
                </li>
              ) : null
            lastGroup = option.group
            const Icon = option.icon
            const active = index === selected
            return [
              header,
              <li
                key={option.key}
                role="option"
                aria-selected={active}
                onMouseMove={() => setSelected(index)}
                onClick={() => choose(option)}
                className={
                  'flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-sm ' +
                  (active ? 'bg-accent-50 text-accent-800' : 'text-gray-700')
                }
              >
                {Icon && <Icon className={'h-4 w-4 shrink-0 ' + (active ? 'text-accent-600' : 'text-gray-400')} />}
                <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                {option.hint && <span className="shrink-0 font-mono text-xs text-gray-400">{option.hint}</span>}
                {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-accent-600" />}
              </li>
            ]
          })}
        </ul>

        <footer className="flex flex-wrap gap-4 border-t border-gray-200 px-4 py-2.5 text-[11.5px] text-gray-500">
          <span>
            <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> naviguer
          </span>
          <span>
            <kbd className="font-mono">Entrée</kbd> ouvrir
          </span>
          <span>
            <kbd className="font-mono">Ctrl K</kbd> ouvrir / fermer
          </span>
        </footer>
      </div>
    </div>
  )
}
