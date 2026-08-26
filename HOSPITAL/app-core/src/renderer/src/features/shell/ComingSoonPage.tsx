import { Construction } from 'lucide-react'
import { Card } from '@renderer/components/Card'

interface ComingSoonPageProps {
  title: string
}

export function ComingSoonPage({ title }: ComingSoonPageProps): JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-24 text-center">
      <Card className="flex flex-col items-center gap-3 px-10 py-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
          <Construction className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <p className="max-w-sm text-sm text-gray-500">
          Ce module fait partie de la spécification Pandora Health mais n&apos;a pas encore été
          conçu ni codé. Il arrivera écran par écran, dans la continuité du Tableau de bord et
          des Patients.
        </p>
      </Card>
    </div>
  )
}
