import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WeekdayChips from './WeekdayChips.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

describe('WeekdayChips', () => {
  it('toggles a day into and out of the mask', async () => {
    const wrapper = mount(WeekdayChips, { props: { modelValue: 0b000001 } })
    await wrapper.find('[data-testid="weekday-2"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([0b000101])

    await wrapper.setProps({ modelValue: 0b000101 })
    await wrapper.find('[data-testid="weekday-0"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([0b000100])
  })

  it('hides Sunday unless the branch allows it', async () => {
    const wrapper = mount(WeekdayChips, { props: { modelValue: 1 } })
    expect(wrapper.find('[data-testid="weekday-6"]').exists()).toBe(false)
    await wrapper.setProps({ allowSunday: true })
    expect(wrapper.find('[data-testid="weekday-6"]').exists()).toBe(true)
  })

  it('shows only the chosen days when read-only, and no buttons', () => {
    const wrapper = mount(WeekdayChips, { props: { modelValue: 0b0010101, readonly: true } })
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.text()).toContain('calendar.weekdaysShort.0')
    expect(wrapper.text()).toContain('calendar.weekdaysShort.2')
    expect(wrapper.text()).toContain('calendar.weekdaysShort.4')
    expect(wrapper.text()).not.toContain('calendar.weekdaysShort.1')
  })

  it('keeps showing a Sunday that is already set', () => {
    const wrapper = mount(WeekdayChips, { props: { modelValue: 1 << 6, readonly: true } })
    expect(wrapper.text()).toContain('calendar.weekdaysShort.6')
  })
})
