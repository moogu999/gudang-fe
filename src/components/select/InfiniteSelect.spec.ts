import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import InfiniteSelect from './InfiniteSelect.vue'
import type { Base, Meta } from '@/types/api.type'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@primevue/core/api', () => ({
  FilterService: { register: vi.fn() },
}))

type Option = { id: number; code?: string | number | null }

const SelectStub = {
  name: 'Select',
  props: [
    'modelValue',
    'options',
    'optionLabel',
    'optionValue',
    'loading',
    'filter',
    'filterMatchMode',
    'placeholder',
    'disabled',
    'virtualScrollerOptions',
    'pt',
  ],
  emits: ['update:modelValue', 'filter'],
  template: '<div class="select-stub" />',
}

type FetchFn = (query: string) => Promise<Base<Option>>

function meta(overrides: Partial<Meta> = {}): Meta {
  return { total: 0, limit: 10, offset: 0, ...overrides }
}

async function mountSelect(fetchFn: FetchFn, props: Record<string, unknown> = {}) {
  const wrapper = mount(InfiniteSelect, {
    props: { optionLabel: 'code', fetchFn, ...props },
    global: { stubs: { Select: SelectStub } },
  })
  await flushPromises()
  return wrapper
}

function renderedOptions(wrapper: ReturnType<typeof mount>): Option[] {
  return wrapper.findComponent(SelectStub).props('options') as Option[]
}

describe('InfiniteSelect option filtering', () => {
  // Regression pin: PrimeVue's Select reads `label.length` while resolving its
  // classes, so handing it an option whose optionLabel field is missing throws
  // mid-render and Vue stops patching the DOM from that point on. The symptom
  // was "the table doesn't refresh after edit" despite correct state.
  it('drops options missing the optionLabel field', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      data: [{ id: 1, code: 'USD' }, { id: 2 }, { id: 3, code: 'EUR' }],
      meta: meta(),
    })

    const wrapper = await mountSelect(fetchFn)

    expect(renderedOptions(wrapper).map((o) => o.id)).toEqual([1, 3])
  })

  it('drops options whose optionLabel is null', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      data: [
        { id: 1, code: null },
        { id: 2, code: 'EUR' },
      ],
      meta: meta(),
    })

    const wrapper = await mountSelect(fetchFn)

    expect(renderedOptions(wrapper).map((o) => o.id)).toEqual([2])
  })

  // The guard checks undefined/null specifically rather than falsiness, because
  // `0` and `''` are valid labels that PrimeVue renders without throwing.
  // Filtering on truthiness here would silently discard real data.
  it('keeps falsy-but-present labels', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      data: [
        { id: 1, code: 0 },
        { id: 2, code: '' },
      ],
      meta: meta(),
    })

    const wrapper = await mountSelect(fetchFn)

    expect(renderedOptions(wrapper).map((o) => o.id)).toEqual([1, 2])
  })

  // Base<T>.data is typed non-optional, so this shape is deliberately cast:
  // the guard exists for malformed/partial responses the type system promises
  // cannot happen but the network can still deliver.
  it('leaves options as an empty array when the response has no data', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ meta: meta() }) as unknown as FetchFn

    const wrapper = await mountSelect(fetchFn)

    expect(renderedOptions(wrapper)).toEqual([])
  })

  it('does not prepend an initialOption that lacks the optionLabel field', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      data: [{ id: 1, code: 'USD' }],
      meta: meta(),
    })

    const wrapper = await mountSelect(fetchFn, {
      optionValue: 'id',
      initialOption: { id: 99 },
    })

    expect(renderedOptions(wrapper).map((o) => o.id)).toEqual([1])
  })

  it('prepends an initialOption that has a usable label', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      data: [{ id: 1, code: 'USD' }],
      meta: meta(),
    })

    const wrapper = await mountSelect(fetchFn, {
      optionValue: 'id',
      initialOption: { id: 99, code: 'ZAR' },
    })

    expect(renderedOptions(wrapper).map((o) => o.id)).toEqual([99, 1])
  })
})
