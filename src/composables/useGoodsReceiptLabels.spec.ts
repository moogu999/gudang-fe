import { describe, it, expect, vi } from 'vitest'
import { useGoodsReceiptLabels } from './useGoodsReceiptLabels'

// Indonesian labels, because that is the case the rewrite exists for: the stored
// values are English snake_case and share no letters with what the table renders.
//
// The arrival type labels stay in the map on purpose. They make the "left
// untouched" case below mean something: the label resolves, and the rewrite
// still declines to use it.
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

    it('rewrites a translated status label to the stored value', () => {
      expect(toSearchTerm('Disetujui')).toBe('approved')
      expect(toSearchTerm('Perlu Persetujuan')).toBe('need_approval')
    })

    it('leaves an arrival type label alone, since the API no longer searches it', () => {
      // Rewriting these would trade what the user typed for a value the API
      // matches nothing on, which reads as a search that silently broke.
      expect(toSearchTerm('Retur Masuk')).toBe('Retur Masuk')
      expect(toSearchTerm('Reguler')).toBe('Reguler')
    })

    it('matches on a partial label, case-insensitively', () => {
      expect(toSearchTerm('disetu')).toBe('approved')
      expect(toSearchTerm('DRAF')).toBe('draft')
    })

    it('leaves ordinary search text untouched', () => {
      expect(toSearchTerm('GR-202607-00001')).toBe('GR-202607-00001')
      expect(toSearchTerm('jelupang')).toBe('jelupang')
    })

    it('leaves an ambiguous term untouched rather than picking one value', () => {
      // "setuju" appears in both Disetujui and Perlu Persetujuan; the API takes
      // one search string, so guessing would hide the other's rows.
      expect(toSearchTerm('setuju')).toBe('setuju')
    })

    it('leaves a blank term untouched', () => {
      expect(toSearchTerm('')).toBe('')
      expect(toSearchTerm('   ')).toBe('   ')
    })
  })
})
