<template>
  <div>
    <div v-if="isLoading && entries.length === 0" class="flex justify-center py-8">
      <i class="pi pi-spinner pi-spin text-2xl text-stone-400" />
    </div>
    <p v-else-if="entries.length === 0" class="py-6 text-center text-sm text-stone-500">
      {{ t('routes.history.empty') }}
    </p>

    <ol v-else class="flex flex-col gap-4">
      <li v-for="entry in entries" :key="entry.id" class="border-l-2 border-stone-200 pl-4">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="font-semibold">
            {{ entry.createdByUser?.name ?? entry.createdByUser?.email ?? t('auditTrails.system') }}
          </span>
          <span class="text-stone-500">{{
            dayjs(entry.createdAt).format(DateFormat.DATE_TIME)
          }}</span>
          <Tag :value="t(`routes.history.kinds.${entry.referenceType}`)" severity="secondary" />
        </div>
        <ul class="mt-1 list-disc pl-5 text-sm">
          <li v-for="(line, i) in visibleLines(entry)" :key="i">{{ line }}</li>
        </ul>
        <Button
          v-if="linesOf(entry).length > COLLAPSED_LINES"
          type="button"
          size="small"
          text
          :label="
            expanded.has(entry.id)
              ? t('routes.history.showLess')
              : t('routes.history.showAll', { n: linesOf(entry).length })
          "
          @click="toggle(entry.id)"
        />
      </li>
    </ol>

    <div v-if="hasMore" class="mt-4 flex justify-center">
      <Button
        type="button"
        severity="secondary"
        outlined
        :label="t('routes.history.loadMore')"
        :loading="isLoading"
        @click="loadMore"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { AuditTrailsService } from '@/services'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import { commonErrorToast } from '@/services/toast'
import FilterOperator from '@/constants/filterOperator'
import DateFormat from '@/constants/dateFormat'
import type { AuditTrailListItem } from '@/types/auditTrail.type'

const props = defineProps<{
  routeId: number
  /** Bumped by the parent after each change, so the list re-reads. */
  reloadKey: number
  toastGroup: string
}>()

const { t } = useI18n()
const toast = useToast()

// The header, its customers and its salesmen are audited as separate types that all point
// at the route, so the three are read together and merged newest first.
const REFERENCE_TYPES = ['route', 'route_customer', 'route_salesman'] as const
const PAGE_SIZE = 10
const COLLAPSED_LINES = 10

const entries = ref<AuditTrailListItem[]>([])
const limit = ref(PAGE_SIZE)
const hasMore = ref(false)
const isLoading = ref(false)
const expanded = ref(new Set<number>())

async function fetchEntries(perType: number) {
  const results = await Promise.all(
    REFERENCE_TYPES.map((type) => {
      const query = new GenericQueryBuilder()
        .withFilter('reference_type', FilterOperator.EQUAL, type)
        .withFilter('reference_id', FilterOperator.EQUAL, props.routeId)
        .withSort('created_at', 'desc')
        .withPagination(1, perType)
        .build()
      return AuditTrailsService.list(query)
    }),
  )
  const merged = results
    .flatMap((r) => r.data)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const total = results.reduce((sum, r) => sum + r.meta.total, 0)
  return { shown: merged.slice(0, perType), total }
}

async function load(perType: number) {
  isLoading.value = true
  try {
    const { shown, total } = await fetchEntries(perType)
    entries.value = shown
    limit.value = perType
    hasMore.value = total > shown.length
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isLoading.value = false
  }
}

function loadMore() {
  return load(limit.value + PAGE_SIZE)
}

function linesOf(entry: AuditTrailListItem): string[] {
  return entry.description.split('\n').filter((l) => l.trim() !== '')
}

function visibleLines(entry: AuditTrailListItem): string[] {
  const lines = linesOf(entry)
  return expanded.value.has(entry.id) ? lines : lines.slice(0, COLLAPSED_LINES)
}

function toggle(id: number) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

onMounted(() => load(PAGE_SIZE))
watch(
  () => props.reloadKey,
  () => load(PAGE_SIZE),
)
</script>
