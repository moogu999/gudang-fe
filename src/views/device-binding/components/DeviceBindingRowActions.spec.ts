import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DeviceBindingRowActions from './DeviceBindingRowActions.vue'
import type { DeviceBinding, Device } from '@/types/deviceBinding.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const stubs = {
  global: {
    directives: { tooltip: {} },
    stubs: {
      Button: {
        props: ['disabled'],
        emits: ['click'],
        template: '<button :disabled="disabled" @click="$emit(\'click\')" />',
      },
    },
  },
}

interface Action {
  key: string
  tooltip: string
  disabled?: boolean
}

function device(overrides: Partial<Device> = {}): Device {
  return {
    id: 1,
    deviceUid: 'uid-1',
    platform: 'android',
    status: 'active',
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

function row(overrides: Partial<DeviceBinding> = {}): DeviceBinding {
  return {
    employee: { id: 1, name: 'Budi', typeName: 'Salesman' },
    status: 'active',
    currentDevice: device(),
    appOutdated: false,
    osOutdated: false,
    mockLocationDays30: 0,
    hasUsableCode: false,
    canViewCode: false,
    pinSet: true,
    ...overrides,
  }
}

function mountActions(r: DeviceBinding, canWrite: boolean) {
  return mount(DeviceBindingRowActions, { props: { row: r, canWrite }, ...stubs })
}

function itemsOf(r: DeviceBinding, canWrite: boolean): Action[] {
  return (mountActions(r, canWrite).vm as unknown as { actions: Action[] }).actions
}

/** The rendered buttons, by their test id, so what shows is what's asserted. */
function keys(r: DeviceBinding, canWrite: boolean): string[] {
  return mountActions(r, canWrite)
    .findAll('[data-testid^="row-action-"]')
    .map((b) => b.attributes('data-testid')!.replace('row-action-', ''))
}

describe('DeviceBindingRowActions', () => {
  it('offers reset PIN, history, reset binding and block on a registered row', () => {
    expect(keys(row(), true)).toEqual(['reset_pin', 'history', 'reset_binding', 'block'])
  })

  it('offers the code, history and nothing to reset before the first login', () => {
    const r = row({
      status: 'not_logged_in',
      currentDevice: undefined,
      pinSet: false,
      hasUsableCode: true,
      canViewCode: true,
    })
    expect(keys(r, true)).toEqual(['view-code', 'history'])
  })

  it('offers review on a pending row', () => {
    const r = row({ status: 'pending_review', pendingDevice: device({ id: 2, status: 'pending' }) })
    expect(keys(r, true)[0]).toBe('review')
  })

  it('renders every action as its own button and emits on click', async () => {
    const wrapper = mountActions(row(), true)
    await wrapper.find('[data-testid="row-action-block"]').trigger('click')
    await wrapper.find('[data-testid="row-action-history"]').trigger('click')
    expect(wrapper.emitted('action')).toEqual([['block']])
    expect(wrapper.emitted('history')).toHaveLength(1)
  })

  it('renders the disabled reset binding as a disabled button', () => {
    const r = row({
      status: 'pending_review',
      pendingDevice: device({ id: 2, status: 'pending' }),
      pendingRequestId: 77,
    })
    const button = mountActions(r, true).find('[data-testid="row-action-reset_binding"]')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('disables reset binding while a submitted request waits', () => {
    const r = row({
      status: 'pending_review',
      pendingDevice: device({ id: 2, status: 'pending' }),
      pendingRequestId: 77,
    })
    const reset = itemsOf(r, true).find((i) => i.key === 'reset_binding')!
    expect(reset.disabled).toBe(true)
    expect(reset.tooltip).toContain('deviceBinding.menu.resolvePendingFirst')
  })

  it('keeps reset binding enabled for an unsubmitted request, which it releases', () => {
    const r = row({ status: 'pending_review', pendingDevice: device({ id: 2, status: 'pending' }) })
    expect(itemsOf(r, true).find((i) => i.key === 'reset_binding')!.disabled).toBe(false)
  })

  it('offers unblock only on a blocked row with an open block', () => {
    const blocked = row({ status: 'blocked', currentDevice: undefined, openBlockId: 4 })
    expect(keys(blocked, true)).toEqual(['reset_pin', 'history', 'unblock'])
    expect(keys({ ...blocked, openBlockId: undefined }, true)).not.toContain('unblock')
  })

  it('shows read-only users only review and history', () => {
    const r = row({
      status: 'pending_review',
      pendingDevice: device({ id: 2, status: 'pending' }),
      hasUsableCode: true,
      canViewCode: true,
    })
    expect(keys(r, false)).toEqual(['review', 'history'])
  })

  it('offers the code for an expired PIN-reset code, which viewing reissues', () => {
    const r = row({ pinSet: true, hasUsableCode: false, canViewCode: true })
    expect(keys(r, true)).toContain('view-code')
  })

  it('hides the code once the PIN is set and no code is left', () => {
    expect(keys(row({ pinSet: true, canViewCode: false }), true)).not.toContain('view-code')
  })
})
