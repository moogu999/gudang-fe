import { useI18n } from 'vue-i18n'

/**
 * Translated labels for the goods receipt enums.
 *
 * The API returns these as raw snake_case values ("return_in"), which must never
 * reach the screen as-is — CSS `capitalize` only turns them into "Return_in".
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { arrivalTypeLabel } = useGoodsReceiptLabels()
 * </script>
 *
 * <template>{{ arrivalTypeLabel(data.arrivalType) }}</template>
 * ```
 */
export function useGoodsReceiptLabels() {
  const { t } = useI18n()

  /**
   * @param value - Raw arrival type from the API
   * @returns Translated label, the raw value if the enum gained a member the UI
   *          doesn't know yet, or "-" when absent
   */
  function arrivalTypeLabel(value?: string | null): string {
    if (!value) return '-'

    const labels: Record<string, string> = {
      regular: t('goodsReceipts.arrivalTypes.regular'),
      consignment: t('goodsReceipts.arrivalTypes.consignment'),
      bonus: t('goodsReceipts.arrivalTypes.bonus'),
      transfer: t('goodsReceipts.arrivalTypes.transfer'),
      return_in: t('goodsReceipts.arrivalTypes.returnIn'),
      other: t('goodsReceipts.arrivalTypes.other'),
    }

    return labels[value] ?? value
  }

  /**
   * @param value - Raw stock type from the API
   * @returns Translated label, the raw value for an unknown one, or "-" when absent
   */
  function stockTypeLabel(value?: string | null): string {
    if (!value) return '-'

    const labels: Record<string, string> = {
      good: t('goodsReceipts.stockTypes.good'),
      bad: t('goodsReceipts.stockTypes.bad'),
    }

    return labels[value] ?? value
  }

  return { arrivalTypeLabel, stockTypeLabel }
}
