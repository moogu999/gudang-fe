import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MonthCalendar from './MonthCalendar.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const stubs = {
  Button: {
    props: ['ariaLabel'],
    emits: ['click'],
    template: '<button v-bind="$attrs" @click="$emit(\'click\')" />',
  },
}

function mountCalendar(props: Record<string, unknown> = {}) {
  return mount(MonthCalendar, {
    props: { month: '2026-10', ...props },
    global: { stubs },
  })
}

describe('MonthCalendar', () => {
  it('renders every day of the month, starting on the right weekday', () => {
    const wrapper = mountCalendar()
    expect(wrapper.findAll('[data-date]')).toHaveLength(31)
    // 2026-10-01 is a Thursday, so three blanks precede it (Mon, Tue, Wed).
    const cells = wrapper.find('.grid').element.children
    expect(cells[7 + 3].getAttribute('data-date')).toBe('2026-10-01')
  })

  it('emits toggle for a day that can be picked', async () => {
    const wrapper = mountCalendar()
    await wrapper.find('[data-testid="day-2026-10-20"]').trigger('click')
    expect(wrapper.emitted('toggle')?.[0]).toEqual(['2026-10-20'])
  })

  it('does not toggle disabled days', async () => {
    const wrapper = mountCalendar({ disabled: (d: string) => d <= '2026-10-15' })
    const past = wrapper.find('[data-testid="day-2026-10-10"]')
    expect(past.attributes('disabled')).toBeDefined()
    await past.trigger('click')
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })

  it('marks selected days and renders decorations', () => {
    const wrapper = mountCalendar({
      selected: ['2026-10-06'],
      decorations: (d: string) =>
        d === '2026-10-20' ? { tone: 'holiday', title: 'Holiday' } : undefined,
    })
    expect(wrapper.find('[data-testid="day-2026-10-06"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-testid="day-2026-10-20"]').attributes('title')).toBe('Holiday')
    expect(wrapper.find('[data-testid="day-2026-10-20"]').classes().join(' ')).toContain('red')
  })

  it('is inert when read-only', async () => {
    const wrapper = mountCalendar({ readonly: true })
    await wrapper.find('[data-testid="day-2026-10-20"]').trigger('click')
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })

  it('asks for the neighbouring months', async () => {
    const wrapper = mountCalendar({ month: '2026-12' })
    const [prev, next] = wrapper.findAll('button').filter((b) => !b.attributes('data-date'))
    await next.trigger('click')
    await prev.trigger('click')
    expect(wrapper.emitted('update:month')).toEqual([['2027-01'], ['2026-11']])
  })
})
