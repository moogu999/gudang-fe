<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ isEditMode ? t('deliveryNotes.editTitle') : t('deliveryNotes.createTitle') }}
      </h1>
    </div>

    <!-- Delivery Info card -->
    <ResponsiveCard class="mb-4">
      <template #content>
        <p class="mb-4 text-xs font-semibold tracking-wide text-stone-500 uppercase">
          {{ t('deliveryNotes.fields.no') }}
        </p>
        <div class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          <!-- Row 1: labels -->
          <div v-if="!isEditMode" class="flex items-center gap-2">
            <label class="text-sm font-semibold">{{ t('deliveryNotes.fields.no') }}</label>
            <Button
              type="button"
              :label="t('deliveryNotes.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('deliveryNotes.codeMode.manual')"
              :severity="noMode === 'manual' ? 'primary' : 'secondary'"
              size="small"
              @click="noMode = 'manual'"
            />
          </div>
          <label
            :class="[
              'text-sm font-semibold',
              isEditMode ? 'flex items-center' : 'hidden sm:flex sm:items-center',
            ]"
            for="deliveryDate"
          >
            {{ t('deliveryNotes.fields.deliveryDate') }}
            <span class="ml-1 text-red-500">*</span>
          </label>

          <!-- Row 2: inputs -->
          <div v-if="!isEditMode" class="flex flex-col gap-1">
            <div v-if="noMode === 'auto'" class="flex flex-col gap-1">
              <InputText
                :value="previewLoading ? '' : previewCode"
                :placeholder="previewLoading ? t('common.messages.loading') : ''"
                readonly
                class="w-full"
              />
              <small class="text-surface-500">{{
                t('deliveryNotes.codeMode.assignedOnSave')
              }}</small>
            </div>
            <InputText v-else v-model="manualNo" autocomplete="off" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold sm:hidden" for="deliveryDate">
              {{ t('deliveryNotes.fields.deliveryDate') }}
              <span class="text-red-500">*</span>
            </label>
            <DatePicker
              id="deliveryDate"
              v-model="deliveryDate"
              date-format="dd/mm/yy"
              class="w-full"
              show-icon
            />
          </div>

          <!-- Driver -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('deliveryNotes.fields.driver') }}</label>
            <InfiniteSelect
              v-model="driverEmployeeId"
              option-label="name"
              option-value="id"
              :fetch-fn="(q) => EmployeesService.list(q)"
              :initial-option="initialDriver"
              sort-by="name"
              sort-operator="asc"
              :placeholder="t('deliveryNotes.fields.driver')"
            />
          </div>

          <!-- Vehicle -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold">{{ t('deliveryNotes.fields.vehicle') }}</label>
            <InfiniteSelect
              v-model="vehicleId"
              option-label="plateNumber"
              option-value="id"
              :fetch-fn="(q) => VehiclesService.list(q)"
              :initial-option="initialVehicle"
              sort-by="plateNumber"
              sort-operator="asc"
              :placeholder="t('deliveryNotes.fields.vehicle')"
            >
              <template #option="{ option }">
                <div class="flex flex-col">
                  <span class="font-medium">{{ option.plateNumber }}</span>
                  <span v-if="option.brandModel" class="text-xs text-stone-500">{{
                    option.brandModel
                  }}</span>
                </div>
              </template>
            </InfiniteSelect>
          </div>

          <!-- Notes -->
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-semibold" for="notes">
              {{ t('deliveryNotes.fields.notes') }}
            </label>
            <Textarea id="notes" v-model="notes" rows="2" class="w-full" auto-resize />
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <!-- DO Picker card -->
    <ResponsiveCard class="mb-4">
      <template #content>
        <p class="mb-4 text-xs font-semibold tracking-wide text-stone-500 uppercase">
          {{ t('deliveryNotes.picker.title') }}
        </p>

        <!-- Filter row -->
        <div class="mb-3 flex flex-col gap-2 sm:flex-row">
          <InputText
            v-model="pickerSearch"
            :placeholder="t('deliveryNotes.picker.searchPlaceholder')"
            class="w-full sm:w-64"
            @keyup.enter="fetchPickerData(0)"
          />
          <InfiniteSelect
            v-model="pickerWarehouseId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => WarehousesService.list(q)"
            sort-by="name"
            sort-operator="asc"
            :placeholder="t('deliveryNotes.picker.filterWarehouse')"
            class="w-full sm:w-56"
          />
          <Button
            icon="pi pi-search"
            :label="t('common.actions.search')"
            @click="fetchPickerData(0)"
          />
          <Button
            icon="pi pi-times"
            severity="secondary"
            outlined
            :label="t('common.actions.clear')"
            @click="clearPickerFilter"
          />
        </div>

        <!-- Bulk action buttons -->
        <div class="mb-3 flex flex-wrap gap-2">
          <Button
            :label="t('deliveryNotes.picker.addSelected')"
            icon="pi pi-plus"
            size="small"
            :disabled="selectedPickerRows.length === 0"
            @click="addSelectedDOs"
          />
          <Button
            :label="t('deliveryNotes.picker.addAll')"
            icon="pi pi-plus-circle"
            size="small"
            severity="secondary"
            :disabled="pickerItems.length === 0"
            @click="addAllVisibleDOs"
          />
        </div>

        <DataTable
          v-model:selection="selectedPickerRows"
          :value="pickerItems"
          data-key="id"
          :lazy="true"
          :paginator="true"
          :rows="pickerPageSize"
          :total-records="pickerTotal"
          :rows-per-page-options="[10, 25, 50]"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          :loading="pickerLoading"
          class="text-sm"
          @page="onPickerPage"
        >
          <Column selection-mode="multiple" header-style="width: 3rem" />
          <Column :header="t('deliveryNotes.doTable.no')">
            <template #body="{ data }">{{ data.no }}</template>
          </Column>
          <Column :header="t('deliveryNotes.doTable.customer')">
            <template #body="{ data }">{{ data.customerName }}</template>
          </Column>
          <Column :header="t('deliveryNotes.doTable.warehouse')">
            <template #body="{ data }">{{ data.warehouseName }}</template>
          </Column>
          <Column :header="t('deliveryNotes.doTable.totalAmount')" class="text-right">
            <template #body="{ data }">{{ formatAmount(data.totalAmount) }}</template>
          </Column>
          <Column :header="t('common.labels.actions')">
            <template #body="{ data }">
              <Button
                icon="pi pi-eye"
                severity="info"
                size="small"
                outlined
                @click="openDODetail(data.id)"
              />
            </template>
          </Column>
          <template #empty>
            <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
          </template>
        </DataTable>
      </template>
    </ResponsiveCard>

    <!-- Added DOs card -->
    <ResponsiveCard class="mb-4">
      <template #content>
        <div class="mb-3 flex items-center justify-between">
          <p class="text-xs font-semibold tracking-wide text-stone-500 uppercase">
            {{ t('deliveryNotes.addedDos.title') }}
          </p>
          <div class="flex flex-wrap items-center gap-3 text-sm text-stone-600">
            <span>{{ t('deliveryNotes.addedDos.summaryDo', { count: addedDOs.length }) }}</span>
            <span>{{ t('deliveryNotes.addedDos.summaryOutlets', { count: uniqueOutlets }) }}</span>
            <span class="font-semibold text-green-700">
              {{
                t('deliveryNotes.addedDos.summaryTotal', {
                  amount: formatAmount(String(addedTotal)),
                })
              }}
            </span>
          </div>
        </div>

        <DataTable :value="addedDOs" data-key="id" class="text-sm" size="small">
          <Column :header="t('deliveryNotes.doTable.no')">
            <template #body="{ data }">{{ data.no }}</template>
          </Column>
          <Column :header="t('deliveryNotes.doTable.customer')">
            <template #body="{ data }">{{ data.customerName }}</template>
          </Column>
          <Column :header="t('deliveryNotes.doTable.warehouse')">
            <template #body="{ data }">{{ data.warehouseName }}</template>
          </Column>
          <Column :header="t('deliveryNotes.doTable.totalAmount')" class="text-right">
            <template #body="{ data }">{{ formatAmount(data.totalAmount) }}</template>
          </Column>
          <Column :header="t('common.labels.actions')">
            <template #body="{ data }">
              <Button
                icon="pi pi-trash"
                severity="danger"
                size="small"
                text
                @click="removeDO(data.id)"
              />
            </template>
          </Column>
          <template #empty>
            <div class="py-4 text-center text-sm text-stone-400">
              {{ t('table.noItems') }}
            </div>
          </template>
        </DataTable>
      </template>
    </ResponsiveCard>

    <!-- DO Detail Dialog -->
    <Dialog
      v-model:visible="doDetailVisible"
      :header="doDetailData ? doDetailData.no : ''"
      modal
      :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
      style="width: 50vw"
    >
      <div v-if="doDetailLoading" class="flex justify-center py-8">
        <i class="pi pi-spin pi-spinner text-primary text-2xl" />
      </div>
      <div v-else-if="doDetailData" class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs font-semibold text-stone-500 uppercase">{{
            t('deliveryOrders.fields.customer')
          }}</span>
          <span>{{ doDetailData.customerName }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs font-semibold text-stone-500 uppercase">{{
            t('deliveryOrders.fields.warehouse')
          }}</span>
          <span>{{ doDetailData.warehouseName }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs font-semibold text-stone-500 uppercase">{{
            t('deliveryOrders.fields.soNo')
          }}</span>
          <span>{{ doDetailData.soNo }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs font-semibold text-stone-500 uppercase">{{
            t('deliveryOrders.fields.deliveryDate')
          }}</span>
          <span>{{
            doDetailData.deliveryDate
              ? dayjs(doDetailData.deliveryDate).format(DateFormat.DATE)
              : '-'
          }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs font-semibold text-stone-500 uppercase">{{
            t('deliveryOrders.fields.total')
          }}</span>
          <span class="font-semibold text-green-700">{{
            formatAmount(doDetailData.totalAmount)
          }}</span>
        </div>
      </div>
    </Dialog>

    <!-- Actions -->
    <div class="flex justify-end gap-3">
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        outlined
        @click="router.back()"
      />
      <Button
        v-if="isEditMode"
        :label="t('deliveryNotes.actions.update')"
        icon="pi pi-check"
        :loading="submitting"
        @click="onUpdate"
      />
      <Button
        v-else
        :label="t('deliveryNotes.actions.submit')"
        icon="pi pi-check"
        :loading="submitting"
        @click="onSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import type { DataTablePageEvent } from 'primevue/datatable'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import {
  DeliveryNotesService,
  DeliveryOrdersService,
  EmployeesService,
  VehiclesService,
  WarehousesService,
  NumberSeriesService,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { AvailableDeliveryOrder, DeliveryOrderDetail } from '@/types'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const toastGroup = 'deliveryNoteCreate'

const editId = computed(() => {
  const id = Number(route.params.id)
  return isNaN(id) ? null : id
})
const isEditMode = computed(() => editId.value !== null)

// Number mode (create only)
const noMode = ref<'auto' | 'manual'>('auto')
const manualNo = ref('')

// Number series preview (create only)
const previewCode = ref('')
const previewLoading = ref(false)

// Form fields
const deliveryDate = ref<Date>(new Date())
const vehicleId = ref<number | null>(null)
const driverEmployeeId = ref<number | null>(null)
const notes = ref('')

// Initial options for InfiniteSelect pre-population in edit mode
const initialDriver = ref<{ id: number; name: string } | undefined>(undefined)
const initialVehicle = ref<{ id: number; plateNumber: string } | undefined>(undefined)

// DO picker state
const pickerSearch = ref('')
const pickerWarehouseId = ref<number | null>(null)
const pickerPage = ref(0)
const pickerPageSize = ref(10)
const pickerTotal = ref(0)
const pickerItems = ref<AvailableDeliveryOrder[]>([])
const pickerLoading = ref(false)
const selectedPickerRows = ref<AvailableDeliveryOrder[]>([])

// Added DOs
const addedDOs = ref<AvailableDeliveryOrder[]>([])

// DO Detail dialog
const doDetailVisible = ref(false)
const doDetailLoading = ref(false)
const doDetailData = ref<DeliveryOrderDetail | null>(null)

// Submit
const submitting = ref(false)

// Computed summary
const uniqueOutlets = computed(() => new Set(addedDOs.value.map((d) => d.customerName)).size)
const addedTotal = computed(() =>
  addedDOs.value.reduce((sum, d) => sum + parseFloat(d.totalAmount), 0),
)

function formatAmount(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return '-'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

async function loadPreview() {
  previewLoading.value = true
  try {
    const res = await NumberSeriesService.preview('delivery_notes')
    previewCode.value = res.code
  } catch {
    previewCode.value = ''
  } finally {
    previewLoading.value = false
  }
}

async function loadForEdit(id: number) {
  try {
    const detail = await DeliveryNotesService.get(id)
    deliveryDate.value = new Date(detail.deliveryDate)
    notes.value = detail.notes ?? ''
    vehicleId.value = detail.vehicleId
    driverEmployeeId.value = detail.driverEmployeeId

    if (detail.driverEmployeeId && detail.driverName) {
      initialDriver.value = { id: detail.driverEmployeeId, name: detail.driverName }
    }
    if (detail.vehicleId && detail.vehiclePlate) {
      initialVehicle.value = { id: detail.vehicleId, plateNumber: detail.vehiclePlate }
    }

    addedDOs.value = detail.deliveryOrders.map((d) => ({
      id: d.id,
      no: d.no,
      customerName: d.customerName,
      warehouseName: d.warehouseName,
      totalAmount: d.totalAmount,
      createdAt: detail.createdAt,
    }))
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  }
}

async function fetchPickerData(page: number) {
  pickerLoading.value = true
  pickerPage.value = page
  try {
    const params = new URLSearchParams({
      page: String(page + 1),
      limit: String(pickerPageSize.value),
    })
    if (pickerSearch.value.trim()) params.set('search', pickerSearch.value.trim())
    if (pickerWarehouseId.value != null) params.set('warehouseId', String(pickerWarehouseId.value))
    if (isEditMode.value && editId.value != null) params.set('dnId', String(editId.value))

    const addedIds = new Set(addedDOs.value.map((d) => d.id))
    const res = await DeliveryNotesService.listAvailableDeliveryOrders(params.toString())
    pickerItems.value = res.data.filter((d) => !addedIds.has(d.id))
    pickerTotal.value = res.meta.total
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    pickerLoading.value = false
  }
}

function onPickerPage(event: DataTablePageEvent) {
  pickerPageSize.value = event.rows
  fetchPickerData(event.page)
}

function clearPickerFilter() {
  pickerSearch.value = ''
  pickerWarehouseId.value = null
  fetchPickerData(0)
}

function addSelectedDOs() {
  const addedIds = new Set(addedDOs.value.map((d) => d.id))
  for (const row of selectedPickerRows.value) {
    if (!addedIds.has(row.id)) {
      addedDOs.value.push(row)
      addedIds.add(row.id)
    }
  }
  selectedPickerRows.value = []
  fetchPickerData(pickerPage.value)
}

function addAllVisibleDOs() {
  const addedIds = new Set(addedDOs.value.map((d) => d.id))
  for (const item of pickerItems.value) {
    if (!addedIds.has(item.id)) {
      addedDOs.value.push(item)
      addedIds.add(item.id)
    }
  }
  selectedPickerRows.value = []
  fetchPickerData(pickerPage.value)
}

function removeDO(id: number) {
  addedDOs.value = addedDOs.value.filter((d) => d.id !== id)
  fetchPickerData(pickerPage.value)
}

async function openDODetail(id: number) {
  doDetailVisible.value = true
  doDetailLoading.value = true
  doDetailData.value = null
  try {
    doDetailData.value = await DeliveryOrdersService.get(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
    doDetailVisible.value = false
  } finally {
    doDetailLoading.value = false
  }
}

async function onSubmit() {
  if (addedDOs.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: t('deliveryNotes.messages.noDosSelected'),
      group: toastGroup,
      life: 3000,
    })
    return
  }

  submitting.value = true
  try {
    const res = await DeliveryNotesService.create({
      no: noMode.value === 'manual' ? manualNo.value.trim() || null : null,
      deliveryDate: dayjs(deliveryDate.value).format('YYYY-MM-DD'),
      vehicleId: vehicleId.value || null,
      driverEmployeeId: driverEmployeeId.value || null,
      notes: notes.value.trim() || null,
      deliveryOrderIds: addedDOs.value.map((d) => d.id),
    })

    toast.add(
      commonSuccessToast(
        t('deliveryNotes.messages.createSuccess', {
          no: res.no,
          plNo: res.pickingListNo,
        }),
        toastGroup,
      ),
    )

    setTimeout(() => {
      router.push({ name: 'DeliveryNoteDetail', params: { id: res.deliveryNoteId } })
    }, 1200)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    submitting.value = false
  }
}

async function onUpdate() {
  if (addedDOs.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: t('deliveryNotes.messages.noDosSelected'),
      group: toastGroup,
      life: 3000,
    })
    return
  }
  if (!editId.value) return

  submitting.value = true
  try {
    await DeliveryNotesService.update(editId.value, {
      deliveryDate: dayjs(deliveryDate.value).format('YYYY-MM-DD'),
      vehicleId: vehicleId.value || null,
      driverEmployeeId: driverEmployeeId.value || null,
      notes: notes.value.trim() || null,
      deliveryOrderIds: addedDOs.value.map((d) => d.id),
    })

    toast.add(commonSuccessToast(t('deliveryNotes.messages.updateSuccess'), toastGroup))

    setTimeout(() => {
      router.replace({ name: 'DeliveryNotes' })
    }, 1200)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (isEditMode.value && editId.value) {
    await loadForEdit(editId.value)
  } else {
    loadPreview()
  }
  fetchPickerData(0)
})
</script>
