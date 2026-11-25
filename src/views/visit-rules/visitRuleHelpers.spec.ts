import { describe, it, expect } from 'vitest'
import {
  buildCompanyPayload,
  buildTeamPayload,
  companyValues,
  groupByCategory,
  humanizeAuditLine,
  pinnedRows,
  radiusErrorKeys,
  sameValueMap,
  shouldDeleteTeam,
  withLevel,
} from './visitRuleHelpers'
import type { CompanyRuleRow, TeamRuleRow } from '@/types/visitRule.type'

function company(over: Partial<CompanyRuleRow>): CompanyRuleRow {
  return {
    key: 'survey',
    categoryKey: 'outlet_activity',
    style: 'mandatory',
    allowedLevels: ['required', 'recommended', 'off'],
    locked: false,
    appliesTakingOrder: true,
    appliesCanvass: true,
    defaultLevel: 'recommended',
    exemptible: true,
    employeeExemptible: false,
    level: 'recommended',
    source: 'default',
    ...over,
  }
}

const radiusRow = company({
  key: 'outlet_radius',
  categoryKey: 'check_in',
  style: 'block',
  paramKind: 'radius_m',
  defaultRadiusM: 100,
  level: 'recommended',
  radiusM: 100,
})
const lockedRow = company({ key: 'fake_gps', locked: true, level: 'required' })
const rows = [company({}), radiusRow, lockedRow]

describe('company payload', () => {
  it('sends every non-locked rule and never a locked one', () => {
    const values = companyValues(rows)
    const payload = buildCompanyPayload(rows, values, [3])
    expect(payload.rules.map((r) => r.key)).toEqual(['survey', 'outlet_radius'])
    expect(payload.rules[1]).toEqual({ key: 'outlet_radius', level: 'recommended', radiusM: 100 })
    expect(payload.exemptReasonIds).toEqual([3])
  })

  it('does not send a radius for a rule without one', () => {
    const payload = buildCompanyPayload(rows, { survey: { level: 'required', radiusM: 50 } }, [])
    expect(payload.rules[0]).toEqual({ key: 'survey', level: 'required' })
  })
})

const checkAllRow = company({
  key: 'load_confirmation',
  categoryKey: 'depot',
  paramKind: 'allow_check_all',
  defaultAllowCheckAll: true,
  level: 'required',
  allowCheckAll: false,
})

describe('check-all parameter', () => {
  it('travels only with its own rule', () => {
    const all = [...rows, checkAllRow]
    const payload = buildCompanyPayload(
      all,
      {
        ...companyValues(all),
        survey: { level: 'required', allowCheckAll: true },
      },
      [],
    )
    expect(payload.rules.find((r) => r.key === 'survey')).toEqual({
      key: 'survey',
      level: 'required',
    })
    expect(payload.rules.find((r) => r.key === 'load_confirmation')).toEqual({
      key: 'load_confirmation',
      level: 'required',
      allowCheckAll: false,
    })
  })

  it('seeds the default and detects a change', () => {
    expect(withLevel(checkAllRow, 'required')).toEqual({ level: 'required', allowCheckAll: true })
    expect(withLevel(checkAllRow, 'required', { level: 'required', allowCheckAll: false })).toEqual(
      {
        level: 'required',
        allowCheckAll: false,
      },
    )
    const a = companyValues([checkAllRow])
    expect(sameValueMap(a, { load_confirmation: { level: 'required', allowCheckAll: true } })).toBe(
      false,
    )
  })
})

describe('dirty diff', () => {
  it('detects level and radius changes', () => {
    const a = companyValues(rows)
    expect(sameValueMap(a, { ...a })).toBe(true)
    expect(sameValueMap(a, { ...a, survey: { level: 'required' } })).toBe(false)
    expect(sameValueMap(a, { ...a, outlet_radius: { level: 'recommended', radiusM: 80 } })).toBe(
      false,
    )
  })
})

describe('radius validation', () => {
  it('flags a missing or out-of-range radius unless the rule is Off', () => {
    expect(radiusErrorKeys(rows, { outlet_radius: { level: 'required' } })).toEqual([
      'outlet_radius',
    ])
    expect(radiusErrorKeys(rows, { outlet_radius: { level: 'required', radiusM: 5 } })).toEqual([
      'outlet_radius',
    ])
    expect(radiusErrorKeys(rows, { outlet_radius: { level: 'off' } })).toEqual([])
    expect(radiusErrorKeys(rows, { outlet_radius: { level: 'required', radiusM: 80 } })).toEqual([])
  })

  it('seeds the default radius when switching a radius rule on', () => {
    expect(withLevel(radiusRow, 'required', { level: 'off' })).toEqual({
      level: 'required',
      radiusM: 100,
    })
    expect(withLevel(rows[0]!, 'required')).toEqual({ level: 'required' })
  })
})

describe('team payload', () => {
  const team: TeamRuleRow[] = [
    {
      ...company({ key: 'display' }),
      inherited: { level: 'required', source: 'company' },
    },
    {
      ...company({ key: 'survey' }),
      inherited: { level: 'recommended', source: 'default' },
    },
  ]

  it('is sparse and trims the note', () => {
    const payload = buildTeamPayload(team, { display: { level: 'required' } }, '  hi ')
    expect(payload).toEqual({ overrides: [{ key: 'display', level: 'required' }], note: 'hi' })
  })

  it('treats nothing overridden and no note as a delete', () => {
    expect(shouldDeleteTeam({}, '  ')).toBe(true)
    expect(shouldDeleteTeam({}, 'note')).toBe(false)
    expect(shouldDeleteTeam({ display: { level: 'off' } }, '')).toBe(false)
  })

  it('finds overrides equal to the inherited value', () => {
    const pinned = pinnedRows(team, {
      display: { level: 'required' },
      survey: { level: 'required' },
    })
    expect(pinned.map((r) => r.key)).toEqual(['display'])
  })
})

describe('groupByCategory', () => {
  it('groups in order of first appearance', () => {
    const groups = groupByCategory(rows)
    expect(groups.map((g) => g.key)).toEqual(['outlet_activity', 'check_in'])
  })
})

describe('humanizeAuditLine', () => {
  const labels: Record<string, string> = {
    'visitRules.rules.survey.name': 'Survey',
    'visitRules.levels.mandatory.required': 'Required',
    'visitRules.levels.mandatory.recommended': 'Recommended',
  }
  const t = (k: string) => labels[k] ?? k
  const te = (k: string) => k in labels
  const styleOf = (k: string) => (k === 'survey' ? ('mandatory' as const) : undefined)

  it('labels the rule and its levels, keeping a team prefix', () => {
    expect(humanizeAuditLine('[TM-006 Wings] survey: recommended → required', styleOf, t, te)).toBe(
      '[TM-006 Wings] Survey: Recommended → Required',
    )
  })

  it('returns an unknown or free-form line as it came', () => {
    expect(humanizeAuditLine('exempt reasons: + OTO-03 Closed', styleOf, t, te)).toBe(
      'exempt reasons: + OTO-03 Closed',
    )
    expect(humanizeAuditLine('something_else: required', styleOf, t, te)).toBe(
      'something_else: required',
    )
    expect(humanizeAuditLine('plain text', styleOf, t, te)).toBe('plain text')
  })
})
