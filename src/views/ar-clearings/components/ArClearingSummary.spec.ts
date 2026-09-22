import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ArClearingSummary from './ArClearingSummary.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const stubs = {
  global: { stubs: { Message: { template: '<div class="message"><slot /></div>' } } },
}

function mountSummary(props: Record<string, unknown>) {
  return mount(ArClearingSummary, {
    props: { available: 0, allocated: 0, unallocated: 0, ...props },
    ...stubs,
  })
}

describe('ArClearingSummary', () => {
  it('goes amber and shows the remainder reassurance while cash is left over', () => {
    const wrapper = mountSummary({ available: 1000, allocated: 600, unallocated: 400 })
    expect(wrapper.find('[data-testid="unallocated"]').classes()).toContain('text-amber-600')
    expect(wrapper.find('[data-testid="remainder-hint"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('400.00')
  })

  it('goes green with no reassurance at exactly zero', () => {
    const wrapper = mountSummary({ available: 1000, allocated: 1000, unallocated: 0 })
    expect(wrapper.find('[data-testid="unallocated"]').classes()).toContain('text-green-700')
    expect(wrapper.find('[data-testid="remainder-hint"]').exists()).toBe(false)
  })

  it('goes red when over-allocated', () => {
    const wrapper = mountSummary({ available: 100, allocated: 150, unallocated: -50 })
    expect(wrapper.find('[data-testid="unallocated"]').classes()).toContain('text-red-600')
  })

  it('renders the saved figures, not the live ones, when readonly', () => {
    const wrapper = mountSummary({
      available: 1,
      allocated: 2,
      unallocated: -1,
      readonly: true,
      savedAvailable: 5000,
      savedAllocated: 4000,
      savedUnallocated: 1000,
    })
    expect(wrapper.find('[data-testid="available"]').text()).toBe('5,000.00')
    expect(wrapper.find('[data-testid="allocated"]').text()).toBe('4,000.00')
    expect(wrapper.find('[data-testid="unallocated"]').text()).toBe('1,000.00')
  })

  it('is purely derived and emits nothing', () => {
    const wrapper = mountSummary({ available: 100, allocated: 40, unallocated: 60 })
    expect(wrapper.emitted()).toEqual({})
  })
})
