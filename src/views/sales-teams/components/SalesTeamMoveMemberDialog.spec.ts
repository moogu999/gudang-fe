import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SalesTeamMoveMemberDialog from './SalesTeamMoveMemberDialog.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const addMember = vi.fn(() => Promise.resolve({}))
vi.mock('@/services', () => ({
  SalesTeamsService: { addMember: (...args: unknown[]) => addMember(...(args as [])) },
}))

describe('SalesTeamMoveMemberDialog', () => {
  it('posts move: true with the effective date as a calendar date', async () => {
    const wrapper = mount(SalesTeamMoveMemberDialog, {
      props: {
        team: { id: 5, code: 'TM-005', name: 'MT Utara', skuCount: 12 },
        candidate: {
          employee: { id: 12, name: 'Sari', isActive: true },
          currentTeam: { id: 8, code: 'TM-008', name: 'GT', skuCount: 40, startDate: '2026-01-05' },
        },
        initialDate: new Date(2026, 9, 3),
        toastGroup: 'test',
      },
      global: {
        stubs: {
          Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
          DatePicker: { template: '<input />' },
          Message: { template: '<div><slot /></div>' },
          Button: {
            props: ['label', 'disabled'],
            emits: ['click'],
            template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
          },
        },
      },
    })

    expect(wrapper.find('[data-testid="current-team"]').text()).toContain('TM-008')
    expect(wrapper.find('[data-testid="new-team"]').text()).toContain('TM-005')

    await wrapper.find('[data-testid="confirm-move"]').trigger('click')
    await flushPromises()

    expect(addMember).toHaveBeenCalledWith(5, {
      employeeId: 12,
      startDate: '2026-10-03',
      move: true,
    })
    expect(wrapper.emitted('moved')).toHaveLength(1)
  })
})
