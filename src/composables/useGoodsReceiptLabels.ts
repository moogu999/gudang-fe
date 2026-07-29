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

  /**
   * Rewrites a search term that reads like an on-screen enum label into the raw
   * value the API stores, so searching for what the table actually shows works.
   *
   * The stored values are English snake_case ("return_in") while the table shows
   * a translated label ("Retur Masuk"), and typing the label is the only thing a
   * user would think to do. Anything that isn't an enum label is left untouched,
   * so ordinary text search over GR number, remark and warehouse is unaffected.
   *
   * An ambiguous term is left alone as well: the API takes one search string, so
   * there is no way to ask it for two enum values at once, and silently picking
   * one of them would quietly hide the other's rows.
   *
   * @param term - Raw text the user typed into the search box
   * @returns The matching enum value, or the term unchanged
   */
  function toSearchTerm(term: string): string {
    const needle = term.trim().toLowerCase()
    if (!needle) return term

    const arrivalTypes = ['regular', 'consignment', 'bonus', 'transfer', 'return_in', 'other']
    const statuses = ['draft', 'need_approval', 'approved']

    const matches = [
      ...arrivalTypes.filter((v) => arrivalTypeLabel(v).toLowerCase().includes(needle)),
      ...statuses.filter((v) => t(`goodsReceipts.status.${v}`).toLowerCase().includes(needle)),
    ]

    return matches.length === 1 ? matches[0] : term
  }

  return { arrivalTypeLabel, stockTypeLabel, toSearchTerm }
}
