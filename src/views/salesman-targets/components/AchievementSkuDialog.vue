<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="header"
    :style="{ width: '40rem', maxWidth: '95vw' }"
    @show="load"
  >
    <div v-if="isLoading" class="flex justify-center py-8">
      <i class="pi pi-spinner pi-spin text-2xl text-stone-400" />
    </div>
    <p v-else-if="rows.length === 0" class="py-6 text-center text-sm text-stone-500">
      {{ t('salesmanTargets.achievement.sku.empty') }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full border-collapse text-sm">
        <thead class="bg-stone-50">
          <tr>
            <th class="border-b border-stone-200 px-3 py-2 text-left font-medium">
              {{ t('salesmanTargets.achievement.sku.columns.code') }}
            </th>
            <th class="border-b border-stone-200 px-3 py-2 text-left font-medium">
              {{ t('salesmanTargets.achievement.sku.columns.name') }}
            </th>
            <th class="border-b border-stone-200 px-3 py-2 text-right font-medium">
              {{ t('salesmanTargets.achievement.sku.columns.qty') }} ({{ unitText }})
            </th>
            <th v-if="hasValue" class="border-b border-stone-200 px-3 py-2 text-right font-medium">
              {{ t('salesmanTargets.achievement.sku.columns.value') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.productId">
            <td class="border-b border-stone-200 px-3 py-2 font-mono">{{ row.productCode }}</td>
            <td class="border-b border-stone-200 px-3 py-2">{{ row.productName }}</td>
            <td class="border-b border-stone-200 px-3 py-2 text-right">{{ qtyText(row.qty) }}</td>
            <td v-if="hasValue" class="border-b border-stone-200 px-3 py-2 text-right">
              {{ valueText(row.value) }}
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-stone-50 font-medium">
          <tr>
            <td colspan="2" class="px-3 py-2">
              {{ t('salesmanTargets.achievement.columns.total') }}
            </td>
            <td class="px-3 py-2 text-right">{{ totalQtyText }}</td>
            <td v-if="hasValue" class="px-3 py-2 text-right">{{ totalValueText }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="mt-3 text-xs text-stone-500">
      {{ t('salesmanTargets.achievement.sku.analysisOnly') }}
    </p>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { SalesmanTargetsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { AchievementItemBreakdownRow } from '@/types/salesmanTarget.type'
import { formatNumber, translateTargetError } from '../salesmanTargetHelpers'
import { itemLabel, toDisplay, unitOf, type FormItem } from '../salesmanTargetGrid'

const props = defineProps<{
  targetId: number
  item: FormItem
  employee?: { id: number; name: string }
  hasValue: boolean
  toastGroup: string
}>()

const visible = defineModel<boolean>('visible', { required: true })

const { t, te, locale } = useI18n()
const toast = useToast()

const rows = ref<AchievementItemBreakdownRow[]>([])
const isLoading = ref(false)

const unit = computed(() => unitOf(props.item))
const unitText = computed(
  () =>
    unit.value?.symbol ??
    props.item.units.find((u) => u.isBase)?.symbol ??
    t('salesmanTargets.items.baseUnit'),
)

const header = computed(
  () =>
    `${itemLabel(props.item)} · ${props.employee?.name ?? t('salesmanTargets.achievement.sku.allSalesmen')}`,
)

function qtyText(base: string): string {
  return formatNumber(toDisplay(base, unit.value) ?? 0, locale.value, 4)
}
function valueText(value?: string): string {
  return `Rp ${formatNumber(Number(value ?? 0), locale.value)}`
}

const totalQtyText = computed(() =>
  formatNumber(
    toDisplay(String(rows.value.reduce((sum, r) => sum + Number(r.qty), 0)), unit.value) ?? 0,
    locale.value,
    4,
  ),
)
const totalValueText = computed(() =>
  valueText(String(rows.value.reduce((sum, r) => sum + Number(r.value ?? 0), 0))),
)

async function load() {
  if (!props.item.id) return
  isLoading.value = true
  rows.value = []
  try {
    rows.value = await SalesmanTargetsService.achievementItem(
      props.targetId,
      props.item.id,
      props.employee?.id,
    )
  } catch (e) {
    toast.add(commonErrorToast(translateTargetError(e, t, te), props.toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
