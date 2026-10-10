import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AuditTrailFilters from './AuditTrailFilters.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/constants/auditReferenceTypes', () => ({
  AUDIT_REFERENCE_TYPES: {
    promotion: {
      label: 'Promotion',
      labelKey: 'auditTrails.references.promotion',
      picker: {
        listEndpoint: '/gen/v1/promotions',
        fetchFn: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, limit: 10, offset: 0 } }),
        codeField: 'code',
      },
    },
    activation_code: {
      label: 'Activation Code',
      labelKey: 'auditTrails.references.activation_code',
    },
  },
}))

vi.mock('@/components/select/InfiniteSelect.vue', () => ({
  default: {
    name: 'InfiniteSelect',
    props: ['modelValue', 'optionLabel', 'optionValue', 'fetchFn', 'sortBy', 'sortOperator'],
    emits: ['update:modelValue'],
    template: '<div class="infinite-select" />',
  },
}))

describe('AuditTrailFilters', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(AuditTrailFilters, {
      global: {
        stubs: {
          Select: {
            name: 'Select',
            props: [
              'modelValue',
              'options',
              'optionLabel',
              'optionValue',
              'placeholder',
              'showClear',
              'disabled',
            ],
            emits: ['update:modelValue', 'change'],
            template:
              '<select><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
          },
          InputNumber: {
            name: 'InputNumber',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<input class="input-number" type="number" />',
          },
          DatePicker: {
            name: 'DatePicker',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<input type="text" />',
          },
          Button: {
            name: 'Button',
            props: ['label', 'severity'],
            emits: ['click'],
            template: '<button @click="$emit(\'click\')">{{ label }}</button>',
          },
        },
      },
    })
  })

  it('renders without errors', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('shows disabled Select for reference when no type is selected', () => {
    // InfiniteSelect should not be present (no type chosen)
    expect(wrapper.find('.infinite-select').exists()).toBe(false)
  })

  it('emits change with referenceType when type is selected', async () => {
    const vm = wrapper.vm as InstanceType<typeof AuditTrailFilters> & {
      selectedType: string
      emitChange: () => void
    }
    vm.selectedType = 'promotion'
    vm.emitChange()
    await flushPromises()

    const emitted = wrapper.emitted('change')
    expect(emitted).toBeTruthy()
    const lastEmit = emitted![emitted!.length - 1][0] as { referenceType?: string }
    expect(lastEmit.referenceType).toBe('promotion')
  })

  it('clears referenceId when type changes', async () => {
    const vm = wrapper.vm as InstanceType<typeof AuditTrailFilters> & {
      selectedType: string
      selectedReferenceId: number | undefined
      onTypeChange: () => void
    }
    vm.selectedType = 'promotion'
    vm.selectedReferenceId = 42
    vm.onTypeChange()
    await flushPromises()

    expect(vm.selectedReferenceId).toBeUndefined()
  })

  it('emits empty filters on clearAll', async () => {
    const vm = wrapper.vm as InstanceType<typeof AuditTrailFilters> & {
      selectedType: string
      selectedReferenceId: number | undefined
      clearAll: () => void
    }
    vm.selectedType = 'promotion'
    vm.selectedReferenceId = 42
    vm.clearAll()
    await flushPromises()

    const emitted = wrapper.emitted('change')!
    const lastEmit = emitted[emitted.length - 1][0] as Record<string, unknown>
    expect(lastEmit.referenceType).toBeUndefined()
    expect(lastEmit.referenceId).toBeUndefined()
  })

  it('takes a typed reference id for a type with no list to pick from', async () => {
    const vm = wrapper.vm as InstanceType<typeof AuditTrailFilters> & { selectedType: string }
    vm.selectedType = 'activation_code'
    await flushPromises()

    expect(wrapper.find('.infinite-select').exists()).toBe(false)
    expect(wrapper.find('.input-number').exists()).toBe(true)
  })

  it('emits the action filter under the action key', async () => {
    const vm = wrapper.vm as InstanceType<typeof AuditTrailFilters> & {
      selectedAction: string | undefined
      emitChange: () => void
      clearAll: () => void
    }
    vm.selectedAction = 'block'
    vm.emitChange()
    await flushPromises()

    let emitted = wrapper.emitted('change')!
    expect((emitted[emitted.length - 1][0] as Record<string, unknown>).action).toBe('block')

    vm.clearAll()
    await flushPromises()
    emitted = wrapper.emitted('change')!
    expect((emitted[emitted.length - 1][0] as Record<string, unknown>).action).toBeUndefined()
  })
})
