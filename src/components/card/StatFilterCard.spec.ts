import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatFilterCard from './StatFilterCard.vue'

describe('StatFilterCard', () => {
  it('renders the count and the label', () => {
    const wrapper = mount(StatFilterCard, { props: { count: 59, label: 'Registered' } })
    expect(wrapper.text()).toContain('59')
    expect(wrapper.text()).toContain('Registered')
  })

  it('reflects active in aria-pressed', async () => {
    const wrapper = mount(StatFilterCard, { props: { count: 1, label: 'x', active: false } })
    expect(wrapper.attributes('aria-pressed')).toBe('false')
    await wrapper.setProps({ active: true })
    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })

  it('emits toggle on click', async () => {
    const wrapper = mount(StatFilterCard, { props: { count: 1, label: 'x', severity: 'warn' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })
})
