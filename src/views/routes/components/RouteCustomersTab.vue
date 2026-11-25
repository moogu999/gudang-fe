<template>
  <div>
    <ConfirmDialog :group="confirmGroup" />

    <RouteHolidayConflicts :conflicts="conflicts" @open="openConflict" />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
      <!-- Table -->
      <div class="min-w-0">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SelectButton
            v-model="dayFilter"
            :options="dayFilterOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            data-testid="day-filter"
          />
          <Button
            v-if="canWrite"
            :label="t('routes.customers.add')"
            icon="pi pi-plus"
            size="small"
            data-testid="add-customer"
            @click="isAddShown = true"
          />
        </div>

        <DataTable
          :value="visibleRows"
          data-key="routeCustomerId"
          :loading="loading"
          class="text-sm"
          @row-reorder="onRowReorder"
        >
          <Column v-if="canReorder" row-reorder style="width: 3rem" :reorderable-column="false" />
          <Column header="#" style="width: 3rem">
            <template #body="{ data }">{{ data.sequence }}</template>
          </Column>
          <Column :header="t('routes.customers.columns.customer')">
            <template #body="{ data }">
              <a
                class="cursor-pointer font-semibold hover:underline"
                :data-testid="`open-schedule-${data.routeCustomerId}`"
                @click.prevent="scheduleTarget = data"
              >
                {{ data.customer.name }}
              </a>
              <div class="text-xs text-stone-500">
                {{ [data.customer.outletType, data.customer.address].filter(Boolean).join(' · ') }}
              </div>
            </template>
          </Column>
          <Column :header="t('routes.customers.columns.days')">
            <template #body="{ data }">
              <WeekdayChips
                v-if="data.patternType === 'cycle'"
                :model-value="data.daysMask ?? 0"
                readonly
              />
              <span v-else class="text-amber-700">{{ customSummary(data) }}</span>
            </template>
          </Column>
          <Column :header="t('routes.customers.columns.pattern')">
            <template #body="{ data }">
              <Tag
                :value="patternTagText(data.label, t)"
                :severity="severityOf(data.label)"
              />
            </template>
          </Column>
          <Column v-if="canWrite" style="width: 6rem">
            <template #body="{ data }">
              <Button
                icon="pi pi-calendar"
                severity="secondary"
                text
                rounded
                size="small"
                :aria-label="t('routes.customers.editSchedule')"
                :data-testid="`edit-schedule-${data.routeCustomerId}`"
                @click="scheduleTarget = data"
              />
              <Button
                icon="pi pi-times"
                severity="secondary"
                text
                rounded
                size="small"
                :aria-label="t('common.actions.delete')"
                :data-testid="`remove-${data.routeCustomerId}`"
                @click="confirmRemove(data)"
              />
            </template>
          </Column>
          <template #empty>
            <div class="py-6 text-center text-stone-500">{{ t('routes.customers.empty') }}</div>
          </template>
        </DataTable>
        <p class="mt-3 text-xs text-stone-500">{{ t('routes.customers.footnote') }}</p>
      </div>

      <!-- Side panel -->
      <div class="flex flex-col gap-6">
        <RouteLoadGrid
          :load="load"
          :current-week="currentWeek"
          :selected="{ week: mapWeek, bit: mapBit }"
          @select="(cell) => ((mapWeek = cell.week), (mapBit = cell.bit))"
        />
        <RouteMapPanel
          v-model:week="mapWeek"
          v-model:bit="mapBit"
          :route-id="route.id"
          :customers="rows"
          :allow-sunday="config?.allowSunday ?? false"
          :can-write="canWrite"
          :toast-group="toastGroup"
          @saved="afterChange"
        />
      </div>
    </div>

    <RouteAddCustomerDialog
      v-if="isAddShown"
      :route="route"
      :allow-sunday="config?.allowSunday ?? false"
      :can-move="canWrite"
      :toast-group="toastGroup"
      @close="isAddShown = false"
      @added="afterChange"
      @move="(option) => ((moveTarget = option), (isAddShown = false))"
    />

    <RouteMoveCustomerDialog
      v-if="moveTarget"
      :route="route"
      :option="moveTarget"
      :toast-group="toastGroup"
      @close="moveTarget = undefined"
      @moved="afterChange"
    />

    <RouteScheduleDialog
      v-if="scheduleTarget && config"
      :route="route"
      :customer="scheduleTarget"
      :config="config"
      :holidays="holidays"
      :readonly="!canWrite"
      :confirm-group="confirmGroup"
      :toast-group="toastGroup"
      @close="scheduleTarget = undefined"
      @saved="afterChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Column from 'primevue/column'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable, { type DataTableRowReorderEvent } from 'primevue/datatable'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import WeekdayChips from '@/components/calendar/WeekdayChips.vue'
import { RoutesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import {
  addMonths,
  cycleWeek,
  maskBits,
  monthOf,
  parsePatternLabel,
  patternSeverity,
  weekdayBit,
} from '@/utils/visitCycle'
import type {
  HolidayConflict,
  JourneyPlanConfig,
  LoadResponse,
  Route,
  RouteCustomer,
  RouteCustomerOption,
} from '@/types'
import { translateRouteError } from '../routeErrors'
import { patternTagText, todayIso, type HolidayRange } from '../routeHelpers'
import RouteAddCustomerDialog from './RouteAddCustomerDialog.vue'
import RouteHolidayConflicts from './RouteHolidayConflicts.vue'
import RouteLoadGrid from './RouteLoadGrid.vue'
import RouteMapPanel from './RouteMapPanel.vue'
import RouteMoveCustomerDialog from './RouteMoveCustomerDialog.vue'
import RouteScheduleDialog from './RouteScheduleDialog.vue'

const props = defineProps<{
  route: Route
  config?: JourneyPlanConfig
  holidays: HolidayRange[]
  canWrite: boolean
  toastGroup: string
}>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const confirmGroup = 'routeCustomersConfirm'

const rows = ref<RouteCustomer[]>([])
const load = ref<LoadResponse | null>(null)
const conflicts = ref<HolidayConflict[]>([])
const loading = ref(false)
const dayFilter = ref<'all' | number>('all')
const isAddShown = ref(false)
const moveTarget = ref<RouteCustomerOption | undefined>()
const scheduleTarget = ref<RouteCustomer | undefined>()

const currentWeek = computed(() =>
  props.config ? cycleWeek(todayIso(), props.config.cycleAnchorDate) : 1,
)
const mapWeek = ref(currentWeek.value)
// -1 shows every customer of the route; a weekday shows that day's visits.
const mapBit = ref(-1)

async function loadAll() {
  loading.value = true
  try {
    const [customers, loadResult, conflictResult] = await Promise.all([
      RoutesService.listCustomers(props.route.id),
      RoutesService.load(props.route.id).catch(() => null),
      RoutesService.holidayConflicts(props.route.id).catch(() => []),
    ])
    rows.value = customers
    load.value = loadResult
    conflicts.value = conflictResult
    // A weekday the route no longer visits falls back to the overview.
    if (mapBit.value !== -1 && !usedBits.value.includes(mapBit.value)) mapBit.value = -1
  } catch (e) {
    toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
  } finally {
    loading.value = false
  }
}

async function afterChange() {
  await loadAll()
  emit('changed')
}

onMounted(loadAll)
watch(
  () => props.route.id,
  () => loadAll(),
)

// ---------------------------------------------------------------------------
// Day filter
// ---------------------------------------------------------------------------

const usedBits = computed(() => {
  const union = rows.value.reduce((mask, r) => (r.patternType === 'cycle' ? mask | (r.daysMask ?? 0) : mask), 0)
  return maskBits(union)
})

const dayFilterOptions = computed(() => [
  { label: t('routes.customers.allDays'), value: 'all' as const },
  ...usedBits.value.map((bit) => ({ label: t(`calendar.weekdaysShort.${bit}`), value: bit })),
])

// A day that nobody is visited on any more would leave an empty table with no way back.
watch(usedBits, (bits) => {
  if (dayFilter.value !== 'all' && !bits.includes(dayFilter.value)) dayFilter.value = 'all'
})

const visibleRows = computed(() => {
  const filter = dayFilter.value
  if (filter === 'all') return rows.value
  return rows.value.filter((r) =>
    r.patternType === 'cycle'
      ? ((r.daysMask ?? 0) & (1 << filter)) !== 0
      : r.customDates.some((d) => weekdayBit(d) === filter),
  )
})

// One global sequence: the order is only editable while every customer is shown.
const canReorder = computed(() => props.canWrite && dayFilter.value === 'all')

async function onRowReorder(event: DataTableRowReorderEvent) {
  const reordered = event.value as RouteCustomer[]
  const previous = rows.value
  rows.value = reordered.map((r, i) => ({ ...r, sequence: i + 1 }))
  try {
    await RoutesService.reorderCustomers(
      props.route.id,
      reordered.map((r) => r.routeCustomerId),
    )
    emit('changed')
  } catch (e) {
    rows.value = previous
    toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
    await loadAll()
  }
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function severityOf(label: string) {
  const parsed = parsePatternLabel(label)
  return parsed ? patternSeverity(parsed.kind) : 'secondary'
}

/** "Oct: 6, 15, 26 · Nov not set" for a custom customer. */
function customSummary(row: RouteCustomer): string {
  const month = monthOf(todayIso())
  const next = addMonths(month, 1)
  const days = row.customDates
    .filter((d) => monthOf(d) === month)
    .map((d) => Number(d.slice(8)))
  const parts: string[] = []
  parts.push(
    days.length > 0
      ? `${dayjs(`${month}-01`).format('MMM')}: ${days.join(', ')}`
      : t('routes.custom.noneThisMonth', { month: dayjs(`${month}-01`).format('MMM') }),
  )
  if (!row.customDates.some((d) => monthOf(d) === next)) {
    parts.push(t('routes.custom.notSet', { month: dayjs(`${next}-01`).format('MMM') }))
  }
  return parts.join(' · ')
}

function openConflict(conflict: HolidayConflict) {
  scheduleTarget.value = rows.value.find((r) => r.routeCustomerId === conflict.routeCustomerId)
}

function confirmRemove(row: RouteCustomer) {
  confirm.require({
    group: confirmGroup,
    header: t('routes.customers.removeHeader'),
    message: t('routes.customers.removeMessage', { name: row.customer.name }),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.actions.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await RoutesService.removeCustomer(props.route.id, row.routeCustomerId)
        toast.add(commonSuccessToast(t('routes.messages.customerRemoved'), props.toastGroup))
        await afterChange()
      } catch (e) {
        toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
      }
    },
  })
}
</script>
