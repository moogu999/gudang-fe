export type VisitRuleLevel = 'required' | 'recommended' | 'off'
export type VisitRuleStyle = 'mandatory' | 'block'
export type VisitRuleSource = 'default' | 'company' | 'team' | 'employee' | 'n/a'
export type VisitRuleMode = 'taking_order' | 'canvass'

export interface VisitRuleDefinition {
  key: string
  categoryKey: string
  style: VisitRuleStyle
  allowedLevels: VisitRuleLevel[]
  locked: boolean
  appliesTakingOrder: boolean
  appliesCanvass: boolean
  paramKind?: 'radius_m'
  defaultLevel: VisitRuleLevel
  defaultRadiusM?: number
  exemptible: boolean
  employeeExemptible: boolean
}

export interface VisitRuleValue {
  level: VisitRuleLevel
  radiusM?: number
}

export interface VisitRuleInput extends VisitRuleValue {
  key: string
}

export interface CompanyRuleRow extends VisitRuleDefinition, VisitRuleValue {
  source: 'company' | 'default'
}

export interface ExemptReason {
  id: number
  code: string
  name: string
  isActive: boolean
}

export interface VisitRuleRef {
  id: number
  name: string
}

export interface CompanyRules {
  company: VisitRuleRef
  categories: { key: string; sortOrder: number }[]
  rules: CompanyRuleRow[]
  exemptReasons: ExemptReason[]
  lastChangedAt?: string
  lastChangedBy?: string
}

export interface PutCompanyRulesDto {
  rules: VisitRuleInput[]
  exemptReasonIds: number[]
}

export interface TeamRuleRow extends VisitRuleDefinition {
  inherited: VisitRuleValue & { source: 'company' | 'default' }
  override?: VisitRuleInput
}

export interface TeamSummary {
  id: number
  code: string
  name: string
  branchName: string
  memberCount: number
  overrideCount: number
  note?: string
}

export interface TeamHeader {
  id: number
  code: string
  name: string
  branchId: number
  branchName: string
  isActive: boolean
}

export interface TeamRules {
  team: TeamHeader
  company: VisitRuleRef
  note?: string
  rules: TeamRuleRow[]
}

export interface PutTeamRulesDto {
  note?: string
  overrides: VisitRuleInput[]
}

export interface EffectiveRuleRow extends VisitRuleDefinition {
  level?: VisitRuleLevel
  radiusM?: number
  source: VisitRuleSource
}

export interface EffectiveRules {
  employee: {
    id: number
    code: string
    name: string
    mode: VisitRuleMode
    exemptDepotCheckIn: boolean
  }
  team?: { id: number; code: string; name: string }
  company: VisitRuleRef
  rules: EffectiveRuleRow[]
  exemptReasons: ExemptReason[]
}
