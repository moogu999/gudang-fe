import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SalesmanTargetGrid from './SalesmanTargetGrid.vue'
import type { FormItem, FormLine } from '../salesmanTargetGrid'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
    locale: ref('en-US'),
  }),
}))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: vi.fn() }) }))

const InputNumberStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<span><input class="cell" :value="modelValue ?? ''"
    @input="$emit('update:modelValue', $event.target.value === '' ? null : Number($event.target.value))" /></span>`,
}

const stubs = {
  InputNumber: InputNumberStub,
  Tag: { props: ['value'], template: '<span class="tag">{{ value }}</span>' },
  Message: { template: '<div class="message"><slot /></div>' },
  Button: {
    props: ['label'],
    emits: ['click'],
    template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
  },
}

function line(employeeId: number, overrides: Partial<FormLine> = {}): FormLine {
  return {
    key: `l${employeeId}`,
    employeeId,
    employeeName: `Salesman ${employeeId}`,
    employeeTypeName: 'Salesman',
    employeeActive: true,
    teamCodes: [],
    principals: [],
    isNew: false,
    targetValue: null,
    effectiveCall: null,
    activeOutlet: null,
    cells: {},
    ...overrides,
  }
}

const item: FormItem = {
  key: '7',
  id: 7,
  categoryName: 'Noodle',
  categoryOptionId: 11,
  uomId: null,
  units: [],
  alsoIn: [],
}

function mountGrid(
  props: Partial<{
    lines: FormLine[]
    types: {
      hasValue: boolean
      hasQty: boolean
      hasEffectiveCall: boolean
      hasActiveOutlet: boolean
    }
    source: 'principal' | 'internal'
    principalTargetValue: number | null
  }> = {},
) {
  return mount(SalesmanTargetGrid, {
    props: {
      lines: props.lines ?? [line(1), line(2)],
      items: [item],
      types: props.types ?? {
        hasValue: true,
        hasQty: true,
        hasEffectiveCall: true,
        hasActiveOutlet: true,
      },
      source: props.source ?? 'principal',
      principalTargetValue: props.principalTargetValue ?? null,
      readonly: false,
      toastGroup: 'test',
      confirmGroup: 'test',
    },
    global: { stubs },
  })
}

describe('SalesmanTargetGrid', () => {
  it('hides the column groups of switched-off types', () => {
    const wrapper = mountGrid({
      types: { hasValue: true, hasQty: false, hasEffectiveCall: false, hasActiveOutlet: false },
    })
    expect(wrapper.find('[data-group="value"]').exists()).toBe(true)
    expect(wrapper.find('[data-group="qty"]').exists()).toBe(false)
    expect(wrapper.find('[data-group="call"]').exists()).toBe(false)
    // One value cell per salesman, and nothing else.
    expect(wrapper.findAll('.cell')).toHaveLength(2)
  })

  it('removes a quantity cell when it is cleared, instead of writing 0', async () => {
    const lines = [line(1, { cells: { '7': '60' } })]
    const wrapper = mountGrid({
      lines,
      types: { hasValue: false, hasQty: true, hasEffectiveCall: false, hasActiveOutlet: false },
    })
    const input = wrapper.find('.cell')
    expect((input.element as HTMLInputElement).value).toBe('60')
    await input.setValue('')
    expect(lines[0]!.cells).toEqual({})
  })

  it('stores a typed 0 as a real target', async () => {
    const lines = [line(1)]
    const wrapper = mountGrid({
      lines,
      types: { hasValue: false, hasQty: true, hasEffectiveCall: false, hasActiveOutlet: false },
    })
    await wrapper.find('.cell').setValue('0')
    expect(lines[0]!.cells).toEqual({ '7': '0' })
  })

  it('shows the principal target and gap only on principal documents with a target', () => {
    const lines = [line(1, { targetValue: 50 })]
    const withGap = mountGrid({ lines, source: 'principal', principalTargetValue: 100 })
    expect(withGap.text()).toContain('salesmanTargets.grid.principalTarget')
    expect(withGap.text()).toContain('salesmanTargets.grid.gap')
    expect(withGap.text()).toContain('salesmanTargets.grid.gapShort')

    const internal = mountGrid({ lines, source: 'internal', principalTargetValue: 100 })
    expect(internal.text()).not.toContain('salesmanTargets.grid.gap')

    const noTarget = mountGrid({ lines, source: 'principal', principalTargetValue: null })
    expect(noTarget.text()).not.toContain('salesmanTargets.grid.gap')
  })
})
