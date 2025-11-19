<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <DataTable
      ref="dt"
      selection-mode="single"
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      current-page-report-template="Showing {first} to {last} of {totalRecords}"
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
      @page="handlePageChange"
      @sort="handleSortChange"
      v-model:selection="selectedRow"
      striped-rows
    >
      <template #header>
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <IconField>
            <InputIcon>
              <i class="pi pi-search" />
            </InputIcon>
            <InputText placeholder="Search" @keypress="handleSearch" v-model="searchQuery" />
            <InputIcon>
              <i v-if="searchQuery" class="pi pi-times cursor-pointer" @click="clearSearch" />
            </InputIcon>
          </IconField>

          <div>
            <Button
              icon="pi pi-refresh"
              severity="secondary"
              @click="refresh"
              rounded
              text
            ></Button>
            <Button severity="secondary" @click="clearFilters" text>Clear Filters</Button>
          </div>
        </div>
      </template>

      <Column header="No." v-if="numbered">
        <template #body="slotProps"> {{ slotProps.index + 1 }}</template>
      </Column>
      <Column
        v-for="col in columns"
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
          <Button size="small" @click="applyFilter(filterCallback, col)">Apply</Button>
        </template>

        <template #body="slotProps">
          <slot name="content" :col="col" :data="slotProps.data">
            {{ getNestedValue(slotProps.data, col.field) }}
          </slot>
        </template>
      </Column>

      <template #empty>No data found.</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts" generic="T">
import DataTable, {
  type DataTablePageEvent,
  type DataTableSortEvent,
  type DataTableFilterMeta,
  type DataTableFilterMetaData,
} from 'primevue/datatable'
import Column from 'primevue/column'
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

const toastGroup = 'tableComponent'
const toast = useToast()

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

defineExpose({ clearSearch })

onMounted(async () => await fetchData(currPage))

const loading = ref(false)
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
