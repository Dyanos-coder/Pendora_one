export interface TabItem<T extends string> {
  id: T
  label: string
  count?: number
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}

/** Onglets soulignés : l'onglet actif porte un trait vert lumineux. */
export function Tabs<T extends string>({ tabs, value, onChange, className = '' }: TabsProps<T>): JSX.Element {
  return (
    <div role="tablist" className={`flex flex-wrap gap-1 border-b border-gray-200 ${className}`}>
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={
              'relative -mb-px flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors ' +
              (active ? 'text-accent-700' : 'text-gray-500 hover:text-gray-900')
            }
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={
                  'rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold tabular-nums ' +
                  (active ? 'bg-accent-100 text-accent-700' : 'bg-gray-100 text-gray-500')
                }
              >
                {tab.count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent-500 shadow-[0_0_8px_rgba(52,204,107,0.6)]" />
            )}
          </button>
        )
      })}
    </div>
  )
}
