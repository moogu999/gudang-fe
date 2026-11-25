<template>
  <div>
    <div v-if="isLoading && entries.length === 0" class="flex justify-center py-8">
      <i class="pi pi-spinner pi-spin text-2xl text-stone-400" />
    </div>
    <p v-else-if="entries.length === 0" class="py-6 text-center text-sm text-stone-500">
      {{ t('visitRules.history.empty') }}
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
              ? t('visitRules.history.showLess')
              : t('visitRules.history.showAll', { n: linesOf(entry).length })
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
        :label="t('visitRules.history.loadMore')"
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
import { useToast } from 'primevue/usetoast'
import { AuditTrailsService } from '@/services'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import { commonErrorToast } from '@/services/toast'
import FilterOperator from '@/constants/filterOperator'
import DateFormat from '@/constants/dateFormat'
import type { AuditTrailListItem } from '@/types/auditTrail.type'
import type { VisitRuleStyle } from '@/types/visitRule.type'
import { humanizeAuditLine } from '../visitRuleHelpers'

const props = defineProps<{
  companyId: number
  /** rule key → wording style, to label levels the way the table does. */
  styles: Record<string, VisitRuleStyle>
  /** Bumped by the parent after each save, so the list re-reads. */
  reloadKey: number
  toastGroup: string
}>()

const { t, te } = useI18n()
const toast = useToast()

const PAGE_SIZE = 10
const COLLAPSED_LINES = 10

const entries = ref<AuditTrailListItem[]>([])
const page = ref(1)
const hasMore = ref(false)
const isLoading = ref(false)
const expanded = ref(new Set<number>())

async function fetchPage(pageNumber: number) {
  const query = new GenericQueryBuilder()
    .withFilter('reference_type', FilterOperator.EQUAL, 'visit_rules')
    .withFilter('reference_id', FilterOperator.EQUAL, props.companyId)
    .withSort('created_at', 'desc')
    .withPagination(pageNumber, PAGE_SIZE)
    .build()
  return AuditTrailsService.list(query)
}

async function reload() {
  isLoading.value = true
  try {
    page.value = 1
    const res = await fetchPage(1)
    entries.value = res.data
    hasMore.value = res.meta.total > res.data.length
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  isLoading.value = true
  try {
    page.value++
    const res = await fetchPage(page.value)
    entries.value = [...entries.value, ...res.data]
    hasMore.value = res.meta.total > entries.value.length
  } catch (e) {
    page.value--
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isLoading.value = false
  }
}

function linesOf(entry: AuditTrailListItem): string[] {
  return entry.description
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) =>
      humanizeAuditLine(
        l,
        (k) => props.styles[k],
        (k) => t(k),
        (k) => te(k),
      ),
    )
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

onMounted(reload)
watch(() => [props.reloadKey, props.companyId], reload)
</script>
