<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="canvassLoadingConfirm" />

  <div v-if="isLoading" class="flex items-center justify-center py-8">
    <ProgressSpinner />
  </div>

  <div v-else>
    <div v-if="loading" class="mb-4 flex flex-wrap items-center gap-2">
      <Tag
        :severity="loadingStatusSeverity(loading.status)"
        :value="t(`canvassLoadings.status.${loading.status}`)"
      />
      <Tag
        severity="secondary"
        :value="t('canvassLoadings.labels.revision', { n: loading.revision })"
      />
    </div>

    <!-- What the salesman reported on the last rejection -->
    <Message v-if="isRevising" severity="warn" class="mb-4" data-testid="rejected-banner">
      {{ t('canvassLoadings.messages.revising', { n: loading!.revision + 1 }) }}
    </Message>
    <CanvassRejectionPanel v-if="isRevising && latestRejection" :rejection="latestRejection" />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('canvassLoadings.sections.header') }}
        </h3>

        <!-- Document number -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('canvassLoadings.fields.no') }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('canvassLoadings.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('canvassLoadings.codeMode.manual')"
              :severity="noMode === 'manual' ? 'primary' : 'secondary'"
              size="small"
              @click="noMode = 'manual'"
            />
          </div>
          <div v-if="mode === DialogMode.ADD && noMode === 'auto'" class="flex flex-col gap-1">
            <InputText
              :value="numberSeriesLoading ? '' : previewCode"
              :placeholder="numberSeriesLoading ? t('common.messages.loading') : ''"
              readonly
              class="w-full"
            />
            <small class="text-surface-500">{{
              t('canvassLoadings.codeMode.assignedOnSave')
            }}</small>
          </div>
          <InputText
            v-else
            v-model="no"
            autocomplete="off"
            :disabled="mode !== DialogMode.ADD"
            class="w-full"
            data-testid="no"
          />
        </div>

        <!-- Salesman -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('canvass.fields.salesman') }}</label>
          <InfiniteSelect
            v-if="canvassReady"
            v-model="salesmanId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q: string) => EmployeesService.listForSelect(q)"
            :custom-filters="canvassFilters"
            :initial-option="initialSalesman"
            :disabled="headerLocked"
            :placeholder="t('canvassLoadings.placeholders.salesman')"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            data-testid="salesman"
            @update:model-value="onSalesmanChange"
          />
          <InputText v-else disabled class="w-full" />
        </div>

        <!-- Van warehouse (derived from the salesman) -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('canvass.fields.vanWarehouse') }}</label>
          <InputText
            :value="van ? `${van.code} - ${van.name}` : ''"
            readonly
            disabled
            class="w-full"
            data-testid="van"
          />
          <Message
            v-if="salesmanId && !vanLoading && !van"
            severity="warn"
            size="small"
            variant="simple"
            data-testid="van-missing"
          >
            {{ t('canvassLoadings.messages.vanMissing') }}
            <router-link to="/warehouses" class="underline">{{
              t('canvassLoadings.messages.setUpVan')
            }}</router-link>
          </Message>
        </div>

        <!-- Source warehouse -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{
            t('canvassLoadings.fields.sourceWarehouse')
          }}</label>
          <InfiniteSelect
            :key="`source-${van?.branchId ?? 'none'}`"
            v-model="sourceWarehouseId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q: string) => WarehousesService.list(q)"
            :custom-filters="sourceFilters"
            :initial-option="initialSource"
            :disabled="headerLocked || !van"
            :placeholder="t('canvassLoadings.placeholders.sourceWarehouse')"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            data-testid="source"
          />
        </div>

        <!-- Date -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('canvassLoadings.fields.loadingDate') }}</label>
          <DatePicker
            v-model="loadingDate"
            show-icon
            date-format="yy-mm-dd"
            :disabled="headerLocked"
            class="w-full"
            data-testid="loading-date"
          />
        </div>

        <!-- Notes -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('canvass.fields.notes') }}</label>
          <Textarea v-model="notes" rows="3" class="w-full" />
        </div>
      </div>

      <div v-if="mode === DialogMode.EDIT && loading?.revisions?.length" class="space-y-2">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('canvassLoadings.sections.history') }}
        </h3>
        <CanvassRevisionHistory :loading="loading" />
      </div>
    </div>

    <Divider />

    <CanvassLoadingLinesTable v-model="rows" :show-available="true" :show-change="isRevising" />

    <div class="mt-6 flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isSaving"
        @click="emit('cancel')"
      />
      <Button
        v-if="canCancelLoading"
        type="button"
        :label="t('canvassLoadings.actions.cancelLoading')"
        severity="danger"
        outlined
        :disabled="isSaving"
        data-testid="cancel-loading"
        @click="onCancelLoading"
      />
      <Button
        type="button"
        :label="t('common.actions.save')"
        severity="secondary"
        :disabled="isSaving"
        data-testid="save"
        @click="onSave(false)"
      />
      <Button
        type="button"
        :label="
          isRevising
            ? t('canvassLoadings.actions.reviseResend')
            : t('canvassLoadings.actions.saveSend')
        "
        :disabled="isSaving"
        data-testid="save-send"
        @click="onSave(true)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import CanvassRejectionPanel from '@/components/canvass/CanvassRejectionPanel.vue'
import CanvassRevisionHistory from '@/components/canvass/CanvassRevisionHistory.vue'
import CanvassLoadingLinesTable, { type LoadingRow } from './CanvassLoadingLinesTable.vue'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import { CanvassLoadingsService, EmployeesService, WarehousesService } from '@/services'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import { commonSuccessToast, commonWarnToast } from '@/services/toast'
import { useNumberSeries } from '@/composables'
import { useCanvassEmployeeFilter } from '@/composables/useCanvassEmployeeFilter'
import type { Employee, Warehouse } from '@/types'
import type { CanvassLoading } from '@/types/canvassLoading.type'
import { loadingStatusSeverity, qtyToString, toQty } from '@/utils/canvassHelpers'
import { canvassErrorToast } from '@/utils/canvassErrors'

interface Props {
  mode: DialogMode.ADD | DialogMode.EDIT
  loadingId?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  cancel: []
  submitted: [loading: CanvassLoading]
}>()

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const toastGroup = 'canvassLoadingForm'

const {
  codeMode: noMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('canvass_loadings')
const { filters: canvassFilters, ready: canvassReady } = useCanvassEmployeeFilter()

const isLoading = ref(false)
const isSaving = ref(false)
const loading = ref<CanvassLoading | undefined>()

const no = ref('')
const salesmanId = ref<number | undefined>()
const initialSalesman = ref<Employee | undefined>()
const sourceWarehouseId = ref<number | undefined>()
const initialSource = ref<Warehouse | undefined>()
const loadingDate = ref<Date>(new Date())
const notes = ref('')
const rows = ref<LoadingRow[]>([])

const van = ref<Warehouse | undefined>()
const vanLoading = ref(false)

const isRevising = computed(() => loading.value?.status === 'rejected')
// After a rejection the source, salesman and date are locked; the lines are what changes.
const headerLocked = computed(() => isRevising.value)
const latestRejection = computed(() => loading.value?.rejections.at(-1))
const canCancelLoading = computed(
  () => props.mode === DialogMode.EDIT && !!loading.value && loading.value.status !== 'cancelled',
)

const sourceFilters = computed(() => [
  { filterBy: 'kind', filterOperator: FilterOperator.EQUAL, filterValue: 'regular' },
  ...(van.value
    ? [
        {
          filterBy: 'branchId',
          filterOperator: FilterOperator.EQUAL,
          filterValue: String(van.value.branchId),
        },
      ]
    : []),
])

async function resolveVan(id: number | undefined) {
  van.value = undefined
  if (!id) return
  vanLoading.value = true
  try {
    const query = new GenericQueryBuilder()
      .withFilter('kind', FilterOperator.EQUAL, 'canvass')
      .withFilter('salesmanEmployeeId', FilterOperator.EQUAL, id)
      .build()
    van.value = (await WarehousesService.list(query)).data[0]
  } catch (e) {
    toast.add(canvassErrorToast(e, t, toastGroup))
  } finally {
    vanLoading.value = false
  }
}

function onSalesmanChange(id: unknown) {
  sourceWarehouseId.value = undefined
  initialSource.value = undefined
  void resolveVan(id as number | undefined)
}

// Available stock at the source, for the "Available" column and the over-send warning.
async function refreshAvailable() {
  const ids = rows.value.map((r) => r.productId).filter((id): id is number => id !== undefined)
  if (!sourceWarehouseId.value || ids.length === 0) return
  try {
    const stock = await CanvassLoadingsService.availableStock(sourceWarehouseId.value, ids)
    const byProduct = new Map(stock.map((s) => [s.productId, s.available]))
    rows.value.forEach((r) => {
      if (r.productId !== undefined) r.available = byProduct.get(r.productId) ?? '0'
    })
  } catch {
    // The column is advisory; the server re-checks on send.
  }
}

watch(
  () => [sourceWarehouseId.value, rows.value.map((r) => r.productId).join(',')],
  () => void refreshAvailable(),
)

function toRows(source: CanvassLoading): LoadingRow[] {
  return source.lines.map((l) => ({
    _key: crypto.randomUUID(),
    productId: l.productId,
    productCode: l.productCode,
    productName: l.productName,
    pinnedUom: l.pinnedUom,
    quantity: toQty(l.quantity),
    changed: l.changed,
    previousQuantity: l.previousQuantity,
  }))
}

async function load() {
  if (!props.loadingId) return
  isLoading.value = true
  try {
    const l = await CanvassLoadingsService.get(props.loadingId)
    loading.value = l
    no.value = l.no
    salesmanId.value = l.salesman.id
    initialSalesman.value = { id: l.salesman.id, name: l.salesman.name } as Employee
    sourceWarehouseId.value = l.sourceWarehouse.id
    initialSource.value = {
      id: l.sourceWarehouse.id,
      code: l.sourceWarehouse.code,
      name: l.sourceWarehouse.name,
    } as Warehouse
    loadingDate.value = dayjs(l.loadingDate.slice(0, 10)).toDate()
    notes.value = l.notes ?? ''
    rows.value = toRows(l)
    await resolveVan(l.salesman.id)
  } catch (e) {
    toast.add(canvassErrorToast(e, t, toastGroup))
  } finally {
    isLoading.value = false
  }
}

onBeforeMount(load)

function validate(): string | null {
  if (!salesmanId.value) return t('canvassLoadings.validation.salesmanRequired')
  if (!van.value) return t('canvassLoadings.messages.vanMissing')
  if (!sourceWarehouseId.value) return t('canvassLoadings.validation.sourceRequired')
  if (!loadingDate.value) return t('canvassLoadings.validation.dateRequired')
  if (rows.value.length === 0) return t('canvassLoadings.validation.noLines')
  if (rows.value.some((r) => !r.productId)) return t('canvassLoadings.validation.productRequired')
  if (rows.value.some((r) => !(r.quantity > 0))) return t('canvassLoadings.validation.qtyRequired')
  if (props.mode === DialogMode.ADD && noMode.value === 'manual' && !no.value.trim()) {
    return t('canvassLoadings.validation.noRequired')
  }
  return null
}

function buildRequest() {
  return {
    // Auto mode omits the number: the server draws it from the series on save.
    no: props.mode === DialogMode.ADD && noMode.value === 'manual' ? no.value.trim() : undefined,
    sourceWarehouseId: sourceWarehouseId.value!,
    salesmanId: salesmanId.value!,
    // dayjs, never toISOString(): that converts to UTC and lands a day early at UTC+7.
    loadingDate: dayjs(loadingDate.value).format('YYYY-MM-DD'),
    notes: notes.value.trim() || undefined,
    lines: rows.value.map((r) => ({ productId: r.productId!, quantity: qtyToString(r.quantity) })),
  }
}

async function onSave(send: boolean) {
  const problem = validate()
  if (problem) {
    toast.add(commonWarnToast(problem, toastGroup))
    return
  }
  if (!send) return doSave(false)

  confirm.require({
    group: 'canvassLoadingConfirm',
    header: t('canvassLoadings.confirm.sendHeader'),
    message: isRevising.value
      ? t('canvassLoadings.confirm.resendMessage')
      : t('canvassLoadings.confirm.sendMessage'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('canvassLoadings.actions.send') },
    accept: () => void doSave(true),
  })
}

async function doSave(send: boolean) {
  isSaving.value = true
  let saved: CanvassLoading
  try {
    saved =
      props.mode === DialogMode.EDIT
        ? await CanvassLoadingsService.update(props.loadingId!, buildRequest())
        : await CanvassLoadingsService.create(buildRequest())
  } catch (e) {
    toast.add(canvassErrorToast(e, t, toastGroup))
    isSaving.value = false
    return
  }

  try {
    if (send) saved = await CanvassLoadingsService.send(saved.id)
    toast.add(
      commonSuccessToast(
        send ? t('canvassLoadings.messages.sent') : t('canvassLoadings.messages.saved'),
        toastGroup,
      ),
    )
  } catch (e) {
    // Saved but not sent (e.g. insufficient stock): keep the document and say why.
    toast.add(canvassErrorToast(e, t, toastGroup))
  }

  try {
    // A draft or rejected save keeps the user on the edit page: refresh server-computed state.
    if (
      props.mode === DialogMode.EDIT &&
      (saved.status === 'draft' || saved.status === 'rejected')
    ) {
      await load()
    }
  } finally {
    isSaving.value = false
  }
  emit('submitted', saved)
}

function onCancelLoading() {
  confirm.require({
    group: 'canvassLoadingConfirm',
    header: t('canvassLoadings.confirm.cancelHeader'),
    message: t('canvassLoadings.confirm.cancelMessage'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('canvassLoadings.actions.cancelLoading'), severity: 'danger' },
    accept: async () => {
      isSaving.value = true
      try {
        const cancelled = await CanvassLoadingsService.cancel(props.loadingId!)
        toast.add(commonSuccessToast(t('canvassLoadings.messages.cancelled'), toastGroup))
        emit('submitted', cancelled)
      } catch (e) {
        toast.add(canvassErrorToast(e, t, toastGroup))
      } finally {
        isSaving.value = false
      }
    },
  })
}
</script>
