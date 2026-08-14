import { useState } from 'react'
import { Sparkles, Search, History, BarChart3, Paperclip, Send } from 'lucide-react'
import { PageHeader } from '@renderer/components/PageHeader'

const SUGGESTIONS = [
  { icon: Search, label: 'Derniers contrats signés ?' },
  { icon: History, label: 'Historique recrutement Q3' },
  { icon: BarChart3, label: 'Evolution des ventes 2022' }
]

export function MemoryPage(): JSX.Element {
  const [draft, setDraft] = useState('')

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <PageHeader breadcrumb={['Entreprise', 'Mémoire']} title="Mémoire d'entreprise" />

      <div className="flex-1 space-y-4">
        <div className="flex justify-end">
          <div className="max-w-lg rounded-2xl rounded-tr-sm bg-gray-100 px-4 py-2.5 text-sm text-gray-800">
            Pourquoi avons-nous arrêté de travailler avec ce fournisseur ?
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="max-w-xl rounded-2xl rounded-tl-sm border border-gray-200 bg-white p-4">
            <p className="text-sm leading-relaxed text-gray-700">
              Nous avons cessé la collaboration avec{' '}
              <span className="font-semibold text-accent-600">Logistix SA</span> le 14 Octobre
              2023. Cette décision a été prise par <span className="font-semibold">Amina Dirigeante</span>{' '}
              suite à des retards de livraison répétés (incident #LOG-8821) et une augmentation
              unilatérale des tarifs de 15%.
            </p>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Sources &amp; références
            </p>
            <div className="flex flex-wrap gap-2">
              {['Contrat Logistix 2023', 'Amina Dirigeante', 'Incident #LOG-8821'].map((ref) => (
                <span
                  key={ref}
                  className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600"
                >
                  {ref}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3.5 py-2 text-sm text-gray-500 hover:border-accent-300 hover:text-accent-600"
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 border-t border-gray-100 bg-gray-50 pt-4">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
          <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Posez une question sur l'historique de l'entreprise..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            disabled={!draft.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400">
          Pandora AI utilise vos documents internes sécurisés pour répondre. Les données restent au
          sein de votre espace.
        </p>
      </div>
    </div>
  )
}
