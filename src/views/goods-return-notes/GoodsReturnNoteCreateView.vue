<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmationDialog :group="toastGroup" :accept-handler="submitAcceptHandler" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('goodsReturnNotes.createTitle') }}
      </h1>
    </div>

    <!-- Header card -->
    <ResponsiveCard class="mb-4">
      <template #content>
        <div class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <!-- Driver picker -->
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-semibold">
              {{ t('goodsReturnNotes.picker.title') }}
              <span class="ml-1 text-red-500">*</span>
            </label>
            <Select
              v-model="selectedDriverId"
              :options="availableDrivers"
              option-label="driverName"
              option-value="driverEmployeeId"
              filter
              :loading="driversLoading"
              :placeholder="t('goodsReturnNotes.picker.placeholder')"
              class="w-full sm:w-96"
            >
              <template #option="{ option }">
                <div class="flex flex-col">
                  <span class="font-medium">{{ option.driverName }}</span>
                  <span class="text-xs text-stone-500">
                    {{ option.vehiclePlate ?? '-' }} ·
                    {{ t('goodsReturnNotes.picker.openItems', { count: option.openItemCount }) }}
                  </span>
                </div>
              </template>
            </Select>
          </div>

          <!-- Driver info card -->
          <div
            v-if="selectedDriver"
            class="flex flex-col gap-1 rounded-md bg-stone-50 p-3 sm:col-span-2"
          >
            <span class="text-sm font-medium">{{ selectedDriver.driverName }}</span>
            <span class="text-xs text-stone-500">
              {{ t('goodsReturnNotes.picker.vehicle') }}: {{ selectedDriver.vehiclePlate ?? '-' }} ·
              {{ t('goodsReturnNotes.picker.openItems', { count: selectedDriver.openItemCount }) }}
            </span>
          </div>

          <!-- BTB Number mode -->
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-semibold">{{
              t('goodsReturnNotes.numberMode.label')
            }}</label>
            <div class="flex gap-2">
              <Button
                type="button"
                :label="t('goodsReturnNotes.numberMode.auto')"
                :severity="numberMode === 'auto' ? 'primary' : 'secondary'"
                size="small"
                @click="numberMode = 'auto'"
              />
              <Button
                type="button"
                :label="t('goodsReturnNotes.numberMode.manual')"
                :severity="numberMode === 'manual' ? 'primary' : 'secondary'"
                size="small"
                @click="numberMode = 'manual'"
              />
            </div>
            <div v-if="numberMode === 'auto'" class="mt-1 flex flex-col gap-1">
              <InputText
                :value="previewLoading ? '' : previewNo"
                :placeholder="previewLoading ? t('common.messages.loading') : ''"
                readonly
                class="w-full sm:w-80"
              />
              <small class="text-surface-500">{{
                t('goodsReturnNotes.numberMode.assignedOnSave')
              }}</small>
            </div>
            <InputText
              v-else
              v-model="manualNo"
              class="mt-1 w-full sm:w-80"
              :placeholder="t('goodsReturnNotes.numberMode.manualPlaceholder')"
            />
          </div>

          <!-- Return Date -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold" for="returnDate">
              {{ t('goodsReturnNotes.fields.returnDate') }}
            </label>
            <DatePicker
              id="returnDate"
              v-model="returnDate"
              date-format="dd/mm/yy"
              class="w-full"
              show-icon
            />
          </div>

          <!-- Notes -->
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-semibold" for="btbNotes">
              {{ t('goodsReturnNotes.fields.notes') }}
            </label>
            <Textarea id="btbNotes" v-model="notes" rows="2" class="w-full" auto-resize />
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <!-- Driver stock pool -->
    <template v-if="selectedDriverId !== null">
      <div v-if="poolLoading" class="mb-4 flex justify-center py-8">
        <i class="pi pi-spin pi-spinner text-primary text-3xl" />
      </div>

      <div v-else-if="groupedPool.length" class="space-y-4">
        <ResponsiveCard v-for="group in groupedPool" :key="group.deliveryOrderId">
          <template #content>
            <div class="mb-3 flex items-center gap-2">
              <p class="text-sm font-semibold text-stone-700">
                {{ t('goodsReturnNotes.detail.fromDo', { no: group.deliveryOrderNo }) }}
              </p>
              <Tag
                :severity="sourceTypeSeverity(group.sourceType)"
                :value="t(`goodsReturnNotes.sourceType.${group.sourceType}`)"
              />
            </div>
            <DataTable :value="group.items" class="text-sm" size="small">
              <Column style="width: 3rem">
                <template #body="{ data }">
                  <Checkbox v-model="selection[data.driverStockItemId].checked" :binary="true" />
                </template>
              </Column>
              <Column :header="t('goodsReturnNotes.detail.product')">
                <template #body="{ data }">
                  <span class="font-medium">{{ data.productName }}</span>
                </template>
              </Column>
              <Column :header="t('goodsReturnNotes.detail.qtyAtDriver')">
                <template #body="{ data }">
                  <div class="flex flex-col gap-0.5">
                    <span>{{ formatQty(data.outstandingQty) }}</span>
                    <span v-if="uomLabel(data)" class="text-xs text-stone-400">
                      {{ uomLabel(data) }}
                    </span>
                  </div>
                </template>
              </Column>
              <Column :header="t('goodsReturnNotes.detail.qtyReceived')">
                <template #body="{ data }">
                  <InputNumber
                    v-model="selection[data.driverStockItemId].receivedQty"
                    :min="0"
                    :max="parseFloat(data.outstandingQty)"
                    :min-fraction-digits="0"
                    :max-fraction-digits="2"
                    :disabled="!selection[data.driverStockItemId].checked"
                    size="small"
                    class="w-32"
                  />
                </template>
              </Column>
              <template #empty>
                <div class="py-4 text-center text-stone-500">{{ t('table.noResults') }}</div>
              </template>
            </DataTable>
          </template>
        </ResponsiveCard>
      </div>

      <ResponsiveCard v-else>
        <template #content>
          <div class="py-6 text-center text-stone-500">
            {{ t('goodsReturnNotes.messages.noPoolItems') }}
          </div>
        </template>
      </ResponsiveCard>

      <!-- Summary -->
      <ResponsiveCard v-if="selectedLines.length" class="mt-4">
        <template #content>
          <p class="mb-3 text-sm font-semibold text-stone-700">
            {{ t('goodsReturnNotes.summary.title') }}
          </p>
          <DataTable :value="selectedLines" class="text-sm" size="small">
            <Column :header="t('goodsReturnNotes.detail.product')">
              <template #body="{ data }">{{ data.item.productName }}</template>
            </Column>
            <Column :header="t('goodsReturnNotes.detail.fromDoShort')">
              <template #body="{ data }">{{ data.item.deliveryOrderNo }}</template>
            </Column>
            <Column :header="t('goodsReturnNotes.detail.qtyReceived')">
              <template #body="{ data }">{{ data.state.receivedQty }}</template>
            </Column>
          </DataTable>
        </template>
      </ResponsiveCard>
    </template>

    <!-- Actions -->
    <div class="mt-4 flex justify-end gap-3">
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        outlined
        @click="router.back()"
      />
      <Button
        :label="t('goodsReturnNotes.actions.submit')"
        icon="pi pi-check"
        :loading="submitting"
        @click="onSubmitClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import ConfirmationDialog from '@/components/dialog/ConfirmationDialog.vue'
import {
  GoodsReturnNotesService,
  NumberSeriesService,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type {
  AvailableDriver,
  DriverStockItem,
  DriverStockGroup,
  DriverStockSourceType,
} from '@/types'
import { pinnedToLevels } from '@/utils/uomHelper'
import dayjs from 'dayjs'

const { t } = useI18n()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

const toastGroup = 'goodsReturnNoteCreate'

const returnDate = ref<Date>(new Date())
const notes = ref('')
const numberMode = ref<'auto' | 'manual'>('auto')
const manualNo = ref('')
const previewNo = ref('')
const previewLoading = ref(false)

const availableDrivers = ref<AvailableDriver[]>([])
const driversLoading = ref(false)
const selectedDriverId = ref<number | null>(null)

const driverStock = ref<DriverStockItem[]>([])
const poolLoading = ref(false)
const submitting = ref(false)
const submitAcceptHandler = ref(async () => {})

interface LineState {
  checked: boolean
  receivedQty: number
}

const selection = reactive<Record<number, LineState>>({})

const selectedDriver = computed(() =>
  availableDrivers.value.find((d) => d.driverEmployeeId === selectedDriverId.value),
)

const groupedPool = computed<DriverStockGroup[]>(() => {
  const groups = new Map<number, DriverStockGroup>()
  for (const item of driverStock.value) {
    if (!groups.has(item.deliveryOrderId)) {
      groups.set(item.deliveryOrderId, {
        deliveryOrderId: item.deliveryOrderId,
        deliveryOrderNo: item.deliveryOrderNo,
        sourceType: item.sourceType,
        items: [],
      })
    }
    groups.get(item.deliveryOrderId)!.items.push(item)
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.deliveryOrderNo.localeCompare(b.deliveryOrderNo),
  )
})

const selectedLines = computed(() =>
  driverStock.value
    .filter((item) => selection[item.driverStockItemId]?.checked)
    .map((item) => ({ item, state: selection[item.driverStockItemId] }))
    .filter(({ state }) => state.receivedQty > 0),
)

function sourceTypeSeverity(sourceType: DriverStockSourceType): 'danger' | 'warn' | 'info' {
  if (sourceType === 'failed_delivery') return 'danger'
  if (sourceType === 'sales_return') return 'info'
  return 'warn'
}

function formatQty(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return decStr
  return num % 1 === 0 ? num.toFixed(0) : num.toString()
}

function uomLabel(item: DriverStockItem): string | undefined {
  const levels = pinnedToLevels(item.pinnedUom)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

async function loadPreview() {
  previewLoading.value = true
  try {
    const res = await NumberSeriesService.preview('goods_return_notes')
    previewNo.value = res.code
  } catch {
    previewNo.value = ''
  } finally {
    previewLoading.value = false
  }
}

async function loadAvailableDrivers() {
  driversLoading.value = true
  try {
    availableDrivers.value = await GoodsReturnNotesService.listAvailableDrivers()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    driversLoading.value = false
  }
}

onMounted(() => {
  loadPreview()
  loadAvailableDrivers()
})

async function fetchDriverStock(driverEmployeeId: number) {
  poolLoading.value = true
  driverStock.value = []
  try {
    const items = await GoodsReturnNotesService.listDriverStock(driverEmployeeId)
    driverStock.value = items
    for (const item of items) {
      selection[item.driverStockItemId] = {
        checked: false,
        receivedQty: parseFloat(item.outstandingQty),
      }
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    poolLoading.value = false
  }
}

watch(selectedDriverId, (id) => {
  if (id !== null) {
    fetchDriverStock(id)
  } else {
    driverStock.value = []
  }
})

function onSubmitClick() {
  if (selectedDriverId.value === null) {
    toast.add({
      severity: 'warn',
      summary: t('goodsReturnNotes.messages.noDriverSelected'),
      group: toastGroup,
      life: 3000,
    })
    return
  }

  if (!selectedLines.value.length) {
    toast.add({
      severity: 'warn',
      summary: t('goodsReturnNotes.messages.noItemsSelected'),
      group: toastGroup,
      life: 3000,
    })
    return
  }

  if (numberMode.value === 'manual' && !manualNo.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: t('goodsReturnNotes.messages.noManualNo'),
      group: toastGroup,
      life: 3000,
    })
    return
  }

  submitAcceptHandler.value = async () => {
    if (selectedDriverId.value === null) return
    submitting.value = true
    try {
      const res = await GoodsReturnNotesService.create({
        no: numberMode.value === 'manual' ? manualNo.value.trim() : null,
        driverEmployeeId: selectedDriverId.value,
        returnDate: dayjs(returnDate.value).format('YYYY-MM-DD'),
        notes: notes.value.trim() || null,
        items: selectedLines.value.map(({ item, state }) => ({
          driverStockItemId: item.driverStockItemId,
          receivedQty: state.receivedQty.toString(),
        })),
      })
      toast.add(
        commonSuccessToast(
          t('goodsReturnNotes.messages.submitSuccess', { no: res.no }),
          toastGroup,
        ),
      )
      setTimeout(() => {
        router.push({ name: 'GoodsReturnNoteDetail', params: { id: res.goodsReturnNoteId } })
      }, 1200)
    } catch (e) {
      toast.add(commonErrorToast(e, toastGroup))
    } finally {
      submitting.value = false
    }
  }

  confirm.require({
    group: toastGroup,
    header: t('goodsReturnNotes.actions.submit'),
    message: t('goodsReturnNotes.messages.confirmSubmit'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('goodsReturnNotes.actions.submit'), severity: 'primary' },
  })
}
</script>
