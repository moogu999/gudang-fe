import type {
  CompanyRuleRow,
  ExemptReason,
  PutCompanyRulesDto,
  PutTeamRulesDto,
  TeamRuleRow,
  VisitRuleDefinition,
  VisitRuleInput,
  VisitRuleLevel,
  VisitRuleStyle,
  VisitRuleValue,
} from '@/types/visitRule.type'

export const RADIUS_MIN = 10
export const RADIUS_MAX = 5000
export const NOTE_MAX = 200

export const LEVELS: VisitRuleLevel[] = ['required', 'recommended', 'off']

/** i18n key of a level label, which depends on the rule's wording style. */
export function levelLabelKey(style: VisitRuleStyle, level: VisitRuleLevel): string {
  return `visitRules.levels.${style}.${level}`
}

export type ValueMap = Record<string, VisitRuleValue>

export function isValidRadius(radiusM: number | undefined | null): boolean {
  return (
    radiusM != null && Number.isInteger(radiusM) && radiusM >= RADIUS_MIN && radiusM <= RADIUS_MAX
  )
}

/** The value a rule starts from when the user picks a level: keeps the radius, or seeds the default. */
export function withLevel(
  def: VisitRuleDefinition,
  level: VisitRuleLevel,
  current?: VisitRuleValue,
): VisitRuleValue {
  if (def.paramKind === 'radius_m')
    return { level, radiusM: current?.radiusM ?? def.defaultRadiusM }
  if (def.paramKind === 'allow_check_all') {
    return { level, allowCheckAll: current?.allowCheckAll ?? def.defaultAllowCheckAll ?? true }
  }
  return { level }
}

/** The parameter fields of a value, without the undefined ones. */
function paramsOf(v: VisitRuleValue): Pick<VisitRuleValue, 'radiusM' | 'allowCheckAll'> {
  return {
    ...(v.radiusM != null ? { radiusM: v.radiusM } : {}),
    ...(v.allowCheckAll != null ? { allowCheckAll: v.allowCheckAll } : {}),
  }
}

/** Drops a parameter from inputs whose rule doesn't carry it. */
function pruneParams(inputs: VisitRuleInput[], rows: VisitRuleDefinition[]) {
  const radiusKeys = new Set(rows.filter((r) => r.paramKind === 'radius_m').map((r) => r.key))
  const checkAllKeys = new Set(
    rows.filter((r) => r.paramKind === 'allow_check_all').map((r) => r.key),
  )
  for (const r of inputs) {
    if (!radiusKeys.has(r.key)) delete r.radiusM
    if (!checkAllKeys.has(r.key)) delete r.allowCheckAll
  }
}

/** The editable (non-locked) values of a company response, keyed by rule. */
export function companyValues(rows: CompanyRuleRow[]): ValueMap {
  const map: ValueMap = {}
  for (const r of rows) {
    if (r.locked) continue
    map[r.key] = { level: r.level, ...paramsOf(r) }
  }
  return map
}

/** The sparse override map of a team response. */
export function teamOverrides(rows: TeamRuleRow[]): ValueMap {
  const map: ValueMap = {}
  for (const r of rows) {
    if (!r.override) continue
    map[r.key] = { level: r.override.level, ...paramsOf(r.override) }
  }
  return map
}

function sameValue(a?: VisitRuleValue, b?: VisitRuleValue): boolean {
  if (!a || !b) return a === b
  return (
    a.level === b.level &&
    (a.radiusM ?? null) === (b.radiusM ?? null) &&
    (a.allowCheckAll ?? null) === (b.allowCheckAll ?? null)
  )
}

export function sameValueMap(a: ValueMap, b: ValueMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) if (!sameValue(a[k], b[k])) return false
  return true
}

export function sameIds(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

function toInputs(values: ValueMap, order: string[]): VisitRuleInput[] {
  const out: VisitRuleInput[] = []
  for (const key of order) {
    const v = values[key]
    if (!v) continue
    out.push({ key, level: v.level, ...paramsOf(v) })
  }
  return out
}

/** Every non-locked rule is sent; a locked one is never sent. */
export function buildCompanyPayload(
  rows: CompanyRuleRow[],
  values: ValueMap,
  exemptReasonIds: number[],
): PutCompanyRulesDto {
  const order = rows.filter((r) => !r.locked).map((r) => r.key)
  const rules = toInputs(values, order)
  // A parameter only travels with the rule that owns it.
  pruneParams(rules, rows)
  return { rules, exemptReasonIds }
}

/** Only the overridden rules are sent. */
export function buildTeamPayload(
  rows: TeamRuleRow[],
  overrides: ValueMap,
  note: string,
): PutTeamRulesDto {
  const order = rows.filter((r) => !r.locked).map((r) => r.key)
  const list = toInputs(overrides, order)
  pruneParams(list, rows)
  const trimmed = note.trim()
  return { overrides: list, ...(trimmed ? { note: trimmed } : {}) }
}

/** Nothing overridden and no note: saving is the same as resetting the team. */
export function shouldDeleteTeam(overrides: ValueMap, note: string): boolean {
  return Object.keys(overrides).length === 0 && note.trim() === ''
}

/** Rules whose value cannot be saved: a radius rule that isn't Off needs a radius in range. */
export function radiusErrorKeys(rows: VisitRuleDefinition[], values: ValueMap): string[] {
  const bad: string[] = []
  for (const r of rows) {
    if (r.paramKind !== 'radius_m') continue
    const v = values[r.key]
    if (!v || v.level === 'off') continue
    if (!isValidRadius(v.radiusM)) bad.push(r.key)
  }
  return bad
}

/** Overrides equal to the inherited value: they stay put even if the default changes. */
export function pinnedRows(rows: TeamRuleRow[], overrides: ValueMap): TeamRuleRow[] {
  return rows.filter((r) => {
    const o = overrides[r.key]
    return o != null && sameValue(o, r.inherited)
  })
}

export function exemptibleKeys(rows: VisitRuleDefinition[]): string[] {
  return rows.filter((r) => r.exemptible).map((r) => r.key)
}

export function groupByCategory<T extends { categoryKey: string }>(
  rows: T[],
): { key: string; rows: T[] }[] {
  const groups: { key: string; rows: T[] }[] = []
  for (const r of rows) {
    let g = groups.find((x) => x.key === r.categoryKey)
    if (!g) {
      g = { key: r.categoryKey, rows: [] }
      groups.push(g)
    }
    g.rows.push(r)
  }
  return groups
}

export function activeReasonOptions(reasons: ExemptReason[]): number[] {
  return reasons.map((r) => r.id)
}

/**
 * Turns one machine audit line into text for the screen: rule keys and levels get their labels.
 * Anything that doesn't look like a known rule is returned as it came.
 */
export function humanizeAuditLine(
  line: string,
  styleOf: (key: string) => VisitRuleStyle | undefined,
  t: (key: string) => string,
  te: (key: string) => boolean,
): string {
  const m = /^((?:\[[^\]]*\]\s*)?)([a-z_]+)(:\s.*)$/.exec(line)
  if (!m) return line
  const [, prefix, key, rest] = m
  const style = styleOf(key!)
  if (!style || !te(`visitRules.rules.${key}.name`)) return line
  const labelled = rest!.replace(/\b(required|recommended|off)\b/g, (lvl) =>
    t(levelLabelKey(style, lvl as VisitRuleLevel)),
  )
  return `${prefix}${t(`visitRules.rules.${key}.name`)}${labelled}`
}
