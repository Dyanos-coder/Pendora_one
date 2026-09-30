// Types partagés entre main, preload et renderer pour le domaine Finances.

export type ApiTransactionType = 'RECETTE' | 'DEPENSE'
export type ApiTransactionStatus = 'PAYE' | 'EN_ATTENTE' | 'EN_RETARD' | 'ANNULE'

export interface ApiFinanceTransaction {
  id: string
  reference: string
  occurredAt: string
  type: ApiTransactionType
  party: string
  category: string
  amount: number
  status: ApiTransactionStatus
  paymentMode: string
  updatedAt: string
}

export interface CreateFinanceTransactionInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  type: ApiTransactionType
  party: string
  category: string
  amount: number
  paymentMode: string
}

export interface UpdateFinanceTransactionInput {
  type?: ApiTransactionType
  party?: string
  category?: string
  amount?: number
  status?: ApiTransactionStatus
  paymentMode?: string
  /** Posé en interne par finance.service.ts (main) en mode hors-ligne, jamais fourni par le
   * renderer — voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}

// --- Factures fournisseurs (item 14) --------------------------------------------------------------
// Réutilise ApiTransactionStatus (PAYE/EN_ATTENTE/EN_RETARD) plutôt qu'un second enum redondant.

export interface ApiSupplierInvoice {
  id: string
  reference: string
  supplierId: string | null
  supplierName: string | null
  orderId: string | null
  orderReference: string | null
  amount: number
  issuedAt: string
  dueAt: string | null
  status: ApiTransactionStatus
  note: string | null
  updatedAt: string
}

export interface CreateSupplierInvoiceInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  supplierId?: string
  orderId?: string
  amount: number
  issuedAt?: string
  dueAt?: string
  status?: ApiTransactionStatus
  note?: string
}

export interface UpdateSupplierInvoiceInput {
  supplierId?: string | null
  orderId?: string | null
  amount?: number
  issuedAt?: string
  dueAt?: string | null
  status?: ApiTransactionStatus
  note?: string | null
  /** Posé en interne par finance.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}

// --- Paiements reçus (item 14) --------------------------------------------------------------------

export interface ApiPaymentReceived {
  id: string
  reference: string
  payer: string
  category: string
  amount: number
  receivedAt: string
  paymentMode: string
  note: string | null
  updatedAt: string
}

export interface CreatePaymentReceivedInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  payer: string
  category: string
  amount: number
  receivedAt?: string
  paymentMode: string
  note?: string
}

export interface UpdatePaymentReceivedInput {
  payer?: string
  category?: string
  amount?: number
  receivedAt?: string
  paymentMode?: string
  note?: string | null
  /** Posé en interne par finance.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}

// --- Dépenses par service (item 14) ---------------------------------------------------------------

export interface ApiServiceExpense {
  id: string
  reference: string
  service: string
  category: string
  amount: number
  spentAt: string
  note: string | null
  updatedAt: string
}

export interface CreateServiceExpenseInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  service: string
  category: string
  amount: number
  spentAt?: string
  note?: string
}

export interface UpdateServiceExpenseInput {
  service?: string
  category?: string
  amount?: number
  spentAt?: string
  note?: string | null
  /** Posé en interne par finance.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}

// --- Budgets (item 14) ------------------------------------------------------------------------------
// consumedAmount/remainingAmount sont calculés côté serveur à partir des ServiceExpense, jamais stockés.

export interface ApiBudget {
  id: string
  reference: string
  service: string
  year: number
  allocatedAmount: number
  consumedAmount: number
  remainingAmount: number
  note: string | null
  updatedAt: string
}

export interface CreateBudgetInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  service: string
  year: number
  allocatedAmount: number
  note?: string
}

export interface UpdateBudgetInput {
  service?: string
  year?: number
  allocatedAmount?: number
  note?: string | null
  /** Posé en interne par finance.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}

// --- Comptes bancaires (item 14) --------------------------------------------------------------------

export interface ApiBankAccount {
  id: string
  reference: string
  name: string
  bankName: string
  accountNumber: string
  balance: number
  note: string | null
  updatedAt: string
}

export interface CreateBankAccountInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  name: string
  bankName: string
  accountNumber: string
  balance?: number
  note?: string
}

export interface UpdateBankAccountInput {
  name?: string
  bankName?: string
  accountNumber?: string
  balance?: number
  note?: string | null
  /** Posé en interne par finance.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}
