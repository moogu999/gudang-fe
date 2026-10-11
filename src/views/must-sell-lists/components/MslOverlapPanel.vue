<template>
  <ResponsiveCard>
    <template #content>
      <div class="flex flex-col gap-3">
        <h2 class="text-base font-semibold">{{ t('mustSellLists.overlap.title') }}</h2>

        <p v-if="overlaps.length === 0" class="text-sm text-stone-500" data-testid="overlap-empty">
          {{ t('mustSellLists.overlap.none') }}
        </p>

        <div
          v-for="overlap in overlaps"
          :key="overlap.id"
          class="rounded border border-amber-300 bg-amber-50 p-3 text-sm"
          data-testid="overlap-card"
        >
          <p>
            <i18n-t keypath="mustSellLists.overlap.shared" tag="span">
              <template #n>{{ formatNumber(overlap.sharedCustomerCount, locale) }}</template>
              <template #other>
                <RouterLink
                  :to="`/must-sell-lists/${overlap.id}/edit`"
                  class="text-primary-500 font-semibold underline"
                >
                  {{ overlap.code }} {{ overlap.name }}
                </RouterLink>
              </template>
            </i18n-t>
          </p>
          <p class="mt-1 text-xs text-stone-500">
            {{ formatPeriod(overlap.startDate, overlap.endDate, locale) }} ·
            {{ t(`mustSellLists.status.${overlap.displayStatus}`) }}
          </p>

          <ul v-if="overlap.sharedProducts?.length" class="mt-2 flex flex-col gap-2">
            <li
              v-for="product in overlap.sharedProducts"
              :key="product.productId"
              class="rounded bg-white p-2"
            >
              <div class="font-semibold">{{ product.name }}</div>
              <div class="grid grid-cols-1 gap-x-4 text-xs sm:grid-cols-3">
                <span>
                  {{ t('mustSellLists.overlap.thisMinQty') }}:
                  {{ qty(product.thisMinQty, product) }}
                </span>
                <span>
                  {{ t('mustSellLists.overlap.otherMinQty', { code: overlap.code }) }}:
                  {{ qty(product.otherMinQty, product) }}
                </span>
                <span class="font-semibold">
                  {{ t('mustSellLists.overlap.effective') }}:
                  {{ qty(product.effectiveMinQty, product) }}
                </span>
              </div>
            </li>
          </ul>
        </div>

        <small class="text-surface-500">{{ t('mustSellLists.overlap.note') }}</small>
      </div>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import type { MslOverlap, MslSharedProduct } from '@/types/mustSellList.type'
import { formatMinQty, formatNumber, formatPeriod, type FormItem } from '../mustSellListHelpers'

const props = defineProps<{ overlaps: MslOverlap[]; items: FormItem[] }>()

const { t, locale } = useI18n()

const itemsByProduct = computed(() => new Map(props.items.map((i) => [i.productId, i])))

/** In this list's suggested unit for the product, else the base unit's name. */
function qty(baseQty: string | undefined, product: MslSharedProduct): string {
  if (baseQty === undefined || baseQty === '') return t('mustSellLists.overlap.anyQty')
  const item = itemsByProduct.value.get(product.productId)
  if (item) return formatMinQty(baseQty, item)
  return product.baseUomName ? `${baseQty} ${product.baseUomName}` : baseQty
}
</script>
