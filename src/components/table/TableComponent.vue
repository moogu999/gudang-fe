<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <!-- Mobile: Card list view -->
    <div v-if="isMobile">
      <!-- Header controls for mobile -->
      <div class="mb-4 flex flex-col gap-2">
        <IconField class="w-full">
          <InputIcon>
            <i class="pi pi-search" />
          </InputIcon>
          <InputText
            class="w-full"
            :placeholder="t('table.search')"
            @keypress="handleSearch"
            v-model="searchQuery"
          />
          <InputIcon>
            <i v-if="searchQuery" class="pi pi-times cursor-pointer" @click="clearSearch" />
          </InputIcon>
        </IconField>

        <div class="flex justify-end gap-2">
          <Button
            icon="pi pi-refresh"
            severity="secondary"
            @click="refresh"
            rounded
            text
            :aria-label="t('table.refresh')"
          />
          <Button severity="secondary" @click="clearFilters" text size="small">
            {{ t('table.clearFilters') }}
          </Button>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center py-8">
        <i class="pi pi-spinner pi-spin text-2xl"></i>
      </div>

      <!-- Empty state -->
      <div v-else-if="items.length === 0" class="py-8 text-center text-stone-500">
        {{ t('table.noResults') }}
      </div>

      <!-- Card list -->
      <div v-else class="space-y-3">
        <Card
          v-for="(item, index) in items"
          :key="item[dataKey]"
          :pt="{
            body: 'p-3',
            content: 'p-0',
          }"
        >
          <template #content>
            <div class="space-y-2">
              <!-- Number column if enabled -->
              <div v-if="numbered" class="flex justify-between">
                <div class="text-xs font-semibold text-stone-500">
                  {{ t('table.no') }}
                </div>
                <div class="text-sm">
                  {{ first + index + 1 }}
                </div>
              </div>

              <!-- Data columns -->
              <div v-for="col in visibleColumns" :key="col.field" class="flex justify-between">
                <div class="text-xs font-semibold text-stone-500">
                  {{ col.header }}
                </div>
                <div class="text-right text-sm">
                  <slot name="content" :col="col" :data="item">
                    {{ getNestedValue(item, col.field) }}
                  </slot>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Mobile pagination -->
      <div class="mt-4 flex items-center justify-between">
        <Button
          icon="pi pi-chevron-left"
          :disabled="currPage === 0"
          @click="handlePrevPage"
          severity="secondary"
          text
          :aria-label="t('table.previous')"
        />
        <span class="text-sm text-stone-600">
          {{
            t('table.showing', {
              first: first + 1,
              last: Math.min(first + itemsPerPage, total),
              total: total,
            })
          }}
        </span>
        <Button
          icon="pi pi-chevron-right"
          :disabled="first + itemsPerPage >= total"
          @click="handleNextPage"
          severity="secondary"
          text
          :aria-label="t('table.next')"
        />
      </div>
    </div>

    <!-- Desktop: DataTable view -->
    <DataTable
      v-else
      ref="dt"
      selection-mode="single"
      :paginator-template="paginatorTemplate"
      :current-page-report-template="currentPageReportTemplate"
      filter-display="menu"
      :value="items"
      :paginator="true"
      :rows="itemsPerPage"
      :rows-per-page-options="rowsPerPageOptions"
      :loading="loading"
      :removable-sort="removableSort"
      :total-records="total"
      :lazy="lazy"
      :first="first"
      :filters="filters"
      :data-key="dataKey"
      :key="tableKey"
      @page="handlePageChange"
      @sort="handleSortChange"
      v-model:selection="selectedRow"
      striped-rows
    >
      <template #header>
        <div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <IconField class="w-full sm:w-auto">
            <InputIcon>
              <i class="pi pi-search" />
            </InputIcon>
            <InputText
              :placeholder="t('table.search')"
              @keypress="handleSearch"
              v-model="searchQuery"
            />
            <InputIcon>
              <i v-if="searchQuery" class="pi pi-times cursor-pointer" @click="clearSearch" />
            </InputIcon>
          </IconField>

          <div class="flex justify-end gap-2">
            <Button icon="pi pi-refresh" severity="secondary" @click="refresh" rounded text />
            <Button severity="secondary" @click="clearFilters" text>{{
              t('table.clearFilters')
            }}</Button>
          </div>
        </div>
      </template>

      <Column :header="t('table.no')" v-if="numbered">
        <template #body="slotProps"> {{ slotProps.index + 1 }}</template>
      </Column>
      <Column
        v-for="col in visibleColumns"
        :key="col.header"
        :field="col.field"
        :header="col.header"
        :sortable="col.sortable"
        :exportable="col.exportable"
        :class="col.class"
        :show-filter-match-modes="false"
        :pt="{
          filterButtonbar: {
            class: '!justify-end',
          },
        }"
      >
        <template #header>
          <Button
            class="order-10 ms-auto"
            icon="pi pi-filter-slash"
            rounded
            text
            severity="secondary"
            @click="clearFilter(() => {}, col)"
            v-if="isFiltered(col)"
          ></Button>
        </template>
        <template #filter="{ filterModel }" v-if="isFilterable(col)">
          <InputText v-model="filterModel.value" disabled />
        </template>
        <template #filterclear />
        <template #filterapply="{ filterCallback }">
          <Button size="small" @click="applyFilter(filterCallback, col)">{{
            t('table.apply')
          }}</Button>
        </template>

        <template #body="slotProps">
          <slot name="content" :col="col" :data="slotProps.data">
            {{ getNestedValue(slotProps.data, col.field) }}
          </slot>
        </template>
      </Column>

      <template #empty>{{ t('table.noResults') }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import { useI18n } from 'vue-i18n'
import DataTable, {
  type DataTablePageEvent,
  type DataTableSortEvent,
  type DataTableFilterMeta,
  type DataTableFilterMetaData,
} from 'primevue/datatable'
import Column from 'primevue/column'
import Card from 'primevue/card'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { Column as ColumnType } from '@/types/table.type'
import ApiService from '@/services/api'
import type { Base } from '@/types/api.type'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import { FilterMatchMode } from '@primevue/core/api'
import FilterOperator from '@/constants/filterOperator'
import { getNestedValue } from '@/utils/objectHelper'
import { commonErrorToast } from '@/services/toast'
import { useMediaQuery } from '@vueuse/core'

const { t } = useI18n()

const toastGroup = 'tableComponent'
const toast = useToast()

// Responsive detection
const isMobile = useMediaQuery('(max-width: 767px)')

// Pagination template
const currentPageReportTemplate = computed(() =>
  t('table.showing', { first: '{first}', last: '{last}', total: '{totalRecords}' }),
)

const paginatorTemplate = computed(() =>
  isMobile.value
    ? 'PrevPageLink NextPageLink'
    : 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown',
)

type Sort = {
  field: string
  operator: number
}

type Filter = Map<string, string | number>

const props = defineProps({
  rows: {
    type: Number,
    default: 10,
  },
  rowsPerPageOptions: {
    type: Array<number>,
    default: [5, 10, 25],
  },
  removableSort: {
    type: Boolean,
    default: true,
  },
  columns: {
    type: Array<ColumnType>,
    required: true,
  },
  dataKey: {
    type: String,
    default: 'id',
  },
  numbered: {
    type: Boolean,
    default: false,
  },
  lazy: {
    type: Boolean,
    default: true,
  },
  url: {
    type: String,
    required: true,
  },
})

// Visible columns based on screen size
const visibleColumns = computed(() => {
  if (isMobile.value) {
    return props.columns.filter((col) => !col.hideOnMobile)
  }
  return props.columns
})

defineExpose({ clearSearch })

onMounted(async () => await fetchData(currPage))

const loading = ref(false)
const tableKey = ref(0)
let currPage = 0 // PrimeVue DataTable page start from 0
let currSort: Sort | undefined = undefined
const currFilters = ref(new Map())
const itemsPerPage = ref(props.rows)
const items = ref<Array<T>>([])
const total = ref(0)
const first = ref(0)

// Search
const searchQuery = ref('')
async function handleSearch(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    resetToFirstPage()
    currSort = undefined
    await fetchData(currPage, currSort, searchQuery.value, currFilters.value)
  }
}

const dt = ref()
async function clearSearch() {
  resetToFirstPage()
  currSort = undefined
  searchQuery.value = ''
  if (dt.value) {
    dt.value.d_sortField = null
    dt.value.d_sortOrder = null
  }
  currFilters.value = new Map()
  await fetchData(currPage)
}

async function refresh() {
  await fetchData(currPage, currSort, searchQuery.value, currFilters.value)
}

// Filter
const filters = reactive<DataTableFilterMeta>({})
for (const col of props.columns) {
  if (col.filterable) {
    filters[col.field] = {
      value: null,
      matchMode: FilterMatchMode.EQUALS,
    }
  }
}

async function clearFilter(callback: () => void, col: ColumnType) {
  currFilters.value.delete(col.underlyingField ? col.underlyingField : col.field)
  resetToFirstPage()
  callback()
  await fetchData(currPage, currSort, searchQuery.value, currFilters.value)
}

async function clearFilters() {
  currFilters.value = new Map()
  resetToFirstPage()
  await fetchData(currPage, currSort, searchQuery.value, currFilters.value)
}

async function applyFilter(callback: () => void, col: ColumnType) {
  let field: string
  let value: string | number | undefined
  if (!col.underlyingField) {
    field = col.field
    const filter = filters[field] as DataTableFilterMetaData
    if (filter.value) {
      value = filter.value
    }
  } else {
    field = col.underlyingField
    value = selectedRow.value[field]
  }

  if (field && value) {
    currFilters.value.set(field, value)
  }

  resetToFirstPage()
  callback()
  await fetchData(currPage, currSort, searchQuery.value, currFilters.value)
}

const isFilterable = computed(() => {
  return function (col: ColumnType): boolean {
    return col.filterable && !isFiltered.value(col)
  }
})

const isFiltered = computed(() => {
  return function (col: ColumnType): boolean {
    return currFilters.value.get(col.underlyingField ? col.underlyingField : col.field)
      ? true
      : false
  }
})

// Select Row
const selectedRow = ref()
watch(selectedRow, (newVal) => {
  for (const col of props.columns) {
    if (!col.filterable) {
      continue
    }

    filters[col.field] = {
      value: getNestedValue(newVal, col.field),
      matchMode: FilterMatchMode.EQUALS,
    }
  }
})

async function handleSortChange(event: DataTableSortEvent) {
  currPage = 0
  if (event.sortField && event.sortOrder) {
    currSort = {
      field: event.sortField.toString(),
      operator: event.sortOrder,
    }
  } else {
    currSort = undefined
  }
  await fetchData(currPage, currSort, searchQuery.value, currFilters.value)
}

async function handlePageChange(event: DataTablePageEvent) {
  itemsPerPage.value = event.rows
  currPage = event.page
  first.value = event.first
  await fetchData(event.page, currSort, searchQuery.value, currFilters.value)
}

// Mobile pagination handlers
async function handlePrevPage() {
  if (currPage > 0) {
    currPage--
    first.value = currPage * itemsPerPage.value
    await fetchData(currPage, currSort, searchQuery.value, currFilters.value)
  }
}

async function handleNextPage() {
  if (first.value + itemsPerPage.value < total.value) {
    currPage++
    first.value = currPage * itemsPerPage.value
    await fetchData(currPage, currSort, searchQuery.value, currFilters.value)
  }
}

function resetToFirstPage() {
  currPage = 0
  first.value = 0
}

async function fetchData(page: number, sort?: Sort, search?: string, filters?: Filter) {
  loading.value = true
  try {
    const res = await ApiService.get<Base<T>>(buildQuery(page, sort, search, filters))
    items.value = res.data
    total.value = res.meta.total
    tableKey.value++ // Force re-render to ensure slots update properly
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    loading.value = false
  }
}

function buildQuery(page: number, sort?: Sort, search?: string, filters?: Filter): string {
  let queryString = new GenericQueryBuilder()

  if (sort) {
    queryString = queryString.withSort(sort.field, queryString.mapSortOperator(sort.operator))
  }

  if (search) {
    queryString = queryString.withSearch(search)
  }

  if (filters) {
    for (const key of filters.keys()) {
      const filterValue = filters.get(key)
      if (filterValue) {
        queryString = queryString.withFilter(key, FilterOperator.EQUAL, filterValue)
      }
    }
  }

  queryString = queryString.withPagination(page + 1, itemsPerPage.value)

  const connector = props.url.includes('?') ? '&' : '?'

  return props.url + connector + queryString.build()
}
</script>

<style></style>
