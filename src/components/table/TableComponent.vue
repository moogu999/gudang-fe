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
            :size="buttonSize"
            class="min-h-[44px] min-w-[44px]"
          />
          <Button
            severity="secondary"
            @click="clearFilters"
            text
            :disabled="!hasClearableState"
            :size="buttonSize"
            class="min-h-[44px]"
          >
            {{ t('table.clearFilters') }}
          </Button>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center py-8">
        <i class="pi pi-spinner pi-spin text-2xl"></i>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="items.length === 0"
        class="py-8 text-center text-sm text-stone-500 sm:text-base"
      >
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
                <div class="text-xs font-semibold text-stone-500 sm:text-sm">
                  {{ t('table.no') }}
                </div>
                <div class="text-sm sm:text-base">
                  {{ first + index + 1 }}
                </div>
              </div>

              <!-- Data columns -->
              <div v-for="col in visibleColumns" :key="col.field" class="flex justify-between">
                <div class="text-xs font-semibold text-stone-500 sm:text-sm">
                  {{ col.header }}
                </div>
                <div class="text-right text-sm sm:text-base">
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
          :size="buttonSize"
          class="min-h-[44px] min-w-[44px]"
        />
        <span class="text-xs text-stone-600 sm:text-sm">
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
          :size="buttonSize"
          class="min-h-[44px] min-w-[44px]"
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
            <Button
              icon="pi pi-refresh"
              severity="secondary"
              @click="refresh"
              rounded
              text
              :aria-label="t('table.refresh')"
              class="sm:min-h-0"
            />
            <Button
              severity="secondary"
              @click="clearFilters"
              text
              :disabled="!hasClearableState"
              class="sm:min-h-0"
              >{{ t('table.clearFilters') }}</Button
            >
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
          <!-- Bound to `filters`, not to `filterModel`: in menu mode PrimeVue
               hands the slot a clone of the filter state, and applyFilter reads
               the original. A pick written to the clone would never be seen. -->
          <Select
            v-if="col.filterOptions"
            :model-value="filterValueOf(col)"
            :options="col.filterOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('table.selectValue')"
            class="w-full"
            @update:model-value="(value) => setFilterValue(col, value)"
          />
          <InputText v-else v-model="filterModel.value" disabled />
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
import Select from 'primevue/select'
import { computed, onMounted, reactive, ref, watch, type PropType } from 'vue'
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
import { useResponsiveSize } from '@/composables'

const { t } = useI18n()

const toastGroup = 'tableComponent'
const toast = useToast()

// Responsive detection
const isMobile = useMediaQuery('(max-width: 767px)')
const { buttonSize } = useResponsiveSize()

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

type Filter = Map<string, string | number | boolean>

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
  /**
   * Rewrites the typed term before it is sent to the API. Lets a view whose table
   * renders translated enum labels map those labels back to the values the API
   * stores, so users can search for what they actually see. Left out, the term is
   * sent as typed.
   */
  searchTransform: {
    type: Function as PropType<(term: string) => string>,
    default: undefined,
  },
  /**
   * Rewrites the whole query string before it is appended to `url`. Endpoints
   * outside `/gen/v1` are hand-written and read their own parameter names, so
   * pass the adapter their service exposes. Left out, the generic dialect is
   * sent as built -- and an endpoint that drops what it does not recognise
   * answers a search or a page change with an unfiltered first page.
   */
  queryAdapter: {
    type: Function as PropType<(queryString: string) => string>,
    default: undefined,
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

// The search term is a filter as far as the user is concerned, so clearing has to
// drop it too -- otherwise the table stays narrowed by a box the button appears to
// have just emptied.
async function clearFilters() {
  currFilters.value = new Map()
  searchQuery.value = ''
  resetToFirstPage()
  await fetchData(currPage, currSort, searchQuery.value, currFilters.value)
}

// A table whose columns are all unfilterable and whose search box is empty has
// nothing for this button to do; on those pages it used to look broken rather
// than inapplicable.
const hasClearableState = computed(() => currFilters.value.size > 0 || searchQuery.value !== '')

// `false` and `0` are values a column can legitimately be filtered to, so these
// checks test for absence rather than truthiness. Testing truthiness made a
// status of "Inactive" impossible to filter for: the value was dropped on the
// way out and the table came back unfiltered.
function isSet<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined && value !== ''
}

function filterValueOf(col: ColumnType): string | number | boolean | null {
  return (filters[col.field] as DataTableFilterMetaData)?.value ?? null
}

function setFilterValue(col: ColumnType, value: string | number | boolean | null) {
  filters[col.field] = { value, matchMode: FilterMatchMode.EQUALS }
}

async function applyFilter(callback: () => void, col: ColumnType) {
  let field: string
  let value: string | number | boolean | undefined
  if (!col.underlyingField) {
    field = col.field
    const filter = filters[field] as DataTableFilterMetaData
    if (isSet(filter.value)) {
      value = filter.value
    }
  } else {
    field = col.underlyingField
    value = selectedRow.value?.[field]
  }

  if (field && isSet(value)) {
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
    return isSet(currFilters.value.get(col.underlyingField ? col.underlyingField : col.field))
  }
})

// Select Row
const selectedRow = ref()
watch(selectedRow, (newVal) => {
  for (const col of props.columns) {
    // A column with its own choices is filled from the picker, not from
    // whichever row happens to be selected -- copying the row in would silently
    // replace what the user just chose.
    if (!col.filterable || col.filterOptions) {
      continue
    }

    filters[col.field] = {
      value: getNestedValue(newVal, col.field),
      matchMode: FilterMatchMode.EQUALS,
    }
  }
})

watch(
  () => props.url,
  async () => {
    resetToFirstPage()
    currSort = undefined
    searchQuery.value = ''
    currFilters.value = new Map()
    await fetchData(currPage)
  },
)

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
    queryString = queryString.withSearch(props.searchTransform?.(search) ?? search)
  }

  if (filters) {
    for (const key of filters.keys()) {
      const filterValue = filters.get(key)
      if (isSet(filterValue)) {
        queryString = queryString.withFilter(key, FilterOperator.EQUAL, filterValue)
      }
    }
  }

  queryString = queryString.withPagination(page + 1, itemsPerPage.value)

  const built = props.queryAdapter?.(queryString.build()) ?? queryString.build()
  if (!built) {
    return props.url
  }

  const connector = props.url.includes('?') ? '&' : '?'

  return props.url + connector + built
}
</script>

<style></style>
