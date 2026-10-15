<template>
  <Dialog
    :visible="visible"
    :header="t('routes.customNextMonth.title', { month: nextMonthName })"
    modal
    :breakpoints="{ '1200px': '90vw', '640px': '98vw' }"
    :style="{ width: '50vw' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <template v-if="!result">
      <p class="mb-3 text-sm text-stone-600">
        {{ t('routes.customNextMonth.intro', { month: nextMonthName }) }}
      </p>

      <DataTable
        v-model:selection="selection"
        :value="rows"
        data-key="routeCustomerId"
        :loading="loading"
        scrollable
        scroll-height="40vh"
        class="text-sm"
      >
        <Column selection-mode="multiple" header-style="width: 3rem" />
        <Column field="routeCode" :header="t('routes.customNextMonth.columns.route')" class="font-mono" />
        <Column field="customerName" :header="t('routes.customNextMonth.columns.customer')" />
        <Column :header="t('routes.customNextMonth.columns.thisMonth')">
          <template #body="{ data }">
            {{ data.thisMonthDates.map((d: string) => Number(d.slice(8))).join(', ') || '—' }}
          </template>
        </Column>
        <template #empty>
          <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
        </template>
      </DataTable>
      <p class="mt-3 text-xs text-stone-500">{{ t('routes.customNextMonth.note') }}</p>
    </template>

    <div v-else data-testid="copy-result">
      <Message severity="success" class="mb-3">
        {{ t('routes.customNextMonth.copied', { n: copiedCount }, copiedCount) }}
      </Message>
      <template v-if="skippedRows.length > 0">
        <p class="mb-2 text-sm font-semibold">{{ t('routes.customNextMonth.skippedTitle') }}</p>
        <ul class="list-disc pl-5 text-sm">
          <li v-for="(row, i) in skippedRows" :key="i">
            {{ row.customerName }}: {{ row.from }}
            <template v-if="row.to">→ {{ row.to }}</template>
            ({{ t(`routes.skipReason.${row.reason}`) }})
          </li>
        </ul>
      </template>
    </div>

    <template #footer>
      <Button
        :label="result ? t('common.actions.close') : t('common.actions.cancel')"
        severity="secondary"
        :disabled="saving"
        @click="emit('close')"
      />
      <Button
        v-if="!result"
        :label="t('routes.customNextMonth.copy', { n: selection.length })"
        icon="pi pi-copy"
        :loading="saving"
        :disabled="selection.length === 0"
        data-testid="copy-next-month"
        @click="copy"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { RoutesService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { BulkCopyItem, CopySkip, CustomNextMonthItem } from '@/types'
import { translateRouteError } from '../routeErrors'

const props = defineProps<{ visible: boolean; branchId: number; toastGroup: string }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const { t } = useI18n()
const toast = useToast()

const rows = ref<CustomNextMonthItem[]>([])
const selection = ref<CustomNextMonthItem[]>([])
const loading = ref(false)
const saving = ref(false)
const result = ref<BulkCopyItem[] | null>(null)

const nextMonthName = computed(() => dayjs().add(1, 'month').format('MMMM'))
const copiedCount = computed(() => result.value?.reduce((sum, r) => sum + r.copied.length, 0) ?? 0)
const skippedRows = computed(() =>
  (result.value ?? []).flatMap((r) =>
    r.skipped.map((s: CopySkip) => ({ ...s, customerName: r.customerName })),
  ),
)

async function load() {
  loading.value = true
  result.value = null
  try {
    rows.value = await RoutesService.customNextMonth(props.branchId)
    selection.value = [...rows.value]
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    loading.value = false
  }
}

async function copy() {
  saving.value = true
  try {
    result.value = await RoutesService.bulkCopyNextMonth(
      props.branchId,
      selection.value.map((r) => r.routeCustomerId),
    )
    emit('changed')
  } catch (e) {
    toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
  } finally {
    saving.value = false
  }
}

watch(
  () => props.visible,
  (shown) => {
    if (shown) load()
  },
  { immediate: true },
)
</script>
