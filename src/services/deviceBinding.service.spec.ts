import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeviceBindingService } from './deviceBinding.service'
import { DeviceBindingConfigService } from './deviceBindingConfig.service'
import ApiService from './api'

// The device binding routes ignore parameters they don't read, so a misspelt
// one still answers 200 with the wrong rows. Asserting on the URL is the only
// way to see the difference.
vi.mock('./api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [], meta: { total: 0, limit: 10, offset: 0 } })),
    post: vi.fn(() => Promise.resolve({ deliveries: [] })),
    put: vi.fn(() => Promise.resolve({})),
  },
}))

const get = vi.mocked(ApiService.get)
const post = vi.mocked(ApiService.post)
const put = vi.mocked(ApiService.put)

function split(url: string): { path: string; params: URLSearchParams } {
  const [path, qs] = url.split('?')
  return { path: path!, params: new URLSearchParams(qs ?? '') }
}

beforeEach(() => {
  get.mockClear()
  post.mockClear()
  put.mockClear()
})

describe('DeviceBindingService.listUrl', () => {
  it('sends a status card as status', () => {
    const { path, params } = split(
      DeviceBindingService.listUrl({
        branchId: 3,
        teamId: 7,
        platform: 'ios',
        status: 'pending_review',
      }),
    )
    expect(path).toBe('/v1/device-binding')
    expect(params.get('branchId')).toBe('3')
    expect(params.get('teamId')).toBe('7')
    expect(params.get('platform')).toBe('ios')
    expect(params.get('status')).toBe('pending_review')
    expect(params.has('stale')).toBe(false)
  })

  it('sends the "no sync > 24h" card as stale, not as a status', () => {
    const { params } = split(DeviceBindingService.listUrl({ status: 'stale24h' }))
    expect(params.get('stale')).toBe('true')
    expect(params.has('status')).toBe(false)
  })

  it('sends outdated only when set, and nothing for empty filters', () => {
    expect(DeviceBindingService.listUrl({})).toBe('/v1/device-binding')
    expect(split(DeviceBindingService.listUrl({ outdated: true })).params.get('outdated')).toBe(
      'true',
    )
  })
})

describe('DeviceBindingService.toListQuery', () => {
  it('maps search and page to q and offset, and drops generic filters', () => {
    const params = new URLSearchParams(
      DeviceBindingService.toListQuery(
        'search=budi&page=3&limit=10&filterBy=status&filterOperator=0&filterValue=active',
      ),
    )
    expect(params.get('q')).toBe('budi')
    expect(params.get('offset')).toBe('20')
    expect(params.get('limit')).toBe('10')
    expect(params.has('status')).toBe(false)
  })
})

describe('DeviceBindingService endpoints', () => {
  it('summary carries only the branch, team and platform', async () => {
    await DeviceBindingService.summary({ branchId: 2, platform: 'android' })
    const { path, params } = split(get.mock.calls.at(-1)![0] as string)
    expect(path).toBe('/v1/device-binding/summary')
    expect(params.get('branchId')).toBe('2')
    expect(params.get('platform')).toBe('android')
    expect(params.has('teamId')).toBe(false)
  })

  it('reads the activation code, and polls it without the code', async () => {
    await DeviceBindingService.getActivationCode(5)
    expect(get).toHaveBeenLastCalledWith('/v1/device-binding/employees/5/activation-code')
    await DeviceBindingService.getActivationCode(5, false)
    expect(get).toHaveBeenLastCalledWith(
      '/v1/device-binding/employees/5/activation-code?includeCode=false',
    )
  })

  it('posts every action to its own route', async () => {
    await DeviceBindingService.sendActivationCode(5, ['email', 'whatsapp'])
    expect(post).toHaveBeenLastCalledWith('/v1/device-binding/employees/5/activation-code/send', {
      channels: ['email', 'whatsapp'],
    })
    await DeviceBindingService.resetPin(5, 'forgot')
    expect(post).toHaveBeenLastCalledWith('/v1/device-binding/employees/5/reset-pin', {
      reason: 'forgot',
    })
    await DeviceBindingService.resetBinding(5, 'resigned')
    expect(post).toHaveBeenLastCalledWith('/v1/device-binding/employees/5/reset-binding', {
      reason: 'resigned',
    })
    await DeviceBindingService.block(5, 'lost')
    expect(post).toHaveBeenLastCalledWith('/v1/device-binding/employees/5/block', {
      reason: 'lost',
    })
    await DeviceBindingService.block(5, 'lost', 9)
    expect(post).toHaveBeenLastCalledWith('/v1/device-binding/employees/5/block', {
      reason: 'lost',
      deviceId: 9,
    })
    await DeviceBindingService.unblock(11, 'found')
    expect(post).toHaveBeenLastCalledWith('/v1/device-binding/blocks/11/unblock', {
      reason: 'found',
    })
  })

  it('reads history, change requests and config', async () => {
    await DeviceBindingService.history(5)
    expect(get).toHaveBeenLastCalledWith('/v1/device-binding/employees/5/history')
    await DeviceBindingService.getChangeRequest(9)
    expect(get).toHaveBeenLastCalledWith('/v1/device-binding/requests/9')
    await DeviceBindingConfigService.getMyCompany()
    expect(get).toHaveBeenLastCalledWith('/v1/device-binding-configs/my-company')
    await DeviceBindingConfigService.update(1, {
      activationCodeTtlDays: 7,
      syncOnlyDays: 3,
      maxPinAttempts: 5,
      lockoutMinutes: 30,
      minOsAndroid: '8',
      minOsIos: '15',
    })
    expect(put.mock.calls.at(-1)![0]).toBe('/v1/device-binding-configs/1')
  })
})
