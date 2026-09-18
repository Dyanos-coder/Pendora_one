// Types partagés entre main, preload et renderer pour Automation Studio.

export type ApiAutomationCategory = 'RENDEZ_VOUS' | 'STOCKS' | 'LABORATOIRE' | 'FINANCES' | 'RH' | 'SOINS_PATIENTS'

export interface ApiAutomationRule {
  id: string
  name: string
  trigger: string
  action: string
  category: ApiAutomationCategory
  active: boolean
}

export interface ApiAutomationLog {
  id: string
  ruleId: string
  ruleName: string
  category: ApiAutomationCategory
  runAt: string
  success: boolean
  detail: string
}
