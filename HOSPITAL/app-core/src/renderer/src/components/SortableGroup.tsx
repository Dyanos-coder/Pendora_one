import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useState,
  type DragEvent,
  type ReactElement,
  type ReactNode
} from 'react'
import { GripVertical } from 'lucide-react'
import { readStoredOrder, useLayout, writeStoredOrder } from './layout-context'

interface SortableGroupProps {
  /** Identifiant stable du groupe (ex. « consultations.kpis ») — sert de clé de mémorisation. */
  id: string
  className?: string
  children: ReactNode
}

// Conserve la largeur d'un bloc dans une grille (lg:col-span-2...) quand il est enveloppé en mode
// édition — sinon l'enveloppe devient l'élément de grille et le bloc perd sa largeur.
const SPAN_CLASS = /(?:^|\s)((?:sm:|md:|lg:|xl:|2xl:)?(?:col|row)-span-\S+)/g

function spanClasses(element: ReactElement): string {
  const className = (element.props as { className?: unknown }).className
  if (typeof className !== 'string') return ''
  return Array.from(className.matchAll(SPAN_CLASS), (m) => m[1]).join(' ')
}

/** Groupe de blocs réordonnables par glisser-déposer (item 15 PETITES MODIFS). Hors mode édition,
 * les enfants sont rendus tels quels (mise en page strictement identique) ; en mode édition
 * (bouton « Personnaliser la disposition » de l'en-tête), chaque bloc devient déplaçable dans son
 * groupe et l'ordre est mémorisé par utilisateur. Les enfants n'ont pas besoin de clé explicite :
 * React leur attribue une clé stable selon leur position dans le code, y compris pour les blocs
 * conditionnels (`{condition && <Card />}`). */
export function SortableGroup({ id, className, children }: SortableGroupProps): JSX.Element {
  const { editing, storageKey, version } = useLayout()
  const key = storageKey(id)
  const [order, setOrder] = useState<string[]>(() => readStoredOrder(key))
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  useEffect(() => {
    setOrder(readStoredOrder(key))
  }, [key, version])

  const items = Children.toArray(children).filter(isValidElement) as ReactElement[]
  const byKey = new Map(items.map((item) => [String(item.key), item]))
  const orderedKeys = [
    ...order.filter((k) => byKey.has(k)),
    ...items.map((item) => String(item.key)).filter((k) => !order.includes(k))
  ]

  function handleDrop(targetKey: string): void {
    if (!dragging || dragging === targetKey) return
    const next = orderedKeys.filter((k) => k !== dragging)
    next.splice(next.indexOf(targetKey) + (orderedKeys.indexOf(dragging) < orderedKeys.indexOf(targetKey) ? 1 : 0), 0, dragging)
    setOrder(next)
    writeStoredOrder(key, next)
  }

  if (!editing) {
    return (
      <div className={className}>
        {orderedKeys.map((k) => (
          <Fragment key={k}>{byKey.get(k)}</Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {orderedKeys.map((k) => {
        const item = byKey.get(k) as ReactElement
        return (
          <div
            key={k}
            draggable
            // Groupes imbriqués : seul le groupe dont provient le bloc déplacé réagit — il stoppe la
            // propagation, sinon le groupe parent laisse l'événement remonter jusqu'à lui.
            onDragStart={(e: DragEvent) => {
              e.stopPropagation()
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', k)
              setDragging(k)
            }}
            onDragOver={(e: DragEvent) => {
              if (!dragging) return
              e.preventDefault()
              e.stopPropagation()
              if (over !== k) setOver(k)
            }}
            onDragLeave={() => setOver((current) => (current === k ? null : current))}
            onDrop={(e: DragEvent) => {
              if (!dragging) return
              e.preventDefault()
              e.stopPropagation()
              handleDrop(k)
              setOver(null)
            }}
            onDragEnd={(e: DragEvent) => {
              e.stopPropagation()
              setDragging(null)
              setOver(null)
            }}
            // Pas de clic accidentel (navigation, bouton, lien) pendant qu'on réorganise.
            onClickCapture={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            className={`relative cursor-grab rounded-xl outline-2 outline-offset-2 outline-dashed transition-opacity active:cursor-grabbing ${spanClasses(item)} ${
              over === k && dragging !== k ? 'outline-accent-600' : 'outline-accent-400/60'
            } ${dragging === k ? 'opacity-40' : ''}`}
          >
            <div className="h-full select-none">{item}</div>
            <span className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-white shadow">
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          </div>
        )
      })}
    </div>
  )
}
