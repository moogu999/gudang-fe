import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
const upload = vi.fn()
vi.mock('@/services/files.service', () => ({
  FilesService: { upload: (...a: unknown[]) => upload(...a), remove: vi.fn() },
}))

import PhotoGallery from './PhotoGallery.vue'
import { ApiError } from '@/types/api.type'

const photo = (id: number) => ({ id, url: `/f/${id}.jpg` })
const file = () => new File(['x'], 'a.jpg', { type: 'image/jpeg' })

function mountGallery(props: Record<string, unknown> = {}) {
  return mount(PhotoGallery, {
    props: { ownerType: 'competitor_product', modelValue: [], ...props },
    global: { stubs: { Dialog: true, Checkbox: true } },
  })
}

async function pick(wrapper: ReturnType<typeof mountGallery>, files: File[]) {
  const input = wrapper.get('[data-testid="photo-input"]')
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
})

describe('PhotoGallery', () => {
  it('hides the add tile once max is reached', () => {
    expect(
      mountGallery({ modelValue: [photo(1)] })
        .find('[data-testid="add-photo"]')
        .exists(),
    ).toBe(true)
    expect(
      mountGallery({ modelValue: [photo(1), photo(2), photo(3)] })
        .find('[data-testid="add-photo"]')
        .exists(),
    ).toBe(false)
  })

  it('does not upload in create mode until flushPending', async () => {
    const wrapper = mountGallery()
    await pick(wrapper, [file()])
    expect(upload).not.toHaveBeenCalled()

    upload.mockResolvedValue({ id: 5, url: '/f/5.jpg' })
    const failed = await (
      wrapper.vm as unknown as { flushPending(id: number): Promise<number> }
    ).flushPending(9)
    expect(upload).toHaveBeenCalledWith('competitor_product', 9, 'photo', expect.any(File))
    expect(failed).toBe(0)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[{ id: 5, url: '/f/5.jpg' }]])
  })

  it('uploads at once when the owner exists', async () => {
    upload.mockResolvedValue({ id: 6, url: '/f/6.jpg' })
    const wrapper = mountGallery({ ownerId: 3 })
    await pick(wrapper, [file()])
    expect(upload).toHaveBeenCalledWith('competitor_product', 3, 'photo', expect.any(File))
  })

  it('counts selected carry-over photos against max', () => {
    const wrapper = mountGallery({
      modelValue: [photo(1)],
      carryOver: [photo(10), photo(11)],
      carryOverIds: [10, 11],
    })
    expect(wrapper.find('[data-testid="add-photo"]').exists()).toBe(false)
  })

  it('emits a localized error on file_limit_reached', async () => {
    upload.mockRejectedValue(new ApiError('limit', 409, 'file_limit_reached'))
    const wrapper = mountGallery({ ownerId: 3 })
    await pick(wrapper, [file()])
    expect(wrapper.emitted('error')?.[0]).toEqual(['common.photos.limitReached'])
  })
})
