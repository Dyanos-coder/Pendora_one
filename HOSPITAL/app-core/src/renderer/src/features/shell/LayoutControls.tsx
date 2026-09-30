import { useEffect } from 'react'
import { Check, LayoutGrid, Move, RotateCcw } from 'lucide-react'
import { useLayout } from '@renderer/components/layout-context'

/** Bouton de l'en-tête qui active/désactive le mode « Personnaliser la disposition » (item 15). */
export function LayoutToggle(): JSX.Element {
  const { editing, setEditing } = useLayout()
  return (
    <button
      onClick={() => setEditing(!editing)}
      title={editing ? 'Terminer la personnalisation' : 'Personnaliser la disposition de la page'}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
        editing ? 'bg-accent-600 text-white hover:bg-accent-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {editing ? <Check className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
      <span className="hidden lg:inline">{editing ? 'Terminer' : 'Disposition'}</span>
    </button>
  )
}

/** Bandeau affiché en mode édition, avec la réinitialisation de la disposition. Quitter la page
 * (`pageKey` change) referme le mode édition pour ne pas le laisser actif par inadvertance. */
export function LayoutEditBanner({ pageKey }: { pageKey: string }): JSX.Element | null {
  const { editing, setEditing, resetAll } = useLayout()

  useEffect(() => {
    setEditing(false)
  }, [pageKey, setEditing])

  if (!editing) return null
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-accent-200 bg-accent-50 px-4 py-2.5 text-xs text-accent-800">
      <span className="flex items-center gap-2">
        <Move className="h-3.5 w-3.5 shrink-0" />
        Glissez-déposez les blocs encadrés pour les réorganiser. La disposition est mémorisée pour votre compte sur ce poste.
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={resetAll}
          className="flex items-center gap-1 rounded-lg border border-accent-200 bg-white px-2.5 py-1 font-medium text-accent-700 hover:bg-accent-100"
        >
          <RotateCcw className="h-3 w-3" />
          Réinitialiser
        </button>
        <button onClick={() => setEditing(false)} className="rounded-lg bg-accent-600 px-2.5 py-1 font-medium text-white hover:bg-accent-700">
          Terminer
        </button>
      </div>
    </div>
  )
}
