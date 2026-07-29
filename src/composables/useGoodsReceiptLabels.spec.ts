import { describe, it, expect, vi } from 'vitest'
import { useGoodsReceiptLabels } from './useGoodsReceiptLabels'

// Indonesian labels, because that is the case the rewrite exists for: the stored
// values are English snake_case and share no letters with what the table renders.
const labels: Record<string, string> = {
  'goodsReceipts.arrivalTypes.regular': 'Reguler',
  'goodsReceipts.arrivalTypes.consignment': 'Konsinyasi',
  'goodsReceipts.arrivalTypes.bonus': 'Bonus',
  'goodsReceipts.arrivalTypes.transfer': 'Transfer',
  'goodsReceipts.arrivalTypes.returnIn': 'Retur Masuk',
  'goodsReceipts.arrivalTypes.other': 'Lainnya',
  'goodsReceipts.status.draft': 'Draf',
  'goodsReceipts.status.need_approval': 'Perlu Persetujuan',
  'goodsReceipts.status.approved': 'Disetujui',
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => labels[key] ?? key,
  }),
}))

describe('useGoodsReceiptLabels', () => {
  describe('toSearchTerm', () => {
    const { toSearchTerm } = useGoodsReceiptLabels()

    it('rewrites a translated arrival type label to the stored value', () => {
      expect(toSearchTerm('Retur Masuk')).toBe('return_in')
      expect(toSearchTerm('Reguler')).toBe('regular')
    })

    it('rewrites a translated status label to the stored value', () => {
      expect(toSearchTerm('Disetujui')).toBe('approved')
      expect(toSearchTerm('Perlu Persetujuan')).toBe('need_approval')
    })

    it('matches on a partial label, case-insensitively', () => {
      expect(toSearchTerm('retur')).toBe('return_in')
      expect(toSearchTerm('KONSINYASI')).toBe('consignment')
    })

    it('leaves ordinary search text untouched', () => {
      expect(toSearchTerm('GR-202607-00001')).toBe('GR-202607-00001')
      expect(toSearchTerm('jelupang')).toBe('jelupang')
    })

    it('leaves an ambiguous term untouched rather than picking one value', () => {
      // "r" appears in Reguler, Transfer, Retur Masuk and Perlu Persetujuan; the
      // API takes one search string, so guessing would hide the other matches.
      expect(toSearchTerm('r')).toBe('r')
    })

    it('leaves a blank term untouched', () => {
      expect(toSearchTerm('')).toBe('')
      expect(toSearchTerm('   ')).toBe('   ')
    })
  })
})
