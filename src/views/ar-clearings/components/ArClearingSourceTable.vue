<template>
  <div>
    <Message v-if="!customerId && !readonly" severity="info" variant="simple">
      {{ t('arClearings.sources.selectCustomerFirst') }}
    </Message>

    <template v-else>
      <!-- Raw DataTable: TableComponent hardcodes selection-mode="single". Selection is derived
           from the `picked` prop (keyed on type + line id), never from PrimeVue's own model. -->
      <DataTable
        :value="items"
        data-key="_key"
        :selection-mode="readonly ? undefined : 'multiple'"
        :selection="selectionForPage"
        :select-all="allPickedOnPage"
        :paginator="items.length > pageSize"
        :rows="pageSize"
        :loading="loading"
        class="text-sm"
        @row-select="onRowSelect"
        @row-unselect="onRowUnselect"
        @select-all-change="onSelectAllChange"
      >
        <Column v-if="!readonly" selection-mode="multiple" header-style="width: 3rem" />
        <Column :header="t('arClearings.sources.date')">
          <template #body="{ data }">{{ dayjs(data.sourceDate).format(DateFormat.DATE) }}</template>
        </Column>
        <Column :header="t('arClearings.sources.source')">
          <template #body="{ data }">
            <Tag
              :severity="SOURCE_TAG[data.sourceType as ArCashSourceType].severity"
              :icon="SOURCE_TAG[data.sourceType as ArCashSourceType].icon"
              :value="data.sourceDocumentNo"
              :title="t(`arClearings.sources.type.${data.sourceType}`)"
            />
          </template>
        </Column>
        <Column :header="t('arClearings.sources.description')">
          <template #body="{ data }">{{ data.description || '—' }}</template>
        </Column>
        <Column v-if="!readonly" :header="t('arClearings.sources.amount')" class="text-right">
          <template #body="{ data }">{{ formatNumber(parseFloat(data.amount) || 0) }}</template>
        </Column>
        <Column
          :header="
            readonly ? t('arClearings.sources.consumed') : t('arClearings.sources.remaining')
          "
          class="text-right"
        >
          <template #body="{ data }">
            <span class="font-semibold">{{
              formatNumber(parseFloat(data.unappliedAmount) || 0)
            }}</span>
          </template>
        </Column>
        <template #empty>
          <div class="py-6 text-center text-stone-500">{{ t('arClearings.sources.empty') }}</div>
        </template>
      </DataTable>

      <Message
        v-if="!readonly && hasPartial"
        severity="secondary"
        variant="simple"
        size="small"
        class="mt-2"
        data-testid="partial-hint"
      >
        {{ t('arClearings.sources.partiallyAllocatedHint') }}
      </Message>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import DateFormat from '@/constants/dateFormat'
import { round2, type SourceRow } from '../arClearingLines'
import type { ArCashSourceType } from '@/types/arClearing.type'

const SOURCE_TAG: Record<
  ArCashSourceType,
  { severity: 'info' | 'secondary' | 'success'; icon: string }
> = {
  cash_deposit: { severity: 'info', icon: 'pi pi-wallet' },
  bank_settlement: { severity: 'secondary', icon: 'pi pi-building-columns' },
  giro: { severity: 'success', icon: 'pi pi-file-check' },
}

interface Props {
  customerId?: number
  /** Every poolable cash line of the customer, in the order the server draws on them (D7). */
  items: SourceRow[]
  /** The ticked lines — owned by the parent so a customer switch can clear them in one place. */
  picked: SourceRow[]
  loading?: boolean
  /** VIEW mode: rows are the saved sources; no checkboxes. */
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  customerId: undefined,
  loading: false,
  readonly: false,
})

const emit = defineEmits<{ 'update:picked': [picked: SourceRow[]] }>()

const { t } = useI18n()

const pageSize = 10

const pickedKeys = computed(() => new Set(props.picked.map((s) => s._key)))

const selectionForPage = computed(() => props.items.filter((s) => pickedKeys.value.has(s._key)))

// PrimeVue's header "select all" checkbox only emits `select-all-change` when the
// `select-all` prop is a real boolean; null makes it emit row-select-all instead.
const allPickedOnPage = computed(
  () => props.items.length > 0 && props.items.every((s) => pickedKeys.value.has(s._key)),
)

const hasPartial = computed(() =>
  props.items.some((s) => round2(parseFloat(s.unappliedAmount)) < round2(parseFloat(s.amount))),
)

function onRowSelect(event: { data: SourceRow }) {
  if (pickedKeys.value.has(event.data._key)) return
  emit('update:picked', [...props.picked, event.data])
}

function onRowUnselect(event: { data: SourceRow }) {
  emit(
    'update:picked',
    props.picked.filter((s) => s._key !== event.data._key),
  )
}

function onSelectAllChange(event: { checked: boolean }) {
  if (event.checked) {
    const missing = props.items.filter((s) => !pickedKeys.value.has(s._key))
    emit('update:picked', [...props.picked, ...missing])
  } else {
    emit('update:picked', [])
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
</script>
