import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { EmptyState, Skeleton } from './Feedback'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Valeur de tri ; sans elle, la colonne n'est pas triable. */
  sortValue?: (row: T) => string | number | null
  align?: 'left' | 'right' | 'center'
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  /** Lignes plus serrées pour les longues listes. */
  dense?: boolean
}

/** Tableau commun : en-tête fixe, tri par colonne, survol de ligne, chargement et état vide. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading = false,
  emptyTitle = 'Aucun élément',
  emptyDescription,
  dense = false
}: DataTableProps<T>): JSX.Element {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return rows
    const factor = sort?.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = column.sortValue!(a)
      const vb = column.sortValue!(b)
      if (va === vb) return 0
      if (va === null) return 1
      if (vb === null) return -1
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr')) * factor
    })
  }, [rows, sort, columns])

  function toggleSort(key: string): void {
    setSort((current) => (current?.key !== key ? { key, dir: 'asc' } : current.dir === 'asc' ? { key, dir: 'desc' } : null))
  }

  const cell = dense ? 'px-3 py-2' : 'px-4 py-3'
  const alignClass = (align?: Column<T>['align']): string => (align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left')

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={`${cell} border-b border-gray-200 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-gray-500 uppercase ${alignClass(c.align)}`}
                >
                  {c.sortValue ? (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-gray-900">
                      {c.header}
                      {active ? (
                        sort.dir === 'asc' ? <ArrowUp className="h-3 w-3 text-accent-600" /> : <ArrowDown className="h-3 w-3 text-accent-600" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-5">
                <Skeleton lines={4} />
              </td>
            </tr>
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-gray-100 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-accent-50/40' : 'hover:bg-gray-50'}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`${cell} ${alignClass(c.align)} ${c.className ?? ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
