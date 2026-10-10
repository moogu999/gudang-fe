import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SalesTeamRowActions from './SalesTeamRowActions.vue'
import type { SalesTeam } from '@/types/salesTeam.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: vi.fn() }) }))
vi.mock('@/services', () => ({ SalesTeamsService: {} }))

function team(over: Partial<SalesTeam> = {}): SalesTeam {
  return {
    id: 1,
    code: 'TM-001',
    name: 'GT',
    isActive: true,
    branch: { id: 1, code: 'B1', name: 'Branch' },
    supervisor: { id: 2, name: 'Spv', isActive: true },
    skuCount: 3,
    memberCount: 0,
    principals: [],
    createdAt: '2026-10-01T00:00:00Z',
    ...over,
  }
}

// Captures each tooltip's text so the tests can read it.
const tooltip = {
  mounted(el: HTMLElement, binding: { value: string }) {
    el.dataset.tooltip = binding.value
  },
}

function mountActions(props: { team: SalesTeam; canWrite: boolean }) {
  return mount(SalesTeamRowActions, {
    props: { ...props, toastGroup: 't', confirmGroup: 'c' },
    global: {
      directives: { tooltip },
      stubs: { Button: { props: ['disabled'], template: '<button :disabled="disabled" />' } },
    },
  })
}

describe('SalesTeamRowActions', () => {
  it('disables Deactivate while the team has members, and says why', () => {
    const wrapper = mountActions({ team: team({ memberCount: 2 }), canWrite: true })
    const button = wrapper.find('[data-testid="row-deactivate"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect((button.element.parentElement as HTMLElement).dataset.tooltip).toBe(
      'salesTeams.rowActions.deactivateBlocked',
    )
  })

  it('enables Deactivate for a team without members', () => {
    const wrapper = mountActions({ team: team(), canWrite: true })
    expect(wrapper.find('[data-testid="row-deactivate"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-testid="row-duplicate"]').exists()).toBe(true)
  })

  it('offers Activate instead for an inactive team', () => {
    const wrapper = mountActions({ team: team({ isActive: false }), canWrite: true })
    expect(wrapper.find('[data-testid="row-activate"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="row-deactivate"]').exists()).toBe(false)
  })

  it('renders nothing without write permission', () => {
    const wrapper = mountActions({ team: team(), canWrite: false })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
