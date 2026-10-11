<template>
  <ResponsiveCard>
    <template #content>
      <div class="flex flex-col gap-3">
        <div>
          <h2 class="text-base font-semibold">{{ t('mustSellLists.scope.title') }}</h2>
          <p class="text-sm text-stone-500">
            {{ t('mustSellLists.scope.subtitle', { level: levelLabel }) }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2" data-testid="scope-chips">
          <Chip
            v-if="scopeAll"
            :label="t('mustSellLists.scope.all')"
            class="bg-primary-100 text-sm"
            data-testid="scope-all-chip"
          />
          <Chip
            v-for="value in values"
            :key="value.id"
            :removable="!readonly"
            :class="['text-sm', value.isActive && !value.deleted ? '' : 'opacity-60']"
            @remove="removeValue(value.id)"
          >
            <span>{{ chipLabel(value) }}</span>
          </Chip>
          <span v-if="!scopeAll && values.length === 0" class="text-sm text-stone-400">
            {{ t('mustSellLists.scope.empty') }}
          </span>
        </div>

        <div v-if="!readonly" class="flex flex-wrap items-center gap-2">
          <MultiSelect
            :model-value="[]"
            :options="availableOptions"
            option-label="name"
            option-value="id"
            :placeholder="t('mustSellLists.scope.add')"
            :loading="loading"
            :disabled="scopeAll"
            filter
            :show-toggle-all="false"
            display="chip"
            class="min-w-56"
            data-testid="scope-add"
            @update:model-value="onPicked"
          />
          <Button
            type="button"
            :label="t('mustSellLists.scope.all')"
            :severity="scopeAll ? 'primary' : 'secondary'"
            :outlined="!scopeAll"
            size="small"
            data-testid="scope-all-toggle"
            @click="toggleAll"
          />
        </div>

        <small v-if="error" class="text-red-500">{{ error }}</small>
        <small class="text-surface-500">
          {{ t('mustSellLists.scope.help', { level: levelLabel }) }}
        </small>
      </div>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import MultiSelect from 'primevue/multiselect'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import {
  CustomerCategoriesService,
  CustomerChannelsService,
  CustomerOutletTypesService,
} from '@/services'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import { commonErrorToast } from '@/services/toast'
import type { Base } from '@/types/api.type'
import type { MslScopeLevel, MslScopeValue } from '@/types/mustSellList.type'
import { scopeLevelLabelKey } from '../mustSellListHelpers'

interface MasterRow {
  id: number
  name: string
  isActive: boolean
}

const props = defineProps<{
  level: MslScopeLevel
  readonly?: boolean
  error?: string
  toastGroup: string
}>()

const scopeAll = defineModel<boolean>('scopeAll', { required: true })
const values = defineModel<MslScopeValue[]>('values', { required: true })

const { t } = useI18n()
const toast = useToast()

const levelLabel = computed(() => t(scopeLevelLabelKey(props.level)))

const options = ref<MasterRow[]>([])
const loading = ref(false)

function listerFor(level: MslScopeLevel): (q: string) => Promise<Base<MasterRow>> {
  if (level === 'outlet_type') return (q) => CustomerOutletTypesService.list(q)
  if (level === 'channel') return (q) => CustomerChannelsService.list(q)
  return (q) => CustomerCategoriesService.list(q)
}

async function loadOptions() {
  const level = props.level
  loading.value = true
  try {
    const query = new GenericQueryBuilder().withPagination(1, 500).build()
    const res = await listerFor(level)(query)
    if (level !== props.level) return
    options.value = res.data
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    loading.value = false
  }
}

// Inactive options already saved stay; new ones must be active.
const availableOptions = computed(() => {
  const chosen = new Set(values.value.map((v) => v.id))
  return options.value.filter((o) => o.isActive && !chosen.has(o.id))
})

function chipLabel(value: MslScopeValue): string {
  if (value.deleted) return `${value.name} ${t('mustSellLists.scope.deleted')}`
  if (!value.isActive) return `${value.name} ${t('mustSellLists.scope.inactive')}`
  return value.name
}

function onPicked(ids: number[]) {
  if (ids.length === 0) return
  const picked = options.value
    .filter((o) => ids.includes(o.id))
    .map((o) => ({ id: o.id, name: o.name, isActive: o.isActive, deleted: false }))
  values.value = [...values.value, ...picked]
  // "All" and values exclude each other: adding a value turns All off.
  scopeAll.value = false
}

function removeValue(id: number) {
  values.value = values.value.filter((v) => v.id !== id)
}

function toggleAll() {
  scopeAll.value = !scopeAll.value
  // Picking All clears the values.
  if (scopeAll.value) values.value = []
}

watch(() => props.level, loadOptions, { immediate: true })
</script>
