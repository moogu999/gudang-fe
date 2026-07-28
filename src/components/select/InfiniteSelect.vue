<template>
  <Select
    :model-value="modelValue"
    @update:model-value="handleSelect"
    :option-label="optionLabel"
    :option-value="optionValue"
    :options="options"
    :loading="loading"
    :filter="filter"
    filter-match-mode="serverSide"
    :placeholder="displayPlaceholder"
    :disabled="disabled"
    :option-disabled="optionDisabledFn"
    @filter="handleFilter"
    :virtual-scroller-options="virtualScrollerOptions"
    :pt="{
      listContainer: '!max-h-[300px]',
      overlay: 'max-w-[95vw] sm:max-w-full',
    }"
  >
    <template #dropdownicon>
      <i v-if="loading" class="pi pi-spin pi-spinner" />
      <i v-else class="pi pi-chevron-down" />
    </template>
    <template v-if="$slots.option" #option="slotProps">
      <slot name="option" v-bind="slotProps" />
    </template>
  </Select>
</template>

<script setup lang="ts" generic="T extends object">
import Select from 'primevue/select'
import { FilterService } from '@primevue/core/api'
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Base } from '@/types/api.type'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'

// InfiniteSelect handles all filtering server-side via @filter events.
// Register a pass-through filter mode so PrimeVue doesn't re-filter the
// server-returned options client-side, which would cause results to disappear.
FilterService.register('serverSide', () => true)

const { t } = useI18n()

interface FilterEvent {
  value: string
}

type SelectValue<T> = string | number | boolean | Date | T | null | undefined

interface CustomFilter {
  filterBy: string
  filterOperator: string
  filterValue: string | number
}

interface Props {
  modelValue?: SelectValue<T>
  /**
   * Field name to read the label from, or a function building it from the option
   * (e.g. `(b) => `${b.code} - ${b.name}``). A function labels both the dropdown
   * list and the selected value, so the two always read the same.
   */
  optionLabel: string | ((option: T) => string)
  optionValue?: string
  fetchFn: (query: string) => Promise<Base<T>>
  filter?: boolean
  placeholder?: string
  limit?: number
  sortBy?: string
  sortOperator?: 'asc' | 'desc'
  useCursor?: boolean
  initialOption?: T
  disabled?: boolean
  customFilters?: CustomFilter[]
  /** Option values (matched against optionValue) to render as disabled, e.g. already picked elsewhere in a form. */
  disabledValues?: (string | number)[]
}

const props = withDefaults(defineProps<Props>(), {
  filter: true,
  placeholder: '',
  limit: 10,
  useCursor: false,
  disabled: false,
  customFilters: () => [],
  disabledValues: () => [],
})

const displayPlaceholder = computed(() => props.placeholder || t('common.labels.selectOption'))

const optionDisabledFn = computed(() => {
  if (!props.disabledValues || props.disabledValues.length === 0) return undefined
  return (option: T) => {
    const value = props.optionValue
      ? (option as Record<string, unknown>)[props.optionValue]
      : option
    return props.disabledValues!.includes(value as string | number)
  }
})

const emit = defineEmits<{
  'update:modelValue': [value: SelectValue<T>]
  'select-option': [option: T]
}>()

const options = ref<T[]>([])
const loading = ref(false)
const nextCursor = ref<string | null>(null)
const hasMore = ref(true)
const filterValue = ref<string>('')

const virtualScrollerOptions = {
  lazy: true,
  onLazyLoad: async () => {
    if (hasMore.value && !loading.value && nextCursor.value) {
      await loadMore()
    }
  },
  itemSize: 38,
  delay: 200,
}

async function fetchData(cursor?: string) {
  loading.value = true

  try {
    const queryBuilder = new GenericQueryBuilder()

    // Handle pagination based on mode
    if (props.useCursor) {
      // Cursor-based pagination
      if (cursor) {
        queryBuilder.withCursor(cursor, props.limit)
      } else {
        // Initial load: only limit, no cursor or page
        queryBuilder.withLimit(props.limit)
      }
    } else {
      // Page-based pagination (fallback to cursor if available)
      if (cursor) {
        queryBuilder.withCursor(cursor, props.limit)
      } else {
        queryBuilder.withPagination(1, props.limit)
      }
    }

    if (filterValue.value) {
      queryBuilder.withSearch(filterValue.value)
    }

    if (props.sortBy) {
      queryBuilder.withSort(props.sortBy, props.sortOperator || 'asc')
    }

    // Apply custom filters
    if (props.customFilters && props.customFilters.length > 0) {
      props.customFilters.forEach((filter) => {
        queryBuilder.withFilter(filter.filterBy, filter.filterOperator, filter.filterValue)
      })
    }

    const query = queryBuilder.build()
    const response = await props.fetchFn(query)

    const fetched = (response.data ?? []).filter(hasUsableLabel)

    if (cursor) {
      options.value = [...options.value, ...fetched] as T[]
    } else {
      options.value = fetched as T[]
    }

    nextCursor.value = response.meta.nextCursor || null
    hasMore.value = response.meta.hasMore ?? false
  } catch (error) {
    console.error('Failed to fetch options:', error)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (nextCursor.value) {
    await fetchData(nextCursor.value)
  }
}

async function handleFilter(event: FilterEvent) {
  filterValue.value = event.value
  nextCursor.value = null
  hasMore.value = true
  await fetchData()
}

function handleSelect(value: SelectValue<T>) {
  emit('update:modelValue', value)
  if (value !== null && value !== undefined && props.optionValue) {
    const fullOption = options.value.find(
      (opt) => (opt as Record<string, unknown>)[props.optionValue!] === value,
    )
    if (fullOption) {
      emit('select-option', fullOption as T)
    }
  }
}

// PrimeVue's Select reads `label.length` while resolving its classes, so an
// option missing the optionLabel field makes the whole render throw and Vue
// stops patching the DOM from there on. Drop such options instead.
function hasUsableLabel(option: T): boolean {
  const label =
    typeof props.optionLabel === 'function'
      ? props.optionLabel(option)
      : (option as Record<string, unknown>)[props.optionLabel]
  return label !== undefined && label !== null
}

onMounted(async () => {
  await fetchData()

  // If initialOption is provided and not in the loaded options, add it
  if (props.initialOption && hasUsableLabel(props.initialOption)) {
    const optionValueKey = props.optionValue
    const initialValue = optionValueKey
      ? (props.initialOption as Record<string, unknown>)[optionValueKey]
      : props.initialOption

    const exists = options.value.some((opt) => {
      const optValue = optionValueKey ? (opt as Record<string, unknown>)[optionValueKey] : opt
      return optValue === initialValue
    })

    if (!exists) {
      options.value = [props.initialOption, ...options.value] as T[]
    }
  }
})

// Watch for changes in customFilters and refetch data
watch(
  () => props.customFilters,
  async () => {
    nextCursor.value = null
    hasMore.value = true
    await fetchData()
  },
  { deep: true },
)
</script>
