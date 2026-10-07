/** « Payé / Non payé » d'un examen prescrit (encaissé en caisse ou non) — information seulement,
 * la réalisation de l'examen n'est pas bloquée. Rien n'est affiché si l'information est inconnue
 * (liste hors connexion). */
export function PaidBadge({ paid }: { paid?: boolean }): JSX.Element | null {
  if (paid === undefined) return null
  return (
    <span
      className={`ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${paid ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'}`}
    >
      {paid ? 'Payé' : 'Non payé'}
    </span>
  )
}
