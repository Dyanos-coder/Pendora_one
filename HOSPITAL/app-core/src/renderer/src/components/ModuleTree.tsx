import { MODULE_DEPENDENCY_PARENT, MODULE_GROUPS, MODULE_LABEL_BY_ID, applyModuleDependencies } from '@shared/setup-types'

interface ModuleTreeProps {
  enabledModules: string[]
  onChange: (next: string[]) => void
}

/** Sélection des modules affichés dans la navigation, en arborescence groupe → écran (voir
 * Plan-Installeur-Configurable.md §4.4) : cocher un groupe entier coche tous ses écrans ; décocher
 * un seul écran laisse les autres du groupe cochés (case du groupe "indéterminée", comme un
 * dossier partiellement sélectionné). Réutilisé par l'assistant de premier lancement et par
 * Paramètres → Ultra Admin — même composant, même comportement.
 *
 * Modules liés (voir MODULE_DEPENDENCIES, setup-types.ts) : décocher "Patients" décoche aussi en
 * cascade tout écran qui a besoin d'un patient pour avoir du sens (rendez-vous, consultations,
 * examens…) — ces cases sont grisées tant que Patients n'est pas coché. */
export function ModuleTree({ enabledModules, onChange }: ModuleTreeProps): JSX.Element {
  const enabledSet = new Set(applyModuleDependencies(enabledModules))

  function isBlocked(screenId: string): boolean {
    const parent = MODULE_DEPENDENCY_PARENT[screenId]
    return parent ? !enabledSet.has(parent) : false
  }

  function toggleGroup(screenIds: string[], checked: boolean): void {
    if (checked) {
      const addable = screenIds.filter((id) => !isBlocked(id))
      onChange(applyModuleDependencies(Array.from(new Set([...enabledModules, ...addable]))))
    } else {
      const removed = new Set(screenIds)
      onChange(applyModuleDependencies(enabledModules.filter((id) => !removed.has(id))))
    }
  }

  function toggleScreen(id: string, checked: boolean): void {
    if (checked) {
      if (isBlocked(id)) return
      onChange(applyModuleDependencies(Array.from(new Set([...enabledModules, id]))))
    } else {
      onChange(applyModuleDependencies(enabledModules.filter((x) => x !== id)))
    }
  }

  return (
    <div className="space-y-3">
      {MODULE_GROUPS.map((group) => {
        const screenIds = group.screens.map((s) => s.id)
        const enabledCount = screenIds.filter((id) => enabledSet.has(id)).length
        const fullyChecked = enabledCount === screenIds.length
        const partiallyChecked = enabledCount > 0 && !fullyChecked
        const groupAddable = screenIds.some((id) => !enabledSet.has(id) && !isBlocked(id))

        return (
          <div key={group.label} className="overflow-hidden rounded-lg border border-gray-200">
            <label className="flex cursor-pointer items-center gap-2.5 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={fullyChecked}
                disabled={!fullyChecked && !groupAddable}
                ref={(el) => {
                  if (el) el.indeterminate = partiallyChecked
                }}
                onChange={(e) => toggleGroup(screenIds, e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-accent-600 focus:ring-accent-500 disabled:opacity-40"
              />
              {group.label}
            </label>
            <div className="divide-y divide-gray-50 px-3 py-1.5">
              {group.screens.map((screen) => {
                const blocked = isBlocked(screen.id)
                return (
                  <label
                    key={screen.id}
                    className={`flex cursor-pointer items-center gap-2.5 py-1.5 pl-6 text-sm ${blocked ? 'text-gray-400 opacity-60' : 'text-gray-600'}`}
                  >
                    <input
                      type="checkbox"
                      checked={enabledSet.has(screen.id)}
                      disabled={blocked}
                      onChange={(e) => toggleScreen(screen.id, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-accent-600 focus:ring-accent-500 disabled:opacity-40"
                    />
                    {screen.label}
                    {blocked && (
                      <span className="text-xs text-gray-400">
                        (nécessite {MODULE_LABEL_BY_ID[MODULE_DEPENDENCY_PARENT[screen.id]]})
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
