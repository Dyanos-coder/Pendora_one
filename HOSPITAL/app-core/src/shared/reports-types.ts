// Types partagés entre main, preload et renderer pour Rapports & Analyse.

export type ApiReportCategory = 'ACTIVITE_MEDICALE' | 'FINANCES' | 'RESSOURCES_HUMAINES' | 'QUALITE_CONFORMITE' | 'STOCKS_ACHATS'

export interface ApiReportCategoryCount {
  category: ApiReportCategory
  label: string
  count: number
}

export interface ApiGeneratedReport {
  id: string
  category: ApiReportCategory
  title: string
  format: string
  generatedAt: string
}

export interface ApiReportContent {
  title: string
  format: string
  contentBase64: string
}

export interface ApiDepartmentComparison {
  label: string
  count: number
}
