<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('giroClearings.sections.picker') }}
      </h3>
      <label class="flex items-center gap-2 text-sm">
        <ToggleSwitch
          v-model="showAll"
          input-id="showAllHeld"
          data-testid="show-all"
          @update:model-value="load"
        />
        <span>{{ t('giroClearings.picker.showAllHeld') }}</span>
      </label>
    </div>

    <Message v-if="!branchId" severity="info" variant="simple">
      {{ t('giroClearings.picker.selectBranchFirst') }}
    </Message>

    <template v-else>
      <!-- Raw DataTable; selection is derived from the `selected` prop, keyed by giro id. -->
      <DataTable
        :value="items"
        data-key="giroId"
        selection-mode="multiple"
        :selection="selectionForPage"
        :select-all="allPickedOnPage"
        :paginator="items.length > pageSize"
        :rows="pageSize"
        :loading="loading"
        class="text-sm"
        @row-select="onRowSelect"
        @row-unselect="onRowUnselect"
        @select-all-change="onSelectAllChange"
      >
        <Column selection-mode="multiple" header-style="width: 3rem" />
        <Column :header="t('giroReceipts.fields.giroNo')">
          <template #body="{ data }">
            <div class="font-mono">{{ data.giroNo }}</div>
            <div class="text-xs text-stone-500">{{ data.issuingBank }}</div>
          </template>
        </Column>
        <Column :header="t('giroReceipts.fields.customer')">
          <template #body="{ data }">{{ data.customerName }}</template>
        </Column>
        <Column :header="t('giroReceipts.fields.dueDate')">
          <template #body="{ data }">
            <div>{{ dayjs(data.dueDate).format(DateFormat.DATE) }}</div>
            <Tag
              v-if="isNotYetDue(data.dueDate, depositDate)"
              severity="warn"
              class="mt-1"
              data-testid="not-yet-due"
              :value="t('giroClearings.picker.notYetDue')"
            />
          </template>
        </Column>
        <Column :header="t('giroReceipts.fields.amount')" class="text-right">
          <template #body="{ data }">{{ formatNumber(data.amount) }}</template>
        </Column>
        <template #empty>
          <div class="py-6 text-center text-stone-500">{{ t('giroClearings.picker.empty') }}</div>
        </template>
        <template #footer>
          <div class="flex justify-between text-sm font-semibold">
            <span>{{ t('giroClearings.picker.totalToDeposit') }}</span>
            <span data-testid="picker-total"
              >{{ t('giroReceipts.summary.giroCount', { n: total.count }) }} ·
              {{ formatNumber(total.amount) }}</span
            >
          </div>
        </template>
      </DataTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ToggleSwitch from 'primevue/toggleswitch'
import DateFormat from '@/constants/dateFormat'
import { GirosService } from '@/services'
import {
  defaultDueOnOrBefore,
  fromRegisterRow,
  isNotYetDue,
  selectionTotal,
  type GiroPick,
} from '../giroClearingLines'

interface Props {
  branchId?: number
  depositDate: Date | null
  /** The picked giros — owned by the parent, keyed by giroId. */
  selected: GiroPick[]
}

const props = withDefaults(defineProps<Props>(), { branchId: undefined })

const emit = defineEmits<{ 'update:selected': [selected: GiroPick[]] }>()

const { t } = useI18n()

/** Held giros are one branch's custody drawer — well under this in practice. */
const LOAD_LIMIT = 500
const pageSize = 10

const showAll = ref(false)
const loading = ref(false)
const loaded = ref<GiroPick[]>([])

// Picked giros the current window hides (a draft's giro due later, say) stay listed, so the
// user can always see and untick what the batch holds.
const items = computed(() => {
  const ids = new Set(loaded.value.map((p) => p.giroId))
  return [...props.selected.filter((p) => !ids.has(p.giroId)), ...loaded.value]
})

const selectedIds = computed(() => new Set(props.selected.map((p) => p.giroId)))
const selectionForPage = computed(() => items.value.filter((p) => selectedIds.value.has(p.giroId)))
const allPickedOnPage = computed(
  () => items.value.length > 0 && items.value.every((p) => selectedIds.value.has(p.giroId)),
)
const total = computed(() => selectionTotal(props.selected))

async function fetchHeld(dueOnOrBefore?: string): Promise<GiroPick[]> {
  const result = await GirosService.register({
    bucket: 'held',
    branchId: props.branchId,
    dueOnOrBefore,
    limit: LOAD_LIMIT,
  })
  return result.data.map(fromRegisterRow)
}

async function load() {
  if (!props.branchId) {
    loaded.value = []
    return
  }
  loading.value = true
  try {
    const due =
      showAll.value || !props.depositDate ? undefined : defaultDueOnOrBefore(props.depositDate)
    loaded.value = await fetchHeld(due)
  } finally {
    loading.value = false
  }
}

/**
 * After a 409 (someone else deposited a picked giro), drop every pick that is no longer held
 * and reload the list. Returns how many picks were dropped.
 */
async function reloadAndPrune(): Promise<number> {
  if (!props.branchId) return 0
  const held = new Set((await fetchHeld()).map((p) => p.giroId))
  const kept = props.selected.filter((p) => held.has(p.giroId))
  const dropped = props.selected.length - kept.length
  if (dropped > 0) emit('update:selected', kept)
  await load()
  return dropped
}

watch(
  () => [props.branchId, props.depositDate?.getTime()],
  () => load(),
  { immediate: true },
)

function onRowSelect(event: { data: GiroPick }) {
  if (selectedIds.value.has(event.data.giroId)) return
  emit('update:selected', [...props.selected, event.data])
}

function onRowUnselect(event: { data: GiroPick }) {
  emit(
    'update:selected',
    props.selected.filter((p) => p.giroId !== event.data.giroId),
  )
}

function onSelectAllChange(event: { checked: boolean }) {
  if (event.checked) {
    const missing = items.value.filter((p) => !selectedIds.value.has(p.giroId))
    emit('update:selected', [...props.selected, ...missing])
  } else {
    emit('update:selected', [])
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

defineExpose({ reloadAndPrune })
</script>
