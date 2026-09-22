import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CashDepositAdhocTable from './CashDepositAdhocTable.vue'
import type { AdhocRow } from '../cashDepositLines'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: 'en-US' } }),
}))

vi.mock('@/services', () => ({
  CustomersService: { list: vi.fn() },
  CashDepositCategoriesService: { list: vi.fn() },
}))

const stubs = {
  global: {
    stubs: {
      DataTable: { name: 'DataTable', template: '<div />' },
      Button: { name: 'Button', template: '<button />' },
    },
  },
}

function mountTable(rows: AdhocRow[]) {
  return mount(CashDepositAdhocTable, { props: { modelValue: rows }, ...stubs })
}

describe('CashDepositAdhocTable', () => {
  it('validate() fails for a row without a customer', () => {
    const wrapper = mountTable([{ _key: 'a', note: '', amount: 500, categoryId: 1 }])
    expect((wrapper.vm as unknown as { validate: () => boolean }).validate()).toBe(false)
  })

  it('validate() passes once a customer is picked', () => {
    const wrapper = mountTable([{ _key: 'a', customerId: 5, note: '', amount: 500, categoryId: 1 }])
    expect((wrapper.vm as unknown as { validate: () => boolean }).validate()).toBe(true)
  })

  it('validate() passes with no rows at all', () => {
    const wrapper = mountTable([])
    expect((wrapper.vm as unknown as { validate: () => boolean }).validate()).toBe(true)
  })
})
