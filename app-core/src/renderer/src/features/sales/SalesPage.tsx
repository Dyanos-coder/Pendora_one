import { TrendingUp, Receipt, Users, Plus } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { PageHeader } from '@renderer/components/PageHeader'

interface Sale {
  date: string
  client: string
  items: string
  amount: string
  status: 'Payé' | 'En attente'
}

const SALES: Sale[] = [
  { date: "Aujourd'hui, 10:24", client: 'Sodexim SARL', items: '12x Produit Y', amount: '340 000 FCFA', status: 'Payé' },
  { date: "Aujourd'hui, 09:10", client: 'Kouassi Boutique', items: '3x Sac ciment 50kg', amount: '85 000 FCFA', status: 'Payé' },
  { date: 'Hier, 17:45', client: 'Grossiste Nord', items: '40x Câble électrique 10m', amount: '620 000 FCFA', status: 'En attente' },
  { date: 'Hier, 11:02', client: 'Client comptoir', items: '1x Produit X', amount: '45 000 FCFA', status: 'Payé' }
]

const WEEK = [
  { day: 'Lun', value: 40 },
  { day: 'Mar', value: 55 },
  { day: 'Mer', value: 48 },
  { day: 'Jeu', value: 70 },
  { day: 'Ven', value: 62 },
  { day: 'Sam', value: 85 },
  { day: 'Dim', value: 58 }
]

export function SalesPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        breadcrumb={['Entreprise', 'Ventes']}
        title="Ventes"
        subtitle="Performance commerciale et transactions récentes."
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600">
            <Plus className="h-4 w-4" />
            Nouvelle vente
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">+15%</span>
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Chiffre d&apos;affaires (7j)</p>
          <p className="text-2xl font-bold text-gray-900">
            1.9M <span className="text-sm font-medium text-gray-400">FCFA</span>
          </p>
        </Card>

        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Receipt className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Ventes (7j)</p>
          <p className="text-2xl font-bold text-gray-900">86</p>
        </Card>

        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Panier moyen</p>
          <p className="text-2xl font-bold text-gray-900">
            22 100 <span className="text-sm font-medium text-gray-400">FCFA</span>
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Ventes des 7 derniers jours</h2>
        <div className="flex h-32 items-end gap-3">
          {WEEK.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div
                className="w-full rounded-md bg-accent-500/80"
                style={{ height: `${(d.value / 100) * 88}px` }}
              />
              <span className="text-[11px] text-gray-400">{d.day}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-0">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Transactions récentes</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-6 py-2.5 font-medium">Date</th>
              <th className="px-6 py-2.5 font-medium">Client</th>
              <th className="px-6 py-2.5 font-medium">Articles</th>
              <th className="px-6 py-2.5 text-right font-medium">Montant</th>
              <th className="px-6 py-2.5 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {SALES.map((sale) => (
              <tr key={sale.date + sale.client} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-6 py-3.5 text-gray-500">{sale.date}</td>
                <td className="px-6 py-3.5 font-medium text-gray-900">{sale.client}</td>
                <td className="px-6 py-3.5 text-gray-600">{sale.items}</td>
                <td className="px-6 py-3.5 text-right font-semibold text-gray-900">{sale.amount}</td>
                <td className="px-6 py-3.5">
                  <StatusBadge label={sale.status} tone={sale.status === 'Payé' ? 'success' : 'info'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
