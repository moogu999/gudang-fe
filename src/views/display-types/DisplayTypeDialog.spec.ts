import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrimeVue from 'primevue/config'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiError } from '@/types/api.type'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const create = vi.fn()
vi.mock('@/services', () => ({
  DisplayTypesService: { create: (...a: unknown[]) => create(...a), update: vi.fn() },
}))

import DisplayTypeDialog from './DisplayTypeDialog.vue'

function mountDialog() {
  return mount(DisplayTypeDialog, {
    global: {
      plugins: [PrimeVue],
      stubs: {
        Toast: true,
        Textarea: true,
        InputNumber: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input class="num" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value === \'\' ? null : Number($event.target.value))" />',
        },
      },
    },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('DisplayTypeDialog', () => {
  it('uppercases the code as it is typed', async () => {
    const wrapper = mountDialog()
    await wrapper.find('[data-testid="type-code"]').setValue('rak')
    expect((wrapper.find('[data-testid="type-code"]').element as HTMLInputElement).value).toBe(
      'RAK',
    )
  })

  it('refuses min photos outside 1–10', async () => {
    const wrapper = mountDialog()
    await wrapper.find('[data-testid="type-code"]').setValue('RAK')
    await wrapper.find('[data-testid="type-name"]').setValue('Shelf')
    for (const bad of ['0', '11', '']) {
      await wrapper.find('.num').setValue(bad)
      await wrapper.find('[data-testid="type-save"]').trigger('click')
      expect(create).not.toHaveBeenCalled()
    }
    await wrapper.find('.num').setValue('10')
    create.mockResolvedValue({ id: 1 })
    await wrapper.find('[data-testid="type-save"]').trigger('click')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('submits the trimmed payload', async () => {
    create.mockResolvedValue({ id: 1 })
    const wrapper = mountDialog()
    await wrapper.find('[data-testid="type-code"]').setValue('chl')
    await wrapper.find('[data-testid="type-name"]').setValue('  Chiller ')
    await wrapper.find('.num').setValue('2')
    await wrapper.find('[data-testid="type-save"]').trigger('click')
    await flushPromises()
    expect(create).toHaveBeenCalledWith({
      code: 'CHL',
      name: 'Chiller',
      minPhotos: 2,
      isActive: true,
    })
    expect(wrapper.emitted('close')![0][0]).toBe(true)
  })

  it('shows a duplicate code on the Code field', async () => {
    create.mockRejectedValue(new ApiError('dup', 409, 'DISPLAY_TYPE_CODE_DUPLICATE'))
    const wrapper = mountDialog()
    await wrapper.find('[data-testid="type-code"]').setValue('RAK')
    await wrapper.find('[data-testid="type-name"]').setValue('Shelf')
    await wrapper.find('[data-testid="type-save"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('displayTypes.errors.codeDuplicate')
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
