import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import GiroView from './GiroView.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const replace = vi.fn()
const push = vi.fn()
let query: Record<string, string> = {}
vi.mock('vue-router', () => ({
  useRoute: () => ({ query }),
  useRouter: () => ({ replace, push }),
}))

// Which giro permissions the user holds, per route key usePermissions is called with.
let perms: Record<string, { read: boolean; write: boolean }> = {}
vi.mock('@/composables', () => ({
  usePermissions: (path: string) => ({
    canRead: computed(() => perms[path]?.read ?? false),
    canWrite: computed(() => perms[path]?.write ?? false),
  }),
}))

const stubs = {
  ResponsiveButton: {
    props: ['label'],
    template: `<button class="action" @click="$emit('click')">{{ label }}</button>`,
  },
  Tabs: { props: ['value'], template: '<div class="tabs" :data-value="value"><slot /></div>' },
  TabList: { template: '<div><slot /></div>' },
  Tab: { props: ['value'], template: '<button class="tab" :data-value="value"><slot /></button>' },
}

// The real tab components pull in services; mocked out (factories are hoisted, so inline).
vi.mock('@/views/giro-register/GiroRegisterTab.vue', () => ({
  default: { name: 'GiroRegisterTab', template: '<div class="GiroRegisterTab" />' },
}))
vi.mock('@/views/giro-receipts/GiroReceiptsTab.vue', () => ({
  default: { name: 'GiroReceiptsTab', template: '<div class="GiroReceiptsTab" />' },
}))
vi.mock('@/views/giro-clearings/GiroClearingsTab.vue', () => ({
  default: { name: 'GiroClearingsTab', template: '<div class="GiroClearingsTab" />' },
}))

function mountView() {
  return mount(GiroView, { global: { stubs } })
}

const tabValues = (w: ReturnType<typeof mountView>) =>
  w.findAll('.tab').map((t) => t.attributes('data-value'))

beforeEach(() => {
  query = {}
  replace.mockReset()
  push.mockReset()
  perms = {
    '/giro-receipts': { read: true, write: true },
    '/giro-clearings': { read: true, write: true },
  }
})

describe('GiroView', () => {
  it('shows all three tabs and opens on the Register', () => {
    const w = mountView()
    expect(tabValues(w)).toEqual(['register', 'receipts', 'clearings'])
    expect(w.find('.GiroRegisterTab').exists()).toBe(true)
  })

  it('opens the tab named in ?tab=', () => {
    query = { tab: 'clearings' }
    expect(mountView().find('.GiroClearingsTab').exists()).toBe(true)
  })

  it('falls back to the first readable tab for an unknown or forbidden ?tab=', () => {
    perms['/giro-clearings'] = { read: false, write: false }
    query = { tab: 'clearings' }
    const w = mountView()
    expect(tabValues(w)).toEqual(['register', 'receipts'])
    expect(w.find('.GiroRegisterTab').exists()).toBe(true)
  })

  it('a clearing-only user sees just Clearings', () => {
    perms['/giro-receipts'] = { read: false, write: false }
    const w = mountView()
    expect(tabValues(w)).toEqual(['clearings'])
    expect(w.find('.GiroClearingsTab').exists()).toBe(true)
  })

  it('shows each create action only with its write permission', () => {
    perms['/giro-clearings'] = { read: true, write: false }
    const w = mountView()
    expect(w.findAll('.action').map((b) => b.text())).toEqual(['giro.actions.receiveGiros'])
  })
})
