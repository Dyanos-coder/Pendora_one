import {
  PAYMENT_MODE_LABEL,
  PAYMENT_MODES,
  type ApiCashSession,
  type ApiReceiptFormat,
  type ApiReceiptPrintData
} from '../../shared/cashier-types'

// Gabarits HTML du reçu de caisse et du rapport de clôture (Plan-Module-Caisse.md étapes 6-7),
// imprimés par une fenêtre cachée (cashier.service.ts). Émis au nom de l'établissement : le nom
// du logiciel n'y figure pas. Ticket thermique 80 mm ou A6 selon la caisse.

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const NARROW_SPACES = new RegExp(`[${String.fromCharCode(0x202f, 0x00a0)}]`, 'g')

function money(amount: number): string {
  // Espaces fines insécables du format français remplacées par des espaces simples (imprimantes
  // thermiques qui ne les connaissent pas).
  return `${amount.toLocaleString('fr-FR').replace(NARROW_SPACES, ' ')} FCFA`
}

function dateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

function pageCss(format: ApiReceiptFormat): string {
  const width = format === 'A6' ? '105mm' : '80mm'
  const padding = format === 'A6' ? '8mm' : '3mm'
  const base = format === 'A6' ? 12 : 11
  return `
    @page { size: ${format === 'A6' ? 'A6' : '80mm auto'}; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; width: ${width}; padding: ${padding}; font-family: Arial, Helvetica, sans-serif; font-size: ${base}px; color: #000; }
    .center { text-align: center; }
    .logo { max-width: 60%; max-height: 60px; margin: 0 auto 4px; display: block; }
    .name { font-size: ${base + 3}px; font-weight: bold; text-transform: uppercase; }
    .muted { font-size: ${base - 1}px; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 6px; }
    .big { font-size: ${base + 12}px; font-weight: bold; letter-spacing: 2px; }
    .stamp { border: 3px solid #000; padding: 4px 0; margin: 6px 0; }
    .void { color: #c00; border-color: #c00; }
    .queue { font-size: ${base + 18}px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; vertical-align: top; }
    td.r { text-align: right; white-space: nowrap; }
  `
}

function header(data: ApiReceiptPrintData['company']): string {
  const logo = data.logo ? `<img class="logo" src="data:${esc(data.logo.mimeType)};base64,${data.logo.contentBase64}" />` : ''
  const contact = [data.address, data.phone].filter(Boolean).map(esc).join(' — ')
  return `
    <div class="center">
      ${logo}
      <div class="name">${esc(data.name)}</div>
      ${contact ? `<div class="muted">${contact}</div>` : ''}
      ${data.registrationNumber ? `<div class="muted">N° ${esc(data.registrationNumber)}</div>` : ''}
    </div>`
}

export function receiptHtml(data: ApiReceiptPrintData, options: { duplicate: boolean }): string {
  const r = data.receipt
  const cancelled = r.status !== 'PAYE'
  const stamp = cancelled
    ? `<div class="center big stamp void">${r.status === 'ANNULE' ? 'ANNULÉ' : 'REMBOURSÉ'}</div>`
    : `<div class="center big stamp">PAYÉ</div>`
  const lines = r.lines
    .map((l) => `<tr><td>${esc(l.label)}${l.quantity > 1 ? ` × ${l.quantity}` : ''}</td><td class="r">${money(l.unitPrice * l.quantity)}</td></tr>`)
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>${pageCss(data.format)}</style></head><body>
    ${header(data.company)}
    <hr />
    <div class="center"><strong>Reçu de paiement n° ${esc(r.number)}</strong>${options.duplicate ? '<div class="muted">DUPLICATA</div>' : ''}</div>
    <div class="row muted"><span>${dateTime(r.issuedAt)}</span><span>${esc(r.registerName)}</span></div>
    <div class="muted">Caissier : ${esc(r.cashierName)}</div>
    <hr />
    <div>Patient : <strong>${esc(r.patientName)}</strong>${r.patientCode ? ` <span class="muted">(${esc(r.patientCode)})</span>` : ''}</div>
    <div>Service : <strong>${esc(r.service.toLocaleUpperCase('fr-FR'))}</strong></div>
    <hr />
    <table>${lines}</table>
    <hr />
    <div class="row"><strong>Montant</strong><strong>${money(r.amount)}</strong></div>
    <div class="row muted"><span>Mode : ${esc(PAYMENT_MODE_LABEL[r.paymentMode])}</span><span>${esc(r.paymentReference)}</span></div>
    ${stamp}
    ${r.queueNumber !== null && !cancelled ? `<div class="center">N° de passage<div class="queue">${r.queueNumber}</div></div>` : ''}
    ${cancelled && (r.cancelReason || r.refundReason) ? `<div class="muted">Motif : ${esc(r.cancelReason ?? r.refundReason)}</div>` : ''}
    ${data.company.receiptFooter ? `<hr /><div class="center muted">${esc(data.company.receiptFooter)}</div>` : ''}
  </body></html>`
}

export function sessionReportHtml(
  session: ApiCashSession,
  company: ApiReceiptPrintData['company'],
  format: ApiReceiptFormat
): string {
  const counted = session.countedAmounts
  const rows = PAYMENT_MODES.map((mode) => {
    const expected = session.expectedAmounts[mode] ?? 0
    const got = counted?.[mode] ?? 0
    return `<tr><td>${esc(PAYMENT_MODE_LABEL[mode])}</td><td class="r">${money(expected)}</td><td class="r">${money(got)}</td></tr>`
  }).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>${pageCss(format)}</style></head><body>
    ${header(company)}
    <hr />
    <div class="center"><strong>RAPPORT DE CLÔTURE</strong></div>
    <div class="muted">${esc(session.registerName)} — ${esc(session.cashierName)}</div>
    <div class="muted">Ouverture : ${dateTime(session.openedAt)}</div>
    ${session.closedAt ? `<div class="muted">Clôture : ${dateTime(session.closedAt)}</div>` : ''}
    <hr />
    <div class="row"><span>Fond de caisse</span><span>${money(session.openingFloat)}</span></div>
    <div class="row"><span>Reçus encaissés</span><span>${session.receiptCount}</span></div>
    <div class="row"><span>Reçus annulés</span><span>${session.cancelledCount}</span></div>
    <div class="row"><strong>Total encaissé</strong><strong>${money(session.total)}</strong></div>
    <hr />
    <table><tr><td><strong>Mode</strong></td><td class="r"><strong>Attendu</strong></td><td class="r"><strong>Compté</strong></td></tr>${rows}</table>
    <hr />
    <div class="row"><strong>Écart</strong><strong>${money(session.difference ?? 0)}</strong></div>
    ${session.closingNote ? `<div class="muted">Note : ${esc(session.closingNote)}</div>` : ''}
  </body></html>`
}
