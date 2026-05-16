import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AuditTrailDiffViewer from './AuditTrailDiffViewer.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const prev = { code: 'P1', name: 'Old Name' }
const curr = { code: 'P2', name: 'Old Name' }

describe('AuditTrailDiffViewer', () => {
  it('renders rows for a normal prev/curr diff', () => {
    const wrapper = mount(AuditTrailDiffViewer, {
      props: { prev, curr },
    })
    const rows = wrapper.findAll('.grid.grid-cols-\\[3rem_1fr_3rem_1fr\\]').slice(1)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('shows Created banner when prev is null', () => {
    const wrapper = mount(AuditTrailDiffViewer, {
      props: { prev: null, curr },
    })
    expect(wrapper.find('.bg-green-100').exists()).toBe(true)
    expect(wrapper.find('.bg-red-100').exists()).toBe(false)
  })

  it('shows Deleted banner when curr is null', () => {
    const wrapper = mount(AuditTrailDiffViewer, {
      props: { prev, curr: null },
    })
    expect(wrapper.find('.bg-red-100').exists()).toBe(true)
    expect(wrapper.find('.bg-green-100').exists()).toBe(false)
  })

  it('marks changed lines with red/green backgrounds', () => {
    const wrapper = mount(AuditTrailDiffViewer, {
      props: { prev, curr },
    })
    expect(wrapper.find('.bg-red-50').exists()).toBe(true)
    expect(wrapper.find('.bg-green-50').exists()).toBe(true)
  })

  it('renders unchanged lines without color classes', () => {
    const same = { code: 'P1', name: 'Same' }
    const wrapper = mount(AuditTrailDiffViewer, {
      props: { prev: same, curr: same },
    })
    expect(wrapper.find('.bg-red-50').exists()).toBe(false)
    expect(wrapper.find('.bg-green-50').exists()).toBe(false)
  })
})
