import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TeamOverridePanel from './TeamOverridePanel.vue'
import type { TeamRules, TeamSummary } from '@/types/visitRule.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, te: () => false }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
const require = vi.fn()
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require }) }))

const listTeams = vi.fn()
const getTeam = vi.fn()
const putTeam = vi.fn()
const deleteTeam = vi.fn()
vi.mock('@/services', () => ({
  VisitRulesService: {
    listTeams: (...a: unknown[]) => listTeams(...a),
    getTeam: (...a: unknown[]) => getTeam(...a),
    putTeam: (...a: unknown[]) => putTeam(...a),
    deleteTeam: (...a: unknown[]) => deleteTeam(...a),
  },
}))

const summaries: TeamSummary[] = [
  { id: 1, code: 'TM-001', name: 'Wings', branchName: 'B', memberCount: 2, overrideCount: 1 },
  { id: 2, code: 'TM-002', name: 'Others', branchName: 'B', memberCount: 1, overrideCount: 0 },
]

function teamRules(withOverride: boolean): TeamRules {
  return {
    team: { id: 1, code: 'TM-001', name: 'Wings', branchId: 1, branchName: 'B', isActive: true },
    company: { id: 1, name: 'C' },
    rules: [
      {
        key: 'display',
        categoryKey: 'outlet_activity',
        style: 'mandatory',
        allowedLevels: ['required', 'recommended', 'off'],
        locked: false,
        appliesTakingOrder: true,
        appliesCanvass: true,
        defaultLevel: 'required',
        exemptible: true,
        employeeExemptible: false,
        inherited: { level: 'required', source: 'company' },
        ...(withOverride ? { override: { key: 'display', level: 'required' as const } } : {}),
      },
    ],
  }
}

const VisitRuleTableStub = { name: 'VisitRuleTable', props: ['modelValue'], template: '<div />' }

function mountPanel() {
  return mount(TeamOverridePanel, {
    props: { companyId: 1, canWrite: true, toastGroup: 't', initialTeamId: 1 },
    global: {
      stubs: {
        VisitRuleTable: VisitRuleTableStub,
        ConfirmDialog: true,
        Dialog: true,
        Tag: { template: '<span />' },
        InputText: { template: '<input />' },
        Message: { template: '<div><slot /></div>' },
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  listTeams.mockResolvedValue(summaries)
  deleteTeam.mockResolvedValue(undefined)
})

describe('TeamOverridePanel', () => {
  it('shows the pinned warning for an override equal to the inherited value', async () => {
    getTeam.mockResolvedValue(teamRules(true))
    const w = mountPanel()
    await flushPromises()
    expect(w.find('[data-testid="pinned-display"]').exists()).toBe(true)
  })

  it('asks for confirmation before resetting, then deletes the team override', async () => {
    getTeam.mockResolvedValue(teamRules(true))
    const w = mountPanel()
    await flushPromises()
    await w.find('[data-testid="reset-team"]').trigger('click')
    expect(deleteTeam).not.toHaveBeenCalled()
    const opts = require.mock.calls[0]![0] as { accept: () => Promise<void> }
    await opts.accept()
    expect(deleteTeam).toHaveBeenCalledWith(1)
  })

  it('saving with nothing overridden and no note resets instead of putting', async () => {
    getTeam.mockResolvedValue(teamRules(true))
    const w = mountPanel()
    await flushPromises()
    w.findComponent({ name: 'VisitRuleTable' }).vm.$emit('update:modelValue', {})
    await flushPromises()
    await w.find('[data-testid="save-team"]').trigger('click')
    await flushPromises()
    expect(deleteTeam).toHaveBeenCalledWith(1)
    expect(putTeam).not.toHaveBeenCalled()
  })
})
