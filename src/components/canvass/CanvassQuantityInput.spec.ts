import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PrimeVue from 'primevue/config'
import CanvassQuantityInput from './CanvassQuantityInput.vue'
import type { UomConversionLevel } from '@/types'

const i18n = createI18n({ legacy: false, locale: 'en-US', messages: { 'en-US': {} } })

const levels: UomConversionLevel[] = [
  {
    id: 1,
    uomGroupId: 1,
    levelOrder: 1,
    uomId: 1,
    qtyPerParent: null,
    uom: { id: 1, name: 'CTN', symbol: 'CTN' },
  },
  {
    id: 2,
    uomGroupId: 1,
    levelOrder: 2,
    uomId: 2,
    qtyPerParent: 12,
    uom: { id: 2, name: 'PCS', symbol: 'PCS' },
  },
]

describe('CanvassQuantityInput', () => {
  it('shows the base quantity as CTN/PCS tiers', () => {
    const wrapper = mount(CanvassQuantityInput, {
      props: { modelValue: 30, levels },
      global: { plugins: [i18n, PrimeVue] },
    })
    expect((wrapper.get('[data-testid="tier-input"]').element as HTMLInputElement).value).toBe(
      '2/6',
    )
  })

  it('emits the base quantity when tiers are typed', async () => {
    const wrapper = mount(CanvassQuantityInput, {
      props: { modelValue: 0, levels },
      global: { plugins: [i18n, PrimeVue] },
    })
    await wrapper.get('[data-testid="tier-input"]').setValue('1/5')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([17])
  })

  it('falls back to a number input for a single-level UOM', () => {
    const wrapper = mount(CanvassQuantityInput, {
      props: { modelValue: 5, levels: [levels[1]] },
      global: { plugins: [i18n, PrimeVue] },
    })
    expect(wrapper.find('[data-testid="tier-input"]').exists()).toBe(false)
  })
})
