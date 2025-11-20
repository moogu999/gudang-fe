<template>
  <Select
    :model-value="modelValue"
    @update:model-value="handleSelect"
    :option-label="optionLabel"
    :option-value="optionValue"
    :options="options"
    :loading="loading"
    :filter="filter"
    :placeholder="placeholder"
    @filter="handleFilter"
    :virtual-scroller-options="virtualScrollerOptions"
    :pt="{
      listContainer: '!max-h-[300px]',
    }"
  >
    <template #dropdownicon>
      <i v-if="loading" class="pi pi-spin pi-spinner" />
      <i v-else class="pi pi-chevron-down" />
    </template>
  </Select>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import Select from 'primevue/select'
import { ref, onMounted } from 'vue'
import type { Base } from '@/types/api.type'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'

interface FilterEvent {
  value: string
}

type SelectValue<T> = string | number | boolean | Date | T | null | undefined

interface Props {
  modelValue?: SelectValue<T>
  optionLabel: string
  optionValue?: string
  fetchFn: (query: string) => Promise<Base<T>>
  filter?: boolean
  placeholder?: string
  limit?: number
  sortBy?: string
  sortOperator?: 'asc' | 'desc'
  useCursor?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  filter: true,
  placeholder: 'Select an option',
  limit: 10,
  useCursor: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: SelectValue<T>]
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

    const query = queryBuilder.build()
    const response = await props.fetchFn(query)

    if (cursor) {
      options.value = [...options.value, ...response.data] as T[]
    } else {
      options.value = response.data
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
}

onMounted(async () => {
  await fetchData()
})
</script>
