import { describe, it, expect, vi, beforeEach } from 'vitest'
import ApiService from './api'
import { GoodsReceiptsService } from './goodsReceipts.service'
import { API_ENDPOINTS } from '@/constants/api'

vi.mock('./api', () => ({
  default: { get: vi.fn() },
}))

const get = vi.mocked(ApiService.get)
const url = API_ENDPOINTS.PURCHASE_ORDERS_AVAILABLE_FOR_RECEIPT

describe('GoodsReceiptsService.listAvailablePurchaseOrders', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: [], meta: {} })
  })

  it('adds the receipt branch to the picker’s own query', async () => {
    await GoodsReceiptsService.listAvailablePurchaseOrders('page=2&limit=20', 5)

    expect(get).toHaveBeenCalledWith(`${url}?page=2&limit=20&branchId=5`)
  })

  it('sends the branch alone when the picker has no query', async () => {
    await GoodsReceiptsService.listAvailablePurchaseOrders(undefined, 5)

    expect(get).toHaveBeenCalledWith(`${url}?branchId=5`)
  })

  it('leaves the branch out when there is none', async () => {
    await GoodsReceiptsService.listAvailablePurchaseOrders('page=1')

    expect(get).toHaveBeenCalledWith(`${url}?page=1`)
  })
})
