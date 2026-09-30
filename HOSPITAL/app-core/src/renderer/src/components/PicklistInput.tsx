import { useEffect, useId, useState } from 'react'

interface PicklistInputProps {
  /** Clé de la liste côté serveur — voir `PICKLIST_KEYS` (`@shared/picklist-types`). */
  listKey: string
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  id?: string
  required?: boolean
}

/** Champ "liste déroulante avec ajout automatique" (PETITES MODIFS items 3/6/7/8/12) : un simple
 * `<input list>` + `<datalist>` — natif, sans dépendance. Propose les valeurs déjà utilisées, mais
 * n'interdit pas d'en taper une nouvelle ; celle-ci est mémorisée côté serveur (voir
 * `ensurePicklistValue`) dès que le formulaire parent est validé, pour réapparaître la prochaine
 * fois. Dégradation acceptable hors-ligne : la liste de suggestions est vide, le champ reste un
 * simple texte libre. */
export function PicklistInput({
  listKey,
  value,
  onChange,
  className,
  placeholder,
  id,
  required
}: PicklistInputProps): JSX.Element {
  const [options, setOptions] = useState<string[]>([])
  const datalistId = `picklist-${useId()}`

  useEffect(() => {
    let cancelled = false
    window.api.picklists.list(listKey).then((result) => {
      if (!cancelled && result.ok) setOptions(result.data.values)
    })
    return () => {
      cancelled = true
    }
  }, [listKey])

  return (
    <>
      <input
        id={id}
        list={datalistId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      <datalist id={datalistId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  )
}
