import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, Loader2, Pencil, Plus } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { Button } from '@renderer/components/Button'
import { Modal } from '@renderer/components/Modal'
import { StatusBadge } from '@renderer/components/StatusBadge'
import {
  EXAM_SERVICE,
  type ApiCashRegister,
  type ApiEligibleCashier,
  type ApiReceiptFormat,
  type ApiTariffItem
} from '@shared/cashier-types'
import { inputClass, labelClass } from './CashierModals'
import { TILE_COLORS, fcfa } from './format'

const FORMAT_LABEL: Record<ApiReceiptFormat, string> = {
  TICKET_80MM: 'Ticket thermique 80 mm',
  A6: 'A6'
}
const DEFAULT_SERVICES = ['Consultation', ...Object.values(EXAM_SERVICE), 'Pharmacie', 'Bloc opératoire', 'Hospitalisation', 'Urgences']

/** Réglages du module (dirigeant) : caisses, catalogue de tarifs, et imprimante de ce poste. */
export function CashierSettings({ onBack }: { onBack: () => void }): JSX.Element {
  const [registers, setRegisters] = useState<ApiCashRegister[]>([])
  const [tariffs, setTariffs] = useState<ApiTariffItem[]>([])
  const [users, setUsers] = useState<ApiEligibleCashier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingRegister, setEditingRegister] = useState<ApiCashRegister | 'new' | null>(null)
  const [editingTariff, setEditingTariff] = useState<ApiTariffItem | 'new' | null>(null)

  useEffect(() => {
    window.api.cashier.registers().then((r) => (r.ok ? setRegisters(r.data.registers) : setError(r.error)))
    window.api.cashier.tariffs().then((r) => (r.ok ? setTariffs(r.data.tariffs) : setError(r.error)))
    window.api.cashier.eligibleCashiers().then((r) => r.ok && setUsers(r.data.users))
  }, [])

  const tariffsByService = useMemo(() => {
    const groups = new Map<string, ApiTariffItem[]>()
    for (const t of tariffs) groups.set(t.service, [...(groups.get(t.service) ?? []), t])
    return [...groups.entries()]
  }, [tariffs])

  const knownServices = useMemo(() => [...new Set([...DEFAULT_SERVICES, ...tariffs.map((t) => t.service)])], [tariffs])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Retour aux caisses">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Paramètres de la caisse</h1>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">Caisses</h3>
            <p className="text-xs text-gray-500">Autant de caisses que nécessaire, chacune avec ses caissiers autorisés.</p>
          </div>
          <Button size="sm" onClick={() => setEditingRegister('new')}>
            <Plus className="h-3.5 w-3.5" />
            Nouvelle caisse
          </Button>
        </div>
        <div className="divide-y divide-gray-100">
          {registers.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {r.name} {r.location && <span className="font-normal text-gray-400">· {r.location}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {FORMAT_LABEL[r.receiptFormat]} · {r.cashierNames.length ? r.cashierNames.join(', ') : 'Aucun caissier autorisé'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge label={r.isActive ? 'Active' : 'Désactivée'} tone={r.isActive ? 'success' : 'neutral'} />
                <button
                  onClick={() => setEditingRegister(r)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {registers.length === 0 && <p className="py-4 text-sm text-gray-400">Aucune caisse pour le moment.</p>}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">Catalogue de tarifs</h3>
            <p className="text-xs text-gray-500">
              Tuiles de l&apos;écran d&apos;encaissement. Pour un examen prescrit, le tarif est retrouvé par son service et son libellé
              exact (ex. Laboratoire — « NFS »).
            </p>
          </div>
          <Button size="sm" onClick={() => setEditingTariff('new')}>
            <Plus className="h-3.5 w-3.5" />
            Nouveau tarif
          </Button>
        </div>
        {tariffsByService.length === 0 && <p className="text-sm text-gray-400">Le catalogue est vide.</p>}
        <div className="space-y-4">
          {tariffsByService.map(([service, items]) => (
            <div key={service}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{service}</p>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {items.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-gray-800">
                      <span className={`h-3 w-3 rounded-full ${(TILE_COLORS[t.color ?? 'slate'] ?? TILE_COLORS.slate).swatch}`} />
                      {t.label}
                      {!t.isActive && <StatusBadge label="Désactivé" tone="neutral" />}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{fcfa(t.price)}</span>
                      <button
                        onClick={() => setEditingTariff(t)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <PrinterCard />

      {editingRegister && (
        <RegisterFormModal
          register={editingRegister === 'new' ? null : editingRegister}
          users={users}
          onClose={() => setEditingRegister(null)}
          onSaved={(list) => {
            setRegisters(list)
            setEditingRegister(null)
          }}
        />
      )}
      {editingTariff && (
        <TariffFormModal
          tariff={editingTariff === 'new' ? null : editingTariff}
          services={knownServices}
          onClose={() => setEditingTariff(null)}
          onSaved={(saved) => {
            setTariffs((prev) =>
              prev.some((t) => t.id === saved.id) ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved]
            )
            setEditingTariff(null)
          }}
        />
      )}
    </div>
  )
}

function RegisterFormModal({
  register,
  users,
  onClose,
  onSaved
}: {
  register: ApiCashRegister | null
  users: ApiEligibleCashier[]
  onClose: () => void
  onSaved: (registers: ApiCashRegister[]) => void
}): JSX.Element {
  const [name, setName] = useState(register?.name ?? '')
  const [location, setLocation] = useState(register?.location ?? '')
  const [format, setFormat] = useState<ApiReceiptFormat>(register?.receiptFormat ?? 'TICKET_80MM')
  const [isActive, setIsActive] = useState(register?.isActive ?? true)
  const [cashierIds, setCashierIds] = useState<string[]>(register?.cashierIds ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    const input = {
      name,
      location: location || null,
      receiptFormat: format,
      isActive,
      cashierIds
    }
    const result = register ? await window.api.cashier.updateRegister(register.id, input) : await window.api.cashier.createRegister(input)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved(result.data.registers)
  }

  return (
    <Modal title={register ? `Modifier ${register.name}` : 'Nouvelle caisse'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Nom</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Caisse 1" autoFocus className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Emplacement</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Accueil, urgences…" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Format du reçu</label>
          <select value={format} onChange={(e) => setFormat(e.target.value as ApiReceiptFormat)} className={inputClass}>
            {(Object.keys(FORMAT_LABEL) as ApiReceiptFormat[]).map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABEL[f]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Caissiers autorisés</label>
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={cashierIds.includes(u.id)}
                  onChange={(e) => setCashierIds(e.target.checked ? [...cashierIds, u.id] : cashierIds.filter((id) => id !== u.id))}
                />
                {u.name}
                <span className="text-xs text-gray-400">{u.role === 'CAISSIER' ? 'Caissier(ère)' : u.role.toLocaleLowerCase('fr-FR')}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Le dirigeant peut ouvrir toutes les caisses.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Caisse active
        </label>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function TariffFormModal({
  tariff,
  services,
  onClose,
  onSaved
}: {
  tariff: ApiTariffItem | null
  services: string[]
  onClose: () => void
  onSaved: (tariff: ApiTariffItem) => void
}): JSX.Element {
  const [label, setLabel] = useState(tariff?.label ?? '')
  const [service, setService] = useState(tariff?.service ?? '')
  const [price, setPrice] = useState(String(tariff?.price ?? ''))
  const [color, setColor] = useState(tariff?.color ?? 'slate')
  const [sortOrder, setSortOrder] = useState(String(tariff?.sortOrder ?? 0))
  const [isActive, setIsActive] = useState(tariff?.isActive ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    const input = {
      label,
      service,
      price: Number(price || 0),
      color,
      sortOrder: Number(sortOrder || 0),
      isActive
    }
    const result = tariff ? await window.api.cashier.updateTariff(tariff.id, input) : await window.api.cashier.createTariff(input)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved(result.data.tariff)
  }

  return (
    <Modal title={tariff ? 'Modifier le tarif' : 'Nouveau tarif'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass}>Libellé</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Consultation générale"
            autoFocus
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Service</label>
            <input value={service} onChange={(e) => setService(e.target.value)} list="tariff-services" className={inputClass} />
            <datalist id="tariff-services">
              {services.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Prix (FCFA)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Couleur de la tuile</label>
            <div className="flex gap-1.5">
              {Object.entries(TILE_COLORS).map(([key, c]) => (
                <button
                  key={key}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(key)}
                  className={`h-7 w-7 rounded-full ${c.swatch} ${color === key ? 'ring-2 ring-gray-900 ring-offset-2' : ''}`}
                />
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Ordre d&apos;affichage</label>
            <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/[^\d-]/g, ''))} className={inputClass} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Tarif actif (affiché sur l&apos;écran d&apos;encaissement)
        </label>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Imprimante des reçus propre à CE poste (chaque poste de caisse a la sienne). */
function PrinterCard(): JSX.Element {
  const [printers, setPrinters] = useState<{ name: string; displayName: string; isDefault: boolean }[]>([])
  const [selected, setSelected] = useState<string>('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.cashier.listPrinters().then(setPrinters)
    window.api.cashier.getPrinter().then((p) => setSelected(p ?? ''))
  }, [])

  async function handleChange(value: string): Promise<void> {
    setSelected(value)
    await window.api.cashier.setPrinter(value || null)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Card>
      <h3 className="mb-1 text-[15px] font-bold text-gray-900">Imprimante des reçus (ce poste)</h3>
      <p className="mb-3 text-xs text-gray-500">
        Avec une imprimante choisie, les reçus s&apos;impriment directement, sans boîte de dialogue.
      </p>
      <div className="flex max-w-lg items-center gap-3">
        <select value={selected} onChange={(e) => handleChange(e.target.value)} className={inputClass}>
          <option value="">Afficher la boîte d&apos;impression à chaque reçu</option>
          {printers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.displayName}
              {p.isDefault ? ' (par défaut)' : ''}
            </option>
          ))}
        </select>
        {saved && <span className="whitespace-nowrap text-xs text-teal-600">Enregistré.</span>}
      </div>
    </Card>
  )
}
