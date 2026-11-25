<template>
  <!-- A tab of CanvassView (/canvass); the page title and the Add action live in its header. -->
  <div>
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Select
        v-model="statusFilter"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        show-clear
        :placeholder="t('canvassUnloadings.filters.allStatuses')"
        class="w-48"
        data-testid="status-filter"
      />
      <DatePicker
        v-model="dateRange"
        selection-mode="range"
        show-icon
        show-clear
        date-format="yy-mm-dd"
        :placeholder="t('canvassUnloadings.filters.dateRange')"
        class="w-72"
      />
      <InfiniteSelect
        v-model="salesmanFilter"
        :fetch-fn="(q: string) => EmployeesService.listForSelect(q)"
        :custom-filters="canvassFilters"
        option-label="name"
        option-value="id"
        show-clear
        :placeholder="t('canvassUnloadings.filters.allSalesmen')"
        class="min-w-48"
      />
    </div>

    <ResponsiveCard>
      <template #content>
        <TableComponent
          :url="url"
          :columns="columns"
          :query-adapter="CanvassUnloadingsService.toListQuery"
        >
          <template #content="{ col, data }">
            <span v-if="col.field === 'unloadDate'">{{
              dayjs(data.unloadDate).format(DateFormat.DATE)
            }}</span>
            <div v-else-if="col.field === 'salesman'" class="flex flex-col text-left">
              <span class="font-medium">{{ data.salesman.name }}</span>
              <span class="text-xs text-stone-500">{{ data.salesman.nip ?? '' }}</span>
            </div>
            <span v-else-if="col.field === 'vanWarehouse'">{{ data.vanWarehouse.name }}</span>
            <span v-else-if="col.field === 'destinationWarehouse'">{{
              data.destinationWarehouse.name
            }}</span>
            <Tag
              v-else-if="col.field === 'status'"
              :severity="unloadingStatusSeverity(data.status)"
              :value="t(`canvassUnloadings.status.${data.status}`)"
            />
            <div v-else-if="col.field === ''" class="flex gap-2">
              <Button
                v-if="data.status === 'draft' && canWrite"
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                @click="router.push(`/canvass-unloadings/${data.id}/edit`)"
              />
              <Button
                icon="pi pi-eye"
                size="small"
                text
                @click="router.push(`/canvass-unloadings/${data.id}`)"
              />
            </div>
          </template>
        </TableComponent>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import TableComponent from '@/components/table/TableComponent.vue'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import DateFormat from '@/constants/dateFormat'
import { API_ENDPOINTS } from '@/constants/api'
import { usePermissions } from '@/composables'
import { useCanvassEmployeeFilter } from '@/composables/useCanvassEmployeeFilter'
import { CanvassUnloadingsService, EmployeesService } from '@/services'
import type { Column } from '@/types'
import type { CanvassUnloadingStatus } from '@/types/canvassUnloading.type'
import { unloadingStatusSeverity } from '@/utils/canvassHelpers'

const { t } = useI18n()
const router = useRouter()
const { canWrite } = usePermissions('/canvass-unloadings')
const { filters: canvassFilters } = useCanvassEmployeeFilter()

const statusFilter = ref<CanvassUnloadingStatus | null>(null)
const dateRange = ref<Date[] | null>(null)
const salesmanFilter = ref<number | null>(null)

const statuses: CanvassUnloadingStatus[] = ['draft', 'posted', 'cancelled']
const statusOptions = computed(() =>
  statuses.map((s) => ({ value: s, label: t(`canvassUnloadings.status.${s}`) })),
)

const url = computed(() => {
  const params = new URLSearchParams()
  if (statusFilter.value) params.set('status', statusFilter.value)
  if (salesmanFilter.value) params.set('salesmanId', String(salesmanFilter.value))
  const [from, to] = dateRange.value ?? []
  // A half-picked range is not applied until its end date is chosen.
  if (from && to) {
    params.set('dateFrom', dayjs(from).format('YYYY-MM-DD'))
    params.set('dateTo', dayjs(to).format('YYYY-MM-DD'))
  }
  const qs = params.toString()
  return qs ? `${API_ENDPOINTS.CANVASS_UNLOADINGS}?${qs}` : API_ENDPOINTS.CANVASS_UNLOADINGS
})

// The list orders by id DESC server-side, so no column is sortable.
const columns = computed<Column[]>(() => [
  {
    field: 'no',
    header: t('canvassUnloadings.fields.no'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'unloadDate',
    header: t('canvassUnloadings.fields.unloadDate'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'salesman',
    header: t('canvass.fields.salesman'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: 'vanWarehouse',
    header: t('canvass.fields.vanWarehouse'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'destinationWarehouse',
    header: t('canvassUnloadings.fields.destination'),
    sortable: false,
    exportable: true,
    filterable: false,
    hideOnMobile: true,
  },
  {
    field: 'status',
    header: t('common.labels.status'),
    sortable: false,
    exportable: true,
    filterable: false,
  },
  {
    field: '',
    header: t('common.labels.actions'),
    sortable: false,
    exportable: false,
    filterable: false,
  },
])
</script>
