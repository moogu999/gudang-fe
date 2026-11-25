<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('salesCreditNotes.title') }}
      </h1>
    </div>

    <div v-if="isLoading" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-primary text-3xl" />
    </div>

    <template v-else-if="detail">
      <ResponsiveCard class="mb-4">
        <template #content>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.columns.no')
              }}</span>
              <span class="font-medium" data-testid="note-no">{{ detail.no }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.columns.appliedStatus')
              }}</span>
              <Tag
                class="w-fit"
                :severity="appliedSeverity(status)"
                :value="t(`salesCreditNotes.applied.${status}`)"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.columns.date')
              }}</span>
              <span>{{ dayjs(detail.noteDate).format(DateFormat.DATE) }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.columns.customer')
              }}</span>
              <span>{{ detail.customer.code }} — {{ detail.customer.name }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.fields.branch')
              }}</span>
              <span>{{ detail.branch.name }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.fields.company')
              }}</span>
              <span>{{ detail.company.name }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.columns.salesman')
              }}</span>
              <span>{{ detail.salesman.name }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.fields.returnSo')
              }}</span>
              <RouterLink
                :to="{ name: 'SalesOrderDetail', params: { id: detail.salesOrder.id } }"
                class="text-primary font-medium hover:underline"
                >{{ detail.salesOrder.code }}</RouterLink
              >
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.fields.returnDo')
              }}</span>
              <RouterLink
                :to="{ name: 'DeliveryOrderDetail', params: { id: detail.deliveryOrder.id } }"
                class="text-primary font-medium hover:underline"
                >{{ detail.deliveryOrder.code }}</RouterLink
              >
            </div>
            <div v-if="detail.sourceInvoice" class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.fields.sourceInvoice')
              }}</span>
              <RouterLink
                :to="{ name: 'InvoiceDetail', params: { id: detail.sourceInvoice.id } }"
                class="text-primary font-medium hover:underline"
                >{{ detail.sourceInvoice.code }}</RouterLink
              >
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.fields.postedAt')
              }}</span>
              <span>{{ dayjs(detail.postedAt).format(DateFormat.DATE_TIME) }}</span>
            </div>
            <div v-if="detail.postedBy" class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.fields.postedBy')
              }}</span>
              <span>{{ detail.postedBy.name }}</span>
            </div>

            <!-- Nota Retur number: the one editable field, kept for tax operations -->
            <div class="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <span class="text-xs font-semibold text-stone-500 uppercase">{{
                t('salesCreditNotes.columns.taxReturnNoteNo')
              }}</span>
              <div v-if="!editingRef" class="flex items-center gap-2">
                <span data-testid="tax-ref">{{ detail.taxReturnNoteNo || '-' }}</span>
                <Button
                  v-if="canWrite"
                  icon="pi pi-pencil"
                  size="small"
                  text
                  :aria-label="t('salesCreditNotes.taxRef.edit')"
                  data-testid="tax-ref-edit"
                  @click="startEdit"
                />
              </div>
              <div v-else class="flex flex-col gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <InputText
                    v-model="refDraft"
                    class="w-full max-w-sm"
                    :invalid="!!refError"
                    maxlength="64"
                    data-testid="tax-ref-input"
                    @keyup.enter="saveRef"
                  />
                  <Button
                    :label="t('salesCreditNotes.taxRef.save')"
                    size="small"
                    :loading="savingRef"
                    data-testid="tax-ref-save"
                    @click="saveRef"
                  />
                  <Button
                    :label="t('salesCreditNotes.taxRef.cancel')"
                    size="small"
                    severity="secondary"
                    outlined
                    :disabled="savingRef"
                    @click="editingRef = false"
                  />
                </div>
                <Message v-if="refError" severity="error" size="small" variant="simple">{{
                  refError
                }}</Message>
              </div>
            </div>
          </div>
        </template>
      </ResponsiveCard>

      <ResponsiveCard>
        <template #content>
          <DataTable :value="detail.lines" data-key="productId" class="mb-4 text-sm" size="small">
            <Column :header="t('salesCreditNotes.lines.product')">
              <template #body="{ data }">
                <div class="flex flex-col gap-0.5">
                  <span class="font-medium">{{ data.productCode }}</span>
                  <span class="text-xs text-stone-500">{{ data.productName }}</span>
                </div>
              </template>
            </Column>
            <Column :header="t('salesCreditNotes.lines.quantity')">
              <template #body="{ data }">
                <div class="flex flex-col items-start gap-0.5">
                  <span>
                    <template v-if="(pinnedToLevels(data.pinnedUom)?.length ?? 0) > 1">
                      {{
                        decomposeBaseQty(
                          parseFloat(data.quantity),
                          pinnedToLevels(data.pinnedUom)!,
                        ).join(' / ')
                      }}
                    </template>
                    <template v-else>{{ formatQty(data.quantity) }}</template>
                  </span>
                  <span v-if="uomLabel(data)" class="text-xs text-stone-400">{{
                    uomLabel(data)
                  }}</span>
                </div>
              </template>
            </Column>
            <Column :header="t('salesCreditNotes.lines.price')" class="text-right">
              <template #body="{ data }">{{ formatAmount(data.price) }}</template>
            </Column>
            <Column :header="t('salesCreditNotes.lines.discount')" class="text-right">
              <template #body="{ data }">
                {{ parseFloat(data.discount) > 0 ? formatAmount(data.discount) : '-' }}
              </template>
            </Column>
            <Column :header="t('salesCreditNotes.lines.subAmount')" class="text-right">
              <template #body="{ data }">{{ formatAmount(data.subAmount) }}</template>
            </Column>
            <Column :header="t('salesCreditNotes.lines.taxBase')" class="text-right">
              <template #body="{ data }">{{ formatAmount(data.taxBaseAmount) }}</template>
            </Column>
            <Column :header="t('salesCreditNotes.lines.tax')" class="text-right">
              <template #body="{ data }">{{ formatAmount(data.taxAmount) }}</template>
            </Column>
            <template #empty>
              <div class="py-4 text-center text-stone-500">{{ t('table.noResults') }}</div>
            </template>
          </DataTable>

          <div class="flex justify-end">
            <div class="w-full max-w-xs rounded-lg border border-stone-200 p-4">
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-stone-500">{{ t('salesCreditNotes.summary.subtotal') }}</span>
                  <span class="tabular-nums">{{ formatAmount(detail.subtotalAmount) }}</span>
                </div>
                <div
                  v-if="parseFloat(detail.discountAmount) > 0"
                  class="flex justify-between text-red-600"
                >
                  <span>{{ t('salesCreditNotes.summary.discount') }}</span>
                  <span class="tabular-nums">- {{ formatAmount(detail.discountAmount) }}</span>
                </div>
                <Divider class="my-1" />
                <div class="flex justify-between">
                  <span class="text-stone-500">{{ t('salesCreditNotes.summary.taxBase') }}</span>
                  <span class="tabular-nums">{{ formatAmount(detail.taxBaseAmount) }}</span>
                </div>
                <div
                  v-if="parseFloat(detail.taxAmount) > 0"
                  class="flex justify-between text-orange-600"
                >
                  <span>{{ t('salesCreditNotes.summary.tax') }}</span>
                  <span class="tabular-nums">+ {{ formatAmount(detail.taxAmount) }}</span>
                </div>
                <Divider class="my-1" />
                <div class="flex justify-between text-base font-bold">
                  <span>{{ t('salesCreditNotes.summary.total') }}</span>
                  <span class="text-green-600 tabular-nums">{{
                    formatAmount(detail.totalAmount)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-stone-500">{{
                    t('salesCreditNotes.fields.appliedAmount')
                  }}</span>
                  <span class="tabular-nums">{{ formatAmount(detail.appliedAmount) }}</span>
                </div>
                <div class="flex justify-between font-semibold">
                  <span>{{ t('salesCreditNotes.fields.outstanding') }}</span>
                  <span class="tabular-nums" data-testid="outstanding">{{
                    formatAmount(detail.outstandingAmount)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </ResponsiveCard>
    </template>

    <Message v-else severity="error">
      {{ t('salesCreditNotes.messages.notFound') }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Divider from 'primevue/divider'
import dayjs from 'dayjs'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { SalesCreditNotesService, commonErrorToast, commonSuccessToast } from '@/services'
import { ApiError } from '@/types/api.type'
import type { SalesCreditNoteDetail, SalesCreditNoteLine, UomConversionLevel } from '@/types'
import DateFormat from '@/constants/dateFormat'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/composables'
import { pinnedToLevels, decomposeBaseQty } from '@/utils/uomHelper'
import { appliedSeverity, appliedStatus } from './salesCreditNoteStatus'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const { hasPermission } = usePermissions()

const toastGroup = 'salesCreditNoteDetail'
const detail = ref<SalesCreditNoteDetail | null>(null)
const isLoading = ref(false)

const canWrite = computed(() => hasPermission(PERMISSIONS.SALES_CREDIT_NOTE_WRITE))
const status = computed(() => appliedStatus(detail.value?.appliedAmount, detail.value?.totalAmount))

const editingRef = ref(false)
const refDraft = ref('')
const refError = ref('')
const savingRef = ref(false)

function startEdit() {
  refDraft.value = detail.value?.taxReturnNoteNo ?? ''
  refError.value = ''
  editingRef.value = true
}

async function saveRef() {
  if (!detail.value || savingRef.value) return
  savingRef.value = true
  refError.value = ''
  const value = refDraft.value.trim()
  try {
    // An empty value clears the reference: the key is omitted, not sent blank.
    detail.value = await SalesCreditNotesService.updateTaxReference(
      detail.value.id,
      value ? { taxReturnNoteNo: value } : {},
    )
    editingRef.value = false
    toast.add(commonSuccessToast(t('salesCreditNotes.taxRef.saved'), toastGroup))
  } catch (e) {
    if (e instanceof ApiError && e.code === 'DUPLICATE_TAX_RETURN_NOTE_NO') {
      refError.value = t('salesCreditNotes.validation.duplicateTaxReturnNoteNo')
    } else {
      toast.add(commonErrorToast(e, toastGroup))
    }
  } finally {
    savingRef.value = false
  }
}

function formatAmount(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return '-'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatQty(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return '-'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(num)
}

function uomLabel(line: SalesCreditNoteLine): string | undefined {
  const levels: UomConversionLevel[] | undefined = pinnedToLevels(line.pinnedUom)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

async function fetchDetail(id: number) {
  isLoading.value = true
  try {
    detail.value = await SalesCreditNotesService.get(id)
  } catch (e) {
    // 404 also covers a note outside the caller's branches: show the not-found state only.
    if (!(e instanceof ApiError && e.status === 404)) toast.add(commonErrorToast(e, toastGroup))
    detail.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/sales-credit-notes')
    return
  }
  fetchDetail(id)
})
</script>
