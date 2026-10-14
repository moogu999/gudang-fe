<template>
  <div>
    <div v-if="isLoading && !achievement" class="flex justify-center py-12">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <Message v-else-if="notActive" severity="warn">
      {{ t('salesmanTargets.achievement.notActive') }}
    </Message>

    <div v-else-if="loadFailed" class="flex flex-wrap items-center gap-3">
      <Message severity="error">{{ t('salesmanTargets.achievement.loadFailed') }}</Message>
      <Button
        type="button"
        size="small"
        severity="secondary"
        outlined
        :label="t('salesmanTargets.achievement.retry')"
        @click="load"
      />
    </div>

    <p v-else-if="target.lines.length === 0" class="py-6 text-center text-sm text-stone-500">
      {{ t('salesmanTargets.achievement.noLines') }}
    </p>

    <template v-else-if="achievement">
      <!-- Summary cards -->
      <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div v-if="target.hasValue" class="rounded border border-stone-200 p-3">
          <div class="text-xs text-stone-500">
            {{ t('salesmanTargets.achievement.cards.value') }}
          </div>
          <div class="text-lg font-semibold" :class="bandClass(totalValuePct)">
            Rp {{ fmt(totalAchievedValue) }}
          </div>
          <div class="text-xs text-stone-500">
            <template v-if="totalTargetValue > 0">
              {{
                t('salesmanTargets.achievement.cards.valueOf', {
                  pct: fmtPct(totalValuePct),
                  target: fmt(totalTargetValue),
                })
              }}
              ·
              {{
                t('salesmanTargets.achievement.cards.runRate', {
                  pct: fmtPct(totalValueRunRate),
                })
              }}
            </template>
            <template v-else>—</template>
          </div>
        </div>
        <div class="rounded border border-stone-200 p-3">
          <div class="text-xs text-stone-500">
            {{ t('salesmanTargets.achievement.cards.workingDays') }}
          </div>
          <div class="text-lg font-semibold">
            {{ achievement.workingDays.elapsed }} / {{ achievement.workingDays.total }}
          </div>
          <div class="text-xs text-stone-500">
            {{ t('salesmanTargets.achievement.cards.idealNow', { pct: fmtPct(ideal) }) }}
          </div>
        </div>
        <div v-if="target.hasQty && items.length" class="rounded border border-stone-200 p-3">
          <div class="text-xs text-stone-500">
            {{ t('salesmanTargets.achievement.cards.qtyOnTrack') }}
          </div>
          <div class="text-lg font-semibold">
            {{
              t('salesmanTargets.achievement.cards.onTrack', {
                n: onTrackCount,
                m: itemsWithTarget,
              })
            }}
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <SelectButton
          v-if="showToggle"
          v-model="view"
          :options="viewOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          size="small"
        />
        <div class="ml-auto flex items-center gap-2 text-xs text-stone-500">
          <span>{{
            t('salesmanTargets.achievement.asOf', {
              at: dayjs(achievement.asOf).format(DateFormat.DATE_TIME),
            })
          }}</span>
          <Button
            type="button"
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            text
            rounded
            :loading="isLoading"
            :aria-label="t('salesmanTargets.achievement.refresh')"
            @click="load"
          />
        </div>
      </div>

      <!-- Value table -->
      <div v-if="activeView === 'value'" class="overflow-x-auto rounded border border-stone-200">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-stone-50">
            <tr>
              <th
                class="sticky left-0 z-10 min-w-56 border-r border-b border-stone-200 bg-stone-50 px-3 py-2 text-left font-semibold"
              >
                {{ t('salesmanTargets.achievement.columns.salesman') }}
              </th>
              <th class="border-b border-stone-200 px-3 py-2 text-right font-medium">
                {{ t('salesmanTargets.achievement.columns.target') }}
              </th>
              <th class="border-b border-stone-200 px-3 py-2 text-right font-medium">
                {{ t('salesmanTargets.achievement.columns.achieved') }}
              </th>
              <th class="border-b border-stone-200 px-3 py-2 text-right font-medium">
                {{ t('salesmanTargets.achievement.columns.pct') }}
              </th>
              <th class="border-b border-stone-200 px-3 py-2 text-right font-medium">
                {{ t('salesmanTargets.achievement.columns.runRate') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.employeeId" class="hover:bg-stone-50">
              <td class="sticky left-0 z-10 border-r border-b border-stone-200 bg-white px-3 py-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium">{{ row.employeeName }}</span>
                  <Tag
                    v-if="!row.employeeActive"
                    :value="t('salesmanTargets.grid.inactive')"
                    severity="warn"
                  />
                </div>
                <div v-if="row.employeeCode" class="text-xs text-stone-500">
                  {{ row.employeeCode }}
                </div>
              </td>
              <td class="border-b border-stone-200 px-3 py-2 text-right">
                <template v-if="row.targetValue !== null">Rp {{ fmt(row.targetValue) }}</template>
                <span v-else class="text-stone-400">—</span>
              </td>
              <td class="border-b border-stone-200 px-3 py-2 text-right">
                Rp {{ fmt(row.achievedValue) }}
              </td>
              <td
                class="border-b border-stone-200 px-3 py-2 text-right"
                :class="bandClass(valuePct(row))"
                :aria-label="bandLabel(valuePct(row))"
              >
                {{ fmtPct(valuePct(row)) }}
              </td>
              <td
                class="border-b border-stone-200 px-3 py-2 text-right"
                :class="rateClass(runRate(row.achievedValue, row.targetValue, wd))"
              >
                {{ fmtPct(runRate(row.achievedValue, row.targetValue, wd)) }}
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-stone-50 font-medium">
            <tr>
              <td class="sticky left-0 z-10 border-r border-stone-200 bg-stone-50 px-3 py-2">
                {{ t('salesmanTargets.achievement.columns.total') }}
              </td>
              <td class="px-3 py-2 text-right">Rp {{ fmt(totalTargetValue) }}</td>
              <td class="px-3 py-2 text-right">Rp {{ fmt(totalAchievedValue) }}</td>
              <td class="px-3 py-2 text-right" :class="bandClass(totalValuePct)">
                {{ fmtPct(totalValuePct) }}
              </td>
              <td class="px-3 py-2 text-right" :class="rateClass(totalValueRunRate)">
                {{ fmtPct(totalValueRunRate) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Qty table -->
      <div v-else class="overflow-x-auto rounded border border-stone-200">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-stone-50">
            <tr>
              <th
                rowspan="2"
                class="sticky left-0 z-10 min-w-56 border-r border-b border-stone-200 bg-stone-50 px-3 py-2 text-left font-semibold"
              >
                {{ t('salesmanTargets.achievement.columns.salesman') }}
              </th>
              <th
                v-for="item in items"
                :key="item.key"
                colspan="3"
                class="border-r border-b border-stone-200 px-3 py-2 text-center font-semibold"
              >
                <div class="flex items-center justify-center gap-2">
                  <Tag
                    :value="
                      item.productId
                        ? t('salesmanTargets.items.kindProduct')
                        : t('salesmanTargets.items.kindCategory')
                    "
                    :severity="item.productId ? 'secondary' : 'info'"
                  />
                  <span>{{ itemLabel(item) }}</span>
                </div>
                <div class="text-xs font-normal text-stone-500">
                  <template v-if="target.source === 'internal' && item.categoryOptionId">
                    {{ item.principalName ?? t('salesmanTargets.items.allPrincipals') }} ·
                  </template>
                  {{ unitSymbol(item) }}
                </div>
              </th>
            </tr>
            <tr>
              <template v-for="item in items" :key="item.key">
                <th class="border-b border-stone-200 px-2 py-1 text-right text-xs font-medium">
                  {{ t('salesmanTargets.achievement.columns.target') }}
                </th>
                <th class="border-b border-stone-200 px-2 py-1 text-right text-xs font-medium">
                  {{ t('salesmanTargets.achievement.columns.achieved') }}
                </th>
                <th
                  class="border-r border-b border-stone-200 px-2 py-1 text-right text-xs font-medium"
                >
                  {{ t('salesmanTargets.achievement.columns.pct') }}
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.employeeId" class="hover:bg-stone-50">
              <td class="sticky left-0 z-10 border-r border-b border-stone-200 bg-white px-3 py-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium">{{ row.employeeName }}</span>
                  <Tag
                    v-if="!row.employeeActive"
                    :value="t('salesmanTargets.grid.inactive')"
                    severity="warn"
                  />
                </div>
                <div v-if="row.employeeCode" class="text-xs text-stone-500">
                  {{ row.employeeCode }}
                </div>
              </td>
              <template v-for="item in items" :key="item.key">
                <td class="border-b border-stone-200 px-2 py-2 text-right">
                  <template v-if="item.key in row.targetCells">
                    {{ qtyText(row.targetCells[item.key], item) }}
                  </template>
                  <span v-else class="text-stone-400">—</span>
                </td>
                <td class="border-b border-stone-200 px-2 py-2 text-right">
                  <button
                    v-if="item.categoryOptionId"
                    type="button"
                    class="text-primary-500 cursor-pointer hover:underline"
                    @click="openSku(item, row)"
                  >
                    {{ qtyText(row.achievedCells[item.key] ?? 0, item) }}
                  </button>
                  <template v-else>{{ qtyText(row.achievedCells[item.key] ?? 0, item) }}</template>
                </td>
                <td
                  class="border-r border-b border-stone-200 px-2 py-2 text-right"
                  :class="bandClass(qtyPct(row, item))"
                  :aria-label="bandLabel(qtyPct(row, item))"
                >
                  {{ fmtPct(qtyPct(row, item)) }}
                </td>
              </template>
            </tr>
          </tbody>
          <tfoot class="bg-stone-50 font-medium">
            <tr>
              <td class="sticky left-0 z-10 border-r border-stone-200 bg-stone-50 px-3 py-2">
                {{ t('salesmanTargets.achievement.columns.total') }}
              </td>
              <template v-for="item in items" :key="item.key">
                <td class="px-2 py-2 text-right">{{ qtyText(itemTargetTotal(item), item) }}</td>
                <td class="px-2 py-2 text-right">
                  <button
                    v-if="item.categoryOptionId"
                    type="button"
                    class="text-primary-500 cursor-pointer hover:underline"
                    @click="openSku(item)"
                  >
                    {{ qtyText(itemAchievedTotal(item), item) }}
                  </button>
                  <template v-else>{{ qtyText(itemAchievedTotal(item), item) }}</template>
                </td>
                <td
                  class="border-r border-stone-200 px-2 py-2 text-right"
                  :class="bandClass(itemTotalPct(item))"
                >
                  {{ fmtPct(itemTotalPct(item)) }}
                </td>
              </template>
            </tr>
          </tfoot>
        </table>
      </div>

      <p class="mt-3 text-xs text-stone-500">
        {{ t('salesmanTargets.achievement.legend', { pct: fmtPct(ideal) }) }}
      </p>
      <p class="mt-1 text-xs text-stone-500">
        {{ t('salesmanTargets.achievement.basis') }}
      </p>
    </template>

    <AchievementSkuDialog
      v-if="skuItem"
      v-model:visible="skuVisible"
      :target-id="target.id"
      :item="skuItem"
      :employee="skuEmployee"
      :has-value="target.hasValue"
      :toast-group="toastGroup"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Message from 'primevue/message'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import DateFormat from '@/constants/dateFormat'
import { SalesmanTargetsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { SalesmanTarget, SalesmanTargetAchievement } from '@/types/salesmanTarget.type'
import { formatNumber, targetErrorCode, translateTargetError } from '../salesmanTargetHelpers'
import { fromApiItem, itemLabel, toDisplay, unitOf, type FormItem } from '../salesmanTargetGrid'
import {
  BAND_CLASS,
  band,
  idealPct,
  mergeAchievement,
  pct,
  runRate,
  type AchievementBand,
  type AchievementRow,
} from '../salesmanTargetAchievement'
import AchievementSkuDialog from './AchievementSkuDialog.vue'

const props = defineProps<{
  target: SalesmanTarget
  reloadKey: number
  toastGroup: string
}>()

const { t, te, locale } = useI18n()
const toast = useToast()

const achievement = ref<SalesmanTargetAchievement | undefined>()
const isLoading = ref(false)
const loadFailed = ref(false)
const notActive = ref(false)

// A local ref: PrimeVue's SelectButton doesn't repaint on a form-state write.
const view = ref<'value' | 'qty'>('value')

const skuVisible = ref(false)
const skuItem = ref<FormItem | undefined>()
const skuEmployee = ref<{ id: number; name: string } | undefined>()

async function load() {
  isLoading.value = true
  loadFailed.value = false
  notActive.value = false
  try {
    achievement.value = await SalesmanTargetsService.achievement(props.target.id)
  } catch (e) {
    if (targetErrorCode(e) === 'TARGET_NOT_ACTIVE') {
      notActive.value = true
    } else {
      loadFailed.value = true
      toast.add(commonErrorToast(translateTargetError(e, t, te), props.toastGroup))
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(() => props.reloadKey, load)

const items = computed<FormItem[]>(() =>
  props.target.items.map((i) => fromApiItem(i, props.target.items)),
)
const rows = computed<AchievementRow[]>(() =>
  achievement.value ? mergeAchievement(props.target, achievement.value) : [],
)

const wd = computed(() => achievement.value?.workingDays ?? { total: 0, elapsed: 0 })
const ideal = computed(() => idealPct(wd.value))

// ---------------------------------------------------------------------------
// View toggle: only the types the document has
// ---------------------------------------------------------------------------

const showQty = computed(() => props.target.hasQty && items.value.length > 0)
const viewOptions = computed(() => [
  ...(props.target.hasValue
    ? [{ label: t('salesmanTargets.achievement.view.value'), value: 'value' as const }]
    : []),
  ...(showQty.value
    ? [{ label: t('salesmanTargets.achievement.view.qty'), value: 'qty' as const }]
    : []),
])
const showToggle = computed(() => viewOptions.value.length > 1)
const activeView = computed<'value' | 'qty'>(() => {
  const available = viewOptions.value.map((o) => o.value)
  return available.includes(view.value) ? view.value : (available[0] ?? 'value')
})

// ---------------------------------------------------------------------------
// Value
// ---------------------------------------------------------------------------

const totalAchievedValue = computed(
  () =>
    Number(achievement.value?.totals.achievedValue ?? 0) ||
    rows.value.reduce((sum, r) => sum + r.achievedValue, 0),
)
const totalTargetValue = computed(() =>
  rows.value.reduce((sum, r) => sum + (r.targetValue ?? 0), 0),
)
const totalValuePct = computed(() => pct(totalAchievedValue.value, totalTargetValue.value))
const totalValueRunRate = computed(() =>
  runRate(totalAchievedValue.value, totalTargetValue.value, wd.value),
)

function valuePct(row: AchievementRow): number | null {
  return pct(row.achievedValue, row.targetValue)
}

// ---------------------------------------------------------------------------
// Qty
// ---------------------------------------------------------------------------

function itemTargetTotal(item: FormItem): number {
  return rows.value.reduce((sum, r) => sum + (r.targetCells[item.key] ?? 0), 0)
}
function itemAchievedTotal(item: FormItem): number {
  const fromTotals = achievement.value?.totals.cells?.[item.key]
  return fromTotals !== undefined
    ? Number(fromTotals)
    : rows.value.reduce((sum, r) => sum + (r.achievedCells[item.key] ?? 0), 0)
}
function itemTotalPct(item: FormItem): number | null {
  return pct(itemAchievedTotal(item), itemTargetTotal(item))
}
function qtyPct(row: AchievementRow, item: FormItem): number | null {
  // A missing target cell is not targeted, which differs from a target of 0.
  if (!(item.key in row.targetCells)) return null
  return pct(row.achievedCells[item.key] ?? 0, row.targetCells[item.key])
}

const itemsWithTarget = computed(() => items.value.filter((i) => itemTargetTotal(i) > 0).length)
const onTrackCount = computed(
  () => items.value.filter((i) => band(itemTotalPct(i), ideal.value) === 'good').length,
)

function unitSymbol(item: FormItem): string {
  return (
    unitOf(item)?.symbol ??
    item.units.find((u) => u.isBase)?.symbol ??
    t('salesmanTargets.items.baseUnit')
  )
}
function qtyText(base: number, item: FormItem): string {
  return formatNumber(toDisplay(String(base), unitOf(item)) ?? 0, locale.value, 4)
}

function openSku(item: FormItem, row?: AchievementRow) {
  skuItem.value = item
  skuEmployee.value = row ? { id: row.employeeId, name: row.employeeName } : undefined
  skuVisible.value = true
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return formatNumber(n, locale.value)
}
function fmtPct(n: number | null): string {
  return n === null ? '—' : `${formatNumber(n, locale.value, 1)} %`
}
function bandOf(p: number | null): AchievementBand | null {
  return band(p, ideal.value)
}
function bandClass(p: number | null): string {
  const b = bandOf(p)
  return b ? BAND_CLASS[b] : ''
}
/** A run rate is judged against the full target, not the working-day progress. */
function rateClass(p: number | null): string {
  const b = band(p, 100)
  return b ? BAND_CLASS[b] : ''
}
function bandLabel(p: number | null): string | undefined {
  const b = bandOf(p)
  return b ? t(`salesmanTargets.achievement.bands.${b}`) : undefined
}
</script>
