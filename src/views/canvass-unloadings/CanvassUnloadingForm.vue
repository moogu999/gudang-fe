<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="canvassUnloadingConfirm" />

  <div v-if="isLoading" class="flex items-center justify-center py-8">
    <ProgressSpinner />
  </div>

  <div v-else>
    <div v-if="unloading" class="mb-4 flex flex-wrap items-center gap-2">
      <Tag
        :severity="unloadingStatusSeverity(unloading.status)"
        :value="t(`canvassUnloadings.status.${unloading.status}`)"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('canvassUnloadings.sections.header') }}
        </h3>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('canvassUnloadings.fields.no') }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('canvassUnloadings.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('canvassUnloadings.codeMode.manual')"
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
              t('canvassUnloadings.codeMode.assignedOnSave')
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

        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('canvass.fields.vanWarehouse') }}</label>
          <InfiniteSelect
            v-model="vanWarehouseId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q: string) => WarehousesService.list(q)"
            :custom-filters="vanFilters"
            :initial-option="initialVan"
            :disabled="mode !== DialogMode.ADD"
            :placeholder="t('canvassUnloadings.placeholders.van')"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            data-testid="van"
            @select-option="(opt: object) => onVanSelect(opt as Warehouse)"
          >
            <template #option="{ option }">
              {{ option.name }}<span v-if="option.salesmanName"> — {{ option.salesmanName }}</span>
            </template>
          </InfiniteSelect>
          <small v-if="salesmanName" class="text-surface-500">{{ salesmanName }}</small>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{
            t('canvassUnloadings.fields.destination')
          }}</label>
          <InfiniteSelect
            :key="`dest-${vanBranchId ?? 'none'}`"
            v-model="destinationWarehouseId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q: string) => WarehousesService.list(q)"
            :custom-filters="destinationFilters"
            :initial-option="initialDestination"
            :disabled="readonly || !vanBranchId"
            :placeholder="t('canvassUnloadings.placeholders.destination')"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            data-testid="destination"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{
            t('canvassUnloadings.fields.unloadDate')
          }}</label>
          <DatePicker
            v-model="unloadDate"
            show-icon
            date-format="yy-mm-dd"
            :disabled="readonly"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold">{{ t('canvass.fields.notes') }}</label>
          <Textarea v-model="notes" rows="3" :disabled="readonly" class="w-full" />
        </div>
      </div>
    </div>

    <Divider />

    <h4 class="mb-3 text-sm font-semibold sm:text-base">
      {{ t('canvassUnloadings.sections.lines') }}
    </h4>
    <Message v-if="linesLoading" severity="info" class="mb-3" size="small" variant="simple">
      {{ t('common.messages.loading') }}
    </Message>
    <DataTable :value="rows" data-key="_key" striped-rows class="text-sm">
      <Column field="productCode" :header="t('canvass.fields.productCode')" />
      <Column field="productName" :header="t('canvass.fields.product')" />
      <Column :header="t('canvassUnloadings.fields.stockType')">
        <template #body="{ data }">
          <Tag
            :severity="data.stockType === 'bad' ? 'danger' : 'success'"
            :value="t(`canvassUnloadings.stockTypes.${data.stockType}`)"
          />
        </template>
      </Column>
      <Column :header="t('canvassUnloadings.fields.expected')">
        <template #body="{ data }">
          <div class="flex flex-col">
            <span data-testid="expected">{{ formatBaseQty(data.expected, data.pinnedUom) }}</span>
            <span class="text-xs text-stone-400">{{ uomLabel(data.pinnedUom) }}</span>
          </div>
        </template>
      </Column>
      <Column :header="t('canvassUnloadings.fields.returned')" style="min-width: 12rem">
        <template #body="{ data }">
          <div class="flex flex-col gap-0.5">
            <span v-if="readonly">{{ formatBaseQty(data.returned, data.pinnedUom) }}</span>
            <CanvassQuantityInput
              v-else
              v-model="data.returned"
              :levels="pinnedToLevels(data.pinnedUom)"
            />
            <span class="text-xs text-stone-400">{{ uomLabel(data.pinnedUom) }}</span>
          </div>
        </template>
      </Column>
      <Column :header="t('canvassUnloadings.fields.shortage')">
        <template #body="{ data }">
          <div class="flex flex-col">
            <span
              :class="
                unloadingShortage(data.expected, data.returned) > 0
                  ? 'font-semibold text-amber-600'
                  : 'text-green-700'
              "
              data-testid="shortage"
              >{{
                formatBaseQty(unloadingShortage(data.expected, data.returned), data.pinnedUom)
              }}</span
            >
            <span class="text-xs text-stone-400">{{ uomLabel(data.pinnedUom) }}</span>
          </div>
        </template>
      </Column>
      <template #empty>{{ t('canvassUnloadings.messages.noLines') }}</template>
    </DataTable>

    <Message v-if="totalShortageLines > 0" severity="warn" class="mt-3" data-testid="shortage-note">
      {{ t('canvassUnloadings.messages.shortageNote', { n: totalShortageLines }) }}
    </Message>

    <div v-if="!readonly" class="mt-6 flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isSaving"
        @click="emit('cancel')"
      />
      <Button
        v-if="mode === DialogMode.EDIT"
        type="button"
        :label="t('canvassUnloadings.actions.cancelUnloading')"
        severity="danger"
        outlined
        :disabled="isSaving"
        data-testid="cancel-unloading"
        @click="onCancelUnloading"
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
        :label="t('canvassUnloadings.actions.saveAndPost')"
        :disabled="isSaving"
        data-testid="save-post"
        @click="onSave(true)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue'
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
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import CanvassQuantityInput from '@/components/canvass/CanvassQuantityInput.vue'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import { CanvassUnloadingsService, WarehousesService } from '@/services'
import { commonSuccessToast, commonWarnToast } from '@/services/toast'
import { useNumberSeries } from '@/composables'
import type { PinnedUom, Warehouse } from '@/types'
import type {
  CanvassStockType,
  CanvassUnloading,
  CanvassUnloadingLine,
  CanvassVanStock,
} from '@/types/canvassUnloading.type'
import { pinnedToLevels } from '@/utils/uomHelper'
import {
  formatBaseQty,
  qtyToString,
  toQty,
  uomLabel,
  unloadingShortage,
  unloadingStatusSeverity,
} from '@/utils/canvassHelpers'
import { canvassErrorToast } from '@/utils/canvassErrors'

interface UnloadingRow {
  _key: string
  productId: number
  productCode: string
  productName: string
  stockType: CanvassStockType
  pinnedUom?: PinnedUom
  /** What the van holds (or held when posted), in base UOM. */
  expected: number
  returned: number
}

interface Props {
  mode: DialogMode.ADD | DialogMode.EDIT | DialogMode.VIEW
  unloadingId?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  cancel: []
  submitted: [unloading: CanvassUnloading]
}>()

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const toastGroup = 'canvassUnloadingForm'

const {
  codeMode: noMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('canvass_unloadings')

const isLoading = ref(false)
const isSaving = ref(false)
const linesLoading = ref(false)
const unloading = ref<CanvassUnloading | undefined>()

const no = ref('')
const vanWarehouseId = ref<number | undefined>()
const initialVan = ref<Warehouse | undefined>()
const vanBranchId = ref<number | undefined>()
const salesmanName = ref('')
const destinationWarehouseId = ref<number | undefined>()
const initialDestination = ref<Warehouse | undefined>()
const unloadDate = ref<Date>(new Date())
const notes = ref('')
const rows = ref<UnloadingRow[]>([])

// A posted or cancelled unloading no longer edits.
const readonly = computed(
  () => props.mode === DialogMode.VIEW || (!!unloading.value && unloading.value.status !== 'draft'),
)

const vanFilters = [
  { filterBy: 'kind', filterOperator: FilterOperator.EQUAL, filterValue: 'canvass' },
]
const destinationFilters = computed(() => [
  { filterBy: 'kind', filterOperator: FilterOperator.EQUAL, filterValue: 'regular' },
  ...(vanBranchId.value
    ? [
        {
          filterBy: 'branchId',
          filterOperator: FilterOperator.EQUAL,
          filterValue: String(vanBranchId.value),
        },
      ]
    : []),
])

const totalShortageLines = computed(
  () => rows.value.filter((r) => unloadingShortage(r.expected, r.returned) > 0).length,
)

function fromVanStock(s: CanvassVanStock): UnloadingRow {
  const onHand = toQty(s.onHand)
  return {
    _key: `${s.productId}-${s.stockType}`,
    productId: s.productId,
    productCode: s.productCode,
    productName: s.productName,
    stockType: s.stockType,
    pinnedUom: s.pinnedUom,
    expected: onHand,
    // Everything the van holds is returned unless the warehouse counts less.
    returned: onHand,
  }
}

function fromLine(l: CanvassUnloadingLine): UnloadingRow {
  return {
    _key: `${l.productId}-${l.stockType}`,
    productId: l.productId,
    productCode: l.productCode,
    productName: l.productName,
    stockType: l.stockType,
    pinnedUom: l.pinnedUom,
    expected: toQty(l.expectedQty ?? l.vanBalance),
    returned: toQty(l.returnedQty),
  }
}

async function onVanSelect(van: Warehouse) {
  vanBranchId.value = van.branchId
  salesmanName.value = van.salesmanName ?? ''
  destinationWarehouseId.value = undefined
  initialDestination.value = undefined
  linesLoading.value = true
  try {
    rows.value = (await CanvassUnloadingsService.vanStock(van.id)).map(fromVanStock)
  } catch (e) {
    toast.add(canvassErrorToast(e, t, toastGroup))
    rows.value = []
  } finally {
    linesLoading.value = false
  }
}

async function load() {
  if (!props.unloadingId) return
  isLoading.value = true
  try {
    const u = await CanvassUnloadingsService.get(props.unloadingId)
    unloading.value = u
    no.value = u.no
    vanWarehouseId.value = u.vanWarehouse.id
    initialVan.value = {
      id: u.vanWarehouse.id,
      code: u.vanWarehouse.code,
      name: u.vanWarehouse.name,
    } as Warehouse
    salesmanName.value = u.salesman.name
    destinationWarehouseId.value = u.destinationWarehouse.id
    initialDestination.value = {
      id: u.destinationWarehouse.id,
      code: u.destinationWarehouse.code,
      name: u.destinationWarehouse.name,
    } as Warehouse
    unloadDate.value = dayjs(u.unloadDate.slice(0, 10)).toDate()
    notes.value = u.notes ?? ''
    rows.value = u.lines.map(fromLine)
    // The destination picker narrows to the van's branch, which equals the document's.
    vanBranchId.value = u.branch.id
  } catch (e) {
    toast.add(canvassErrorToast(e, t, toastGroup))
  } finally {
    isLoading.value = false
  }
}

onBeforeMount(load)

function validate(): string | null {
  if (!vanWarehouseId.value) return t('canvassUnloadings.validation.vanRequired')
  if (!destinationWarehouseId.value) return t('canvassUnloadings.validation.destinationRequired')
  if (!unloadDate.value) return t('canvassUnloadings.validation.dateRequired')
  if (rows.value.length === 0) return t('canvassUnloadings.messages.noLines')
  if (rows.value.some((r) => r.returned < 0 || r.returned > r.expected)) {
    return t('canvassUnloadings.validation.returnedExceeds')
  }
  if (props.mode === DialogMode.ADD && noMode.value === 'manual' && !no.value.trim()) {
    return t('canvassUnloadings.validation.noRequired')
  }
  return null
}

function buildRequest() {
  return {
    no: props.mode === DialogMode.ADD && noMode.value === 'manual' ? no.value.trim() : undefined,
    vanWarehouseId: vanWarehouseId.value!,
    destinationWarehouseId: destinationWarehouseId.value!,
    unloadDate: dayjs(unloadDate.value).format('YYYY-MM-DD'),
    notes: notes.value.trim() || undefined,
    lines: rows.value.map((r) => ({
      productId: r.productId,
      stockType: r.stockType,
      returnedQty: qtyToString(r.returned),
    })),
  }
}

async function onSave(post: boolean) {
  const problem = validate()
  if (problem) {
    toast.add(commonWarnToast(problem, toastGroup))
    return
  }
  if (!post) return doSave(false)

  confirm.require({
    group: 'canvassUnloadingConfirm',
    header: t('canvassUnloadings.confirm.postHeader'),
    message:
      totalShortageLines.value > 0
        ? t('canvassUnloadings.confirm.postWithShortage', { n: totalShortageLines.value })
        : t('canvassUnloadings.confirm.postMessage'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('canvassUnloadings.actions.post') },
    accept: () => void doSave(true),
  })
}

async function doSave(post: boolean) {
  isSaving.value = true
  let saved: CanvassUnloading
  try {
    saved =
      props.mode === DialogMode.EDIT
        ? await CanvassUnloadingsService.update(props.unloadingId!, buildRequest())
        : await CanvassUnloadingsService.create(buildRequest())
  } catch (e) {
    toast.add(canvassErrorToast(e, t, toastGroup))
    isSaving.value = false
    return
  }

  try {
    if (post) saved = await CanvassUnloadingsService.post(saved.id)
    toast.add(
      commonSuccessToast(
        post ? t('canvassUnloadings.messages.posted') : t('canvassUnloadings.messages.saved'),
        toastGroup,
      ),
    )
  } catch (e) {
    // Saved as a draft but not posted (e.g. the van holds less now): keep the draft.
    toast.add(canvassErrorToast(e, t, toastGroup))
  }

  try {
    if (props.mode === DialogMode.EDIT && saved.status === 'draft') await load()
  } finally {
    isSaving.value = false
  }
  emit('submitted', saved)
}

function onCancelUnloading() {
  confirm.require({
    group: 'canvassUnloadingConfirm',
    header: t('canvassUnloadings.confirm.cancelHeader'),
    message: t('canvassUnloadings.confirm.cancelMessage'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('canvassUnloadings.actions.cancelUnloading'), severity: 'danger' },
    accept: async () => {
      isSaving.value = true
      try {
        const cancelled = await CanvassUnloadingsService.cancel(props.unloadingId!)
        toast.add(commonSuccessToast(t('canvassUnloadings.messages.cancelled'), toastGroup))
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
