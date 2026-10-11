<template>
  <Dialog
    :visible="true"
    :header="t('displayPrograms.picker.title')"
    modal
    :breakpoints="{ '1200px': '90vw', '640px': '98vw' }"
    :style="{ width: '60vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <IconField>
        <InputIcon><i class="pi pi-search" /></InputIcon>
        <InputText
          v-model="search"
          :placeholder="t('displayPrograms.picker.search')"
          data-testid="picker-search"
          @keydown.enter="fetchPage(0)"
        />
      </IconField>
      <Select
        v-model="outletTypeId"
        :options="outletTypes"
        option-label="name"
        option-value="id"
        :placeholder="t('displayPrograms.picker.allTypes')"
        show-clear
        filter
        class="min-w-48"
        data-testid="picker-type"
      />
    </div>

    <DataTable
      :value="rows"
      data-key="id"
      selection-mode="multiple"
      :selection="selectionForPage"
      :select-all="allOnPageSelected"
      lazy
      paginator
      :rows="pageSize"
      :first="page * pageSize"
      :total-records="total"
      :loading="loading"
      scrollable
      scroll-height="40vh"
      class="text-sm"
      @page="(e: DataTablePageEvent) => fetchPage(e.page)"
      @row-select="onRowSelect"
      @row-unselect="onRowUnselect"
      @select-all-change="onSelectAllChange"
    >
      <Column selection-mode="multiple" header-style="width: 3rem" />
      <Column field="code" :header="t('displayPrograms.picker.columns.code')" class="font-mono" />
      <Column field="name" :header="t('displayPrograms.picker.columns.name')" />
      <Column :header="t('displayPrograms.picker.columns.city')">
        <template #body="{ data }">{{ data.city ?? '—' }}</template>
      </Column>
      <Column :header="t('displayPrograms.picker.columns.outletType')">
        <template #body="{ data }">{{ data.outletType ?? '—' }}</template>
      </Column>
      <template #empty>
        <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
      </template>
    </DataTable>

    <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('displayPrograms.customers.joinDate') }}</label>
        <DatePicker
          v-model="joinDate"
          date-format="yy-mm-dd"
          :min-date="minDate"
          :max-date="maxDate"
          show-icon
          class="w-full"
          data-testid="picker-join"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{
          t('displayPrograms.customers.rentOverride')
        }}</label>
        <InputNumber
          v-model="rentOverride"
          mode="decimal"
          locale="id-ID"
          prefix="Rp "
          :min="0"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          show-clear
          input-class="w-full"
          class="w-full"
          data-testid="picker-rent"
        />
        <small class="text-surface-500">{{ t('displayPrograms.picker.rentHint') }}</small>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <span class="text-sm">
          {{ t('displayPrograms.picker.selected', { n: selected.size }) }}
          <span v-if="atCap" class="ml-2 text-amber-600" data-testid="picker-cap">{{
            t('displayPrograms.picker.cap', { n: MAX_ADD_CUSTOMERS })
          }}</span>
        </span>
        <div class="flex gap-2">
          <Button
            :label="t('common.actions.cancel')"
            severity="secondary"
            :disabled="saving"
            @click="emit('close')"
          />
          <Button
            :label="t('displayPrograms.picker.add', { n: selected.size })"
            icon="pi pi-plus"
            :loading="saving"
            :disabled="selected.size === 0 || !joinDate"
            data-testid="picker-add"
            @click="confirm"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { CustomerOutletTypesService, DisplayProgramsService } from '@/services'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import { commonErrorToast } from '@/services/toast'
import type { DisplayCustomerRef } from '@/types/displayProgram.type'
import { MAX_ADD_CUSTOMERS, fromApiDate, inputToDecimal, toApiDate } from '../displayProgramHelpers'

const props = defineProps<{
  programId: number
  startDate: string
  endDate: string
  saving: boolean
  toastGroup?: string
}>()

const emit = defineEmits<{
  confirm: [body: { customerIds: number[]; joinDate: string; rentOverride?: string }]
  close: []
}>()

const { t } = useI18n()
const toast = useToast()

const pageSize = 10

const search = ref('')
const outletTypeId = ref<number | undefined>()
const outletTypes = ref<{ id: number; name: string }[]>([])

const rows = ref<DisplayCustomerRef[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)

// Kept across pages and searches, so it lives apart from the table's page-scoped state.
const selected = ref(new Map<number, DisplayCustomerRef>())
const atCap = computed(() => selected.value.size >= MAX_ADD_CUSTOMERS)

// The join date defaults to today, or the start of a period that has not begun.
const minDate = fromApiDate(props.startDate)
const maxDate = fromApiDate(props.endDate)
const today = dayjs().startOf('day')
const joinDate = ref<Date | null>(
  today.isBefore(minDate) ? minDate : today.isAfter(maxDate) ? maxDate : today.toDate(),
)
const rentOverride = ref<number | null>(null)

async function fetchPage(p: number) {
  loading.value = true
  page.value = p
  try {
    const res = await DisplayProgramsService.customerOptions({
      programId: props.programId,
      q: search.value.trim() || undefined,
      outletTypeId: outletTypeId.value,
      limit: pageSize,
      offset: p * pageSize,
    })
    rows.value = res.data ?? []
    total.value = res.meta.total
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup ?? ''))
  } finally {
    loading.value = false
  }
}

const selectionForPage = computed(() => rows.value.filter((r) => selected.value.has(r.id)))
const allOnPageSelected = computed(
  () => rows.value.length > 0 && rows.value.every((r) => selected.value.has(r.id)),
)

function onRowSelect(event: { data: DisplayCustomerRef }) {
  if (selected.value.size >= MAX_ADD_CUSTOMERS) return
  selected.value.set(event.data.id, event.data)
}

function onRowUnselect(event: { data: DisplayCustomerRef }) {
  selected.value.delete(event.data.id)
}

function onSelectAllChange(event: { checked: boolean }) {
  for (const row of rows.value) {
    if (event.checked) {
      if (selected.value.size >= MAX_ADD_CUSTOMERS) break
      selected.value.set(row.id, row)
    } else selected.value.delete(row.id)
  }
}

function confirm() {
  if (!joinDate.value || selected.value.size === 0) return
  const rent = inputToDecimal(rentOverride.value)
  emit('confirm', {
    customerIds: [...selected.value.keys()],
    joinDate: toApiDate(joinDate.value),
    ...(rent !== undefined ? { rentOverride: rent } : {}),
  })
}

watch(outletTypeId, () => fetchPage(0))

onMounted(async () => {
  // nextTick: the program id arrives through props, so let them settle before the first read.
  await nextTick()
  fetchPage(0)
  try {
    const query = new GenericQueryBuilder().withPagination(1, 500).build()
    const res = await CustomerOutletTypesService.list(query)
    outletTypes.value = res.data.map((o) => ({ id: o.id, name: o.name }))
  } catch {
    // Non-critical: the type filter stays empty.
  }
})
</script>
