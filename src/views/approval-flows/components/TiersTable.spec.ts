import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TiersTable, { type TierForm } from './TiersTable.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}))

vi.mock('./TierApproverPicker.vue', () => ({
  default: {
    name: 'TierApproverPicker',
    props: ['approvers', 'disabled'],
    emits: ['update:approvers'],
    template: '<div class="tier-approver-picker" />',
  },
}))

const globalStubs = {
  global: {
    stubs: {
      InputText: {
        name: 'InputText',
        props: ['modelValue', 'disabled', 'placeholder'],
        emits: ['update:modelValue'],
        template:
          '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
      },
      Button: {
        name: 'Button',
        props: ['label', 'disabled', 'icon', 'severity', 'size'],
        emits: ['click'],
        template: '<button @click="$emit(\'click\')">{{ label }}</button>',
      },
    },
  },
}

describe('TiersTable', () => {
  function makeTier(tierOrder: number, name: string): TierForm {
    return {
      tierOrder,
      name,
      approvers: [{ employeeId: null, isPrimary: true }],
    }
  }

  it('adds a tier with a default primary approver slot', () => {
    const wrapper = mount(TiersTable, {
      props: { tiers: [] as TierForm[], errors: [] },
      ...globalStubs,
    })
    const vm = wrapper.vm as unknown as { tiers: TierForm[]; addTier: () => void }

    vm.addTier()

    expect(vm.tiers.length).toBe(1)
    expect(vm.tiers[0].tierOrder).toBe(1)
    expect(vm.tiers[0].approvers).toEqual([{ employeeId: null, isPrimary: true }])
  })

  it('removes a tier and renumbers remaining tiers', () => {
    const wrapper = mount(TiersTable, {
      props: {
        tiers: [makeTier(1, 'Supervisor'), makeTier(2, 'Manager'), makeTier(3, 'Director')],
        errors: [],
      },
      ...globalStubs,
    })
    const vm = wrapper.vm as unknown as { tiers: TierForm[]; removeTier: (i: number) => void }

    vm.removeTier(0)

    expect(vm.tiers.map((t) => t.name)).toEqual(['Manager', 'Director'])
    expect(vm.tiers.map((t) => t.tierOrder)).toEqual([1, 2])
  })

  it('moves a tier up/down and renumbers tierOrder', () => {
    const wrapper = mount(TiersTable, {
      props: {
        tiers: [makeTier(1, 'Supervisor'), makeTier(2, 'Manager')],
        errors: [],
      },
      ...globalStubs,
    })
    const vm = wrapper.vm as unknown as {
      tiers: TierForm[]
      moveTier: (i: number, dir: -1 | 1) => void
    }

    vm.moveTier(0, 1)

    expect(vm.tiers.map((t) => t.name)).toEqual(['Manager', 'Supervisor'])
    expect(vm.tiers.map((t) => t.tierOrder)).toEqual([1, 2])
  })

  it('does not move the first tier further up nor the last tier further down', () => {
    const wrapper = mount(TiersTable, {
      props: {
        tiers: [makeTier(1, 'Supervisor'), makeTier(2, 'Manager')],
        errors: [],
      },
      ...globalStubs,
    })
    const vm = wrapper.vm as unknown as {
      tiers: TierForm[]
      moveTier: (i: number, dir: -1 | 1) => void
    }

    vm.moveTier(0, -1)
    vm.moveTier(1, 1)

    expect(vm.tiers.map((t) => t.name)).toEqual(['Supervisor', 'Manager'])
  })
})
