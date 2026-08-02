<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="apInvoiceConfirm" />

  <div v-if="isLoading" class="flex items-center justify-center py-8">
    <ProgressSpinner />
  </div>

  <Form
    v-else
    v-slot="$form"
    :initial-values="initialValues"
    :resolver="resolver"
    @submit="onFormSubmit"
  >
    <!-- Status tag (VIEW / EDIT modes) -->
    <div v-if="mode !== DialogMode.ADD && currentStatus" class="mb-4">
      <Tag
        :severity="statusSeverity(currentStatus)"
        :value="t(`apInvoices.status.${currentStatus}`)"
      />
    </div>

    <!-- Approval timeline + actions -->
    <Panel
      v-if="mode !== DialogMode.ADD && apInvoiceId"
      v-model:collapsed="isApprovalCollapsed"
      toggleable
      :header="t('approvals.sectionTitle')"
      class="mb-4"
    >
      <ApprovalTimeline
        ref="approvalTimelineRef"
        module-key="ap_invoice"
        :reference-id="apInvoiceId"
        :show-status-header="false"
      />
      <Divider />
      <ApprovalActionBar
        module-key="ap_invoice"
        :reference-id="apInvoiceId"
        @changed="onApprovalChanged"
      />
    </Panel>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left column -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('apInvoices.sections.header') }}
        </h3>

        <!-- Document number -->
        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('apInvoices.fields.no') }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('apInvoices.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('apInvoices.codeMode.manual')"
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
            <small class="text-surface-500">{{ t('apInvoices.codeMode.assignedOnSave') }}</small>
          </div>
          <InputText
            v-else
            id="no"
            name="no"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW || mode === DialogMode.EDIT"
            class="w-full"
          />
          <Message v-if="$form.no?.invalid" severity="error" size="small" variant="simple">{{
            $form.no.error.message
          }}</Message>
        </div>

        <!-- Supplier -->
        <div class="flex flex-col gap-1">
          <label for="supplierId" class="text-sm font-semibold">{{
            t('apInvoices.fields.supplier')
          }}</label>
          <InfiniteSelect
            id="supplierId"
            name="supplierId"
            option-label="name"
            option-value="id"
            :fetch-fn="(q) => SuppliersService.list(q)"
            :initial-option="initialSupplier"
            :disabled="mode === DialogMode.VIEW"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @update:model-value="onSupplierIdUpdate"
            @select-option="(opt) => onSupplierSelect(opt as Supplier)"
          />
          <Message
            v-if="$form.supplierId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.supplierId.error.message }}</Message
          >
        </div>

        <!-- Legal entity — resolved from the document's branch, never editable -->
        <div class="flex flex-col gap-1">
          <label for="legalEntity" class="text-sm font-semibold">{{
            t('apInvoices.fields.legalEntity')
          }}</label>
          <InputText id="legalEntity" :value="legalEntityLabel" disabled class="w-full" />
          <small v-if="!companyName" class="text-surface-500">{{
            t('apInvoices.labels.legalEntityUnresolved')
          }}</small>
        </div>

        <!-- Branch — only shown when the user has more than one assigned branch -->
        <div v-if="showBranchPicker" class="flex flex-col gap-1">
          <label for="branchId" class="text-sm font-semibold">{{
            t('apInvoices.fields.branch')
          }}</label>
          <InfiniteSelect
            id="branchId"
            name="branchId"
            option-label="name"
            option-value="id"
            :fetch-fn="fetchUserBranches"
            :initial-option="initialBranch"
            :disabled="mode !== DialogMode.ADD"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
            @update:model-value="onBranchIdUpdate"
          />
          <Message v-if="$form.branchId?.invalid" severity="error" size="small" variant="simple">{{
            $form.branchId.error.message
          }}</Message>
        </div>
      </div>

      <!-- Right column -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('apInvoices.sections.invoiceInfo') }}
        </h3>

        <!-- Supplier invoice number -->
        <div class="flex flex-col gap-1">
          <label for="supplierInvoiceNo" class="text-sm font-semibold">{{
            t('apInvoices.fields.supplierInvoiceNo')
          }}</label>
          <InputText
            id="supplierInvoiceNo"
            name="supplierInvoiceNo"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message
            v-if="$form.supplierInvoiceNo?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.supplierInvoiceNo.error.message }}</Message
          >
        </div>

        <!-- Faktur Pajak number — optional, it routinely lags the goods -->
        <div class="flex flex-col gap-1">
          <label for="taxInvoiceNo" class="text-sm font-semibold">{{
            t('apInvoices.fields.taxInvoiceNo')
          }}</label>
          <InputText
            id="taxInvoiceNo"
            name="taxInvoiceNo"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
        </div>

        <!-- Invoice date -->
        <div class="flex flex-col gap-1">
          <label for="invoiceDate" class="text-sm font-semibold">{{
            t('apInvoices.fields.invoiceDate')
          }}</label>
          <DatePicker
            id="invoiceDate"
            name="invoiceDate"
            date-format="dd/mm/yy"
            :max-date="maxInvoiceDate"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            @update:model-value="onInvoiceDateUpdate"
          />
          <Message
            v-if="$form.invoiceDate?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.invoiceDate.error.message }}</Message
          >
        </div>

        <!-- Term of Payment — snapshotted from the supplier, never labelled "TOP" -->
        <div class="flex flex-col gap-1">
          <label for="paymentTerm" class="text-sm font-semibold">{{
            t('apInvoices.fields.paymentTerm')
          }}</label>
          <InputText id="paymentTerm" :value="paymentTermName" disabled class="w-full" />
        </div>

        <!-- Due date — invoice date + the term's days -->
        <div class="flex flex-col gap-1">
          <label for="dueDate" class="text-sm font-semibold">{{
            t('apInvoices.fields.dueDate')
          }}</label>
          <InputText id="dueDate" :value="dueDateLabel" disabled class="w-full" />
        </div>
      </div>
    </div>

    <Divider class="my-6" />

    <!-- Receipt picker (hidden in VIEW mode — nothing can be added to a saved invoice) -->
    <div v-if="mode !== DialogMode.VIEW" class="mb-6">
      <h3 class="mb-3 text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('apInvoices.picker.title') }}
      </h3>

      <Message v-if="!selectedSupplierId" severity="info" variant="simple">
        {{ t('apInvoices.picker.selectSupplierFirst') }}
      </Message>

      <template v-else>
        <div class="mb-3 flex flex-col gap-2 sm:flex-row">
          <InputText
            v-model="pickerSearch"
            :placeholder="t('apInvoices.picker.searchPlaceholder')"
            class="w-full sm:w-64"
            @keyup.enter="fetchPickerData(0)"
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

        <div class="mb-3 flex flex-wrap gap-2">
          <Button
            :label="t('apInvoices.picker.addSelected')"
            icon="pi pi-plus"
            size="small"
            :disabled="selectedPickerRows.length === 0"
            @click="addSelectedReceipts"
          />
          <Button
            :label="t('apInvoices.picker.addAll')"
            icon="pi pi-plus-circle"
            size="small"
            severity="secondary"
            :disabled="pickerItems.length === 0"
            @click="addAllVisibleReceipts"
          />
        </div>

        <!-- Raw DataTable: TableComponent hardcodes selection-mode="single". -->
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
          <Column :header="t('apInvoices.picker.receiptNo')">
            <template #body="{ data }">
              <div class="font-medium">{{ data.no }}</div>
              <div class="text-xs text-stone-500">
                {{ t('apInvoices.picker.ref') }} {{ data.purchaseOrderNo }}
              </div>
            </template>
          </Column>
          <Column :header="t('apInvoices.picker.receiptDate')">
            <template #body="{ data }">{{
              dayjs(data.receiptDate).format(DateFormat.DATE)
            }}</template>
          </Column>
          <Column :header="t('apInvoices.picker.warehouse')">
            <template #body="{ data }">{{ data.warehouseName }}</template>
          </Column>
          <Column :header="t('apInvoices.picker.value')" class="text-right">
            <template #body="{ data }">{{
              formatNumber(parseFloat(data.subtotalAmount || '0'))
            }}</template>
          </Column>
          <template #empty>
            <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
          </template>
        </DataTable>
      </template>
    </div>

    <!-- Covered receipts -->
    <div class="mb-6">
      <h3 class="mb-3 text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('apInvoices.sections.coveredReceipts') }}
      </h3>

      <DataTable :value="addedReceipts" data-key="id" class="text-sm" size="small">
        <Column :header="t('apInvoices.picker.receiptNo')">
          <template #body="{ data }">
            <div class="font-medium">{{ data.no }}</div>
            <div class="text-xs text-stone-500">
              {{ t('apInvoices.picker.ref') }} {{ data.purchaseOrderNo }}
            </div>
          </template>
        </Column>
        <Column :header="t('apInvoices.picker.receiptDate')">
          <template #body="{ data }">{{
            dayjs(data.receiptDate).format(DateFormat.DATE)
          }}</template>
        </Column>
        <Column :header="t('apInvoices.picker.warehouse')">
          <template #body="{ data }">{{ data.warehouseName }}</template>
        </Column>
        <Column :header="t('apInvoices.picker.value')" class="text-right">
          <template #body="{ data }">{{
            formatNumber(parseFloat(data.subtotalAmount || '0'))
          }}</template>
        </Column>
        <Column v-if="mode !== DialogMode.VIEW" :header="t('common.labels.actions')">
          <template #body="{ data }">
            <Button
              icon="pi pi-trash"
              severity="danger"
              size="small"
              text
              :aria-label="t('apInvoices.coveredReceipts.remove')"
              @click="removeReceipt(data.id)"
            />
          </template>
        </Column>
        <template #empty>
          <div class="py-4 text-center text-sm text-stone-400">
            {{ t('apInvoices.coveredReceipts.empty') }}
          </div>
        </template>
      </DataTable>

      <div
        class="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm"
      >
        <span>{{ t('apInvoices.picker.selectedCount', { count: addedReceipts.length }) }}</span>
        <span class="font-semibold text-green-700">{{
          t('apInvoices.picker.selectedTotal', { amount: formatNumber(addedReceiptsTotal) })
        }}</span>
      </div>
    </div>

    <Divider class="my-6" />

    <!-- Remark + Summary -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div class="flex flex-col gap-1">
        <label for="remark" class="text-sm font-semibold">{{
          t('apInvoices.fields.remark')
        }}</label>
        <Textarea
          id="remark"
          name="remark"
          rows="4"
          :disabled="mode === DialogMode.VIEW"
          class="w-full"
        />
      </div>

      <ApInvoiceSummary
        v-model:tax-amount="taxAmount"
        :tax-base="displayedTaxBase"
        :tax-rate="taxRate"
        :readonly="mode === DialogMode.VIEW"
        :saved-total-amount="savedTotalAmount"
      />
    </div>

    <div class="mt-6 flex justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <template v-if="mode !== DialogMode.VIEW">
        <Button
          type="submit"
          severity="secondary"
          :label="t('apInvoices.actions.saveAsDraft')"
          :loading="isSaving"
          @click="chosenStatus = 'draft'"
        />
        <Button
          type="submit"
          :label="t('apInvoices.actions.submitForApproval')"
          :loading="isSaving"
          @click="chosenStatus = 'approved'"
        />
      </template>
    </div>
  </Form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeMount } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import Panel from 'primevue/panel'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import ApprovalTimeline from '@/components/approval/ApprovalTimeline.vue'
import ApprovalActionBar from '@/components/approval/ApprovalActionBar.vue'
import ApInvoiceSummary from './components/ApInvoiceSummary.vue'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import DateFormat from '@/constants/dateFormat'
import {
  ApInvoicesService,
  BranchesService,
  CompaniesService,
  CompanyBranchesService,
  PaymentTermsService,
  SuppliersService,
  TaxConfigurationService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { Supplier } from '@/types/supplier.type'
import type { Branch } from '@/types'
import type { Base } from '@/types/api.type'
import type {
  ApInvoiceStatus,
  CreateApInvoiceRequest,
  InvoiceableGoodsReceipt,
} from '@/types/apInvoice.type'
import { useAuthStore } from '@/stores/auth'
import { useNumberSeries } from '@/composables'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()

const {
  codeMode: noMode,
  previewCode,
  seriesId: numberSeriesId,
  loading: numberSeriesLoading,
  hasDefaultSeries,
  generateCode,
} = useNumberSeries('ap_invoices')

const toastGroup = 'apInvoiceForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  apInvoiceId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: []
}>()

// Status / approval
const chosenStatus = ref<'draft' | 'approved'>('draft')
const currentStatus = ref<ApInvoiceStatus | undefined>()
const approvalTimelineRef = ref<InstanceType<typeof ApprovalTimeline> | null>(null)
const isApprovalCollapsed = ref(false)

function statusSeverity(status: ApInvoiceStatus) {
  if (status === 'approved') return 'success'
  if (status === 'need_approval') return 'warn'
  return 'secondary'
}

const isLoading = ref(false)
const isSaving = ref(false)
const apInvoiceId = computed(() => props.apInvoiceId)

// Tax
const taxRate = ref(0)
const taxAmount = ref(0)

// Backend-computed figures — used in VIEW mode instead of recomputing, so an approved
// invoice does not move when the tax configuration percentage is edited later.
const savedTaxBaseAmount = ref(0)
const savedTotalAmount = ref(0)

// Supplier — form-bound, but it also drives the payment term, the due date and the picker.
const selectedSupplierId = ref<number | undefined>()
const initialSupplier = ref<Supplier | undefined>()
const paymentTermName = ref('')
const termDays = ref(0)

// Legal entity, resolved from the document's branch via company_branches → companies.
const companyName = ref('')
const companyTaxId = ref('')

const legalEntityLabel = computed(() => {
  if (!companyName.value) return ''
  return companyTaxId.value
    ? `${companyName.value} — NPWP ${companyTaxId.value}`
    : companyName.value
})

// Branch — only rendered when the user has more than one assigned branch, matching
// the backend's resolveBranchID rules (omitted + exactly one branch → use it silently).
const showBranchPicker = computed(() => authStore.branchIds.length > 1)
const initialBranch = ref<Branch | undefined>()
const selectedBranchId = ref<number | undefined>()

let userBranchesPromise: Promise<Branch[]> | null = null

function loadUserBranches(): Promise<Branch[]> {
  if (!userBranchesPromise) {
    userBranchesPromise = Promise.all(
      authStore.branchIds.map(async (id) => {
        const query = new GenericQueryBuilder().withFilter('id', FilterOperator.EQUAL, id).build()
        const result = await BranchesService.list(query)
        return result.data[0]
      }),
    ).then((branches) => branches.filter((b): b is Branch => !!b))
  }
  return userBranchesPromise
}

async function fetchUserBranches(query: string): Promise<Base<Branch>> {
  const branches = await loadUserBranches()
  const search = new URLSearchParams(query).get('search')?.toLowerCase()
  const filtered = search
    ? branches.filter(
        (b) => b.name.toLowerCase().includes(search) || b.code.toLowerCase().includes(search),
      )
    : branches
  return {
    data: filtered,
    meta: { total: filtered.length, limit: filtered.length, offset: 0, hasMore: false },
  }
}

/**
 * Resolve the legal entity from a branch. A branch mapping to no company is a hard
 * 400 on save (`ErrCompanyNotResolved`), so surface the blank here rather than at submit.
 */
async function resolveCompanyForBranch(branchId: number | undefined) {
  companyName.value = ''
  companyTaxId.value = ''
  if (!branchId) return
  try {
    const query = new GenericQueryBuilder()
      .withFilter('branchId', FilterOperator.EQUAL, branchId)
      .build()
    const mappings = await CompanyBranchesService.list(query)
    const companyId = mappings.data[0]?.companyId
    if (!companyId) return
    const company = await CompaniesService.get(companyId)
    companyName.value = company.name
    companyTaxId.value = company.taxId ?? ''
  } catch {
    // Leave the field blank — the hint under it explains the unmapped branch.
  }
}

// A faktur records goods already received, so it can never be dated ahead of today.
function endOfToday(): Date {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

const maxInvoiceDate = computed(() => endOfToday())

const invoiceDate = ref<Date | undefined>(props.mode === DialogMode.ADD ? new Date() : undefined)

const dueDate = computed(() => {
  if (!invoiceDate.value) return undefined
  return dayjs(invoiceDate.value).add(termDays.value, 'day').toDate()
})

const dueDateLabel = computed(() =>
  dueDate.value ? dayjs(dueDate.value).format(DateFormat.DATE) : '',
)

const initialValues = reactive({
  no: '',
  supplierId: undefined as number | undefined,
  supplierInvoiceNo: '',
  taxInvoiceNo: '',
  invoiceDate: (props.mode === DialogMode.ADD ? new Date() : undefined) as Date | undefined,
  remark: '',
  branchId: undefined as number | undefined,
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        props.mode === DialogMode.ADD && noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('apInvoices.validation.noRequired')),
      supplierId: z.number({ message: t('apInvoices.validation.supplierRequired') }),
      supplierInvoiceNo: z.string().min(1, t('apInvoices.validation.supplierInvoiceNoRequired')),
      taxInvoiceNo: z.string().optional(),
      invoiceDate: z
        .date({ message: t('apInvoices.validation.invoiceDateRequired') })
        // Re-reads the clock at validation time, so a value set programmatically
        // after mount is still caught even though :max-date already guards the picker.
        .refine((date) => date <= endOfToday(), {
          message: t('apInvoices.validation.invoiceDateFuture'),
        }),
      remark: z.string().optional(),
      branchId: showBranchPicker.value
        ? z.number({ message: t('apInvoices.validation.branchRequired') })
        : z.number().optional(),
    }),
  ),
)

// ---------------------------------------------------------------------------
// Covered receipts + picker
// ---------------------------------------------------------------------------

const addedReceipts = ref<InvoiceableGoodsReceipt[]>([])

const pickerSearch = ref('')
const pickerPage = ref(0)
const pickerPageSize = ref(10)
const pickerTotal = ref(0)
const pickerItems = ref<InvoiceableGoodsReceipt[]>([])
const pickerLoading = ref(false)
const selectedPickerRows = ref<InvoiceableGoodsReceipt[]>([])

const addedReceiptsTotal = computed(() =>
  addedReceipts.value.reduce((sum, r) => sum + (parseFloat(r.subtotalAmount) || 0), 0),
)

/** DPP: the saved figure in VIEW mode, the live sum of the covered receipts otherwise. */
const displayedTaxBase = computed(() =>
  props.mode === DialogMode.VIEW ? savedTaxBaseAmount.value : addedReceiptsTotal.value,
)

/**
 * The endpoint takes bespoke params rather than GenericQueryBuilder triples.
 * `apInvoiceId` is what keeps an invoice's own receipts visible while editing it —
 * without it, opening a draft would show an empty picker.
 */
async function fetchPickerData(page: number) {
  if (!selectedSupplierId.value) {
    pickerItems.value = []
    pickerTotal.value = 0
    return
  }

  pickerLoading.value = true
  pickerPage.value = page
  try {
    const params = new URLSearchParams({
      supplierId: String(selectedSupplierId.value),
      page: String(page + 1),
      limit: String(pickerPageSize.value),
    })
    if (pickerSearch.value.trim()) params.set('search', pickerSearch.value.trim())
    if (props.mode === DialogMode.EDIT && props.apInvoiceId) {
      params.set('apInvoiceId', String(props.apInvoiceId))
    }
    if (showBranchPicker.value && selectedBranchId.value) {
      params.set('branchId', String(selectedBranchId.value))
    }

    const addedIds = new Set(addedReceipts.value.map((r) => r.id))
    const res = await ApInvoicesService.listInvoiceableGoodsReceipts(params.toString())
    pickerItems.value = res.data.filter((r) => !addedIds.has(r.id))
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
  fetchPickerData(0)
}

// Every add/remove re-fetches the current page so rows disappear and reappear
// without a manual refresh.
function addSelectedReceipts() {
  const addedIds = new Set(addedReceipts.value.map((r) => r.id))
  for (const row of selectedPickerRows.value) {
    if (!addedIds.has(row.id)) {
      addedReceipts.value.push(row)
      addedIds.add(row.id)
    }
  }
  selectedPickerRows.value = []
  fetchPickerData(pickerPage.value)
}

function addAllVisibleReceipts() {
  const addedIds = new Set(addedReceipts.value.map((r) => r.id))
  for (const item of pickerItems.value) {
    if (!addedIds.has(item.id)) {
      addedReceipts.value.push(item)
      addedIds.add(item.id)
    }
  }
  selectedPickerRows.value = []
  fetchPickerData(pickerPage.value)
}

function removeReceipt(id: number) {
  addedReceipts.value = addedReceipts.value.filter((r) => r.id !== id)
  fetchPickerData(pickerPage.value)
}

// ---------------------------------------------------------------------------
// Cascades
// ---------------------------------------------------------------------------

async function applySupplier(supplier: Supplier) {
  paymentTermName.value = supplier.paymentTerm?.name ?? ''
  termDays.value = 0

  if (supplier.paymentTermId) {
    try {
      const term = await PaymentTermsService.getById(supplier.paymentTermId)
      paymentTermName.value = term.name
      // `days` is nullable and means "due on receipt" when unset (the seeded COD row).
      termDays.value = term.days ?? 0
    } catch {
      // Keep whatever the supplier payload carried; the server computes the real due date.
    }
  }
}

async function onSupplierSelect(supplier: Supplier) {
  const changed = selectedSupplierId.value !== supplier.id
  selectedSupplierId.value = supplier.id
  await applySupplier(supplier)
  // The picker is supplier-scoped, so a stale selection would fail the server-side
  // eligibility re-check on save anyway.
  if (changed) addedReceipts.value = []
  await fetchPickerData(0)
}

function onSupplierIdUpdate(value: unknown) {
  if (typeof value === 'number') return
  selectedSupplierId.value = undefined
  paymentTermName.value = ''
  termDays.value = 0
  addedReceipts.value = []
  pickerItems.value = []
  pickerTotal.value = 0
}

async function onBranchIdUpdate(value: unknown) {
  selectedBranchId.value = typeof value === 'number' ? value : undefined
  await resolveCompanyForBranch(selectedBranchId.value)
  // The picker is fenced on the branch's company, so its rows change with the branch.
  addedReceipts.value = []
  await fetchPickerData(0)
}

function onInvoiceDateUpdate(value: unknown) {
  invoiceDate.value = value instanceof Date ? value : undefined
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

const pendingRequest = ref<CreateApInvoiceRequest | null>(null)

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    if (props.mode === DialogMode.EDIT && props.apInvoiceId) {
      // `no` and `branchId` are stamped at creation and are not recomputed on update.
      const req = pendingRequest.value
      await ApInvoicesService.update(props.apInvoiceId, {
        status: req.status,
        supplierId: req.supplierId,
        supplierInvoiceNo: req.supplierInvoiceNo,
        taxInvoiceNo: req.taxInvoiceNo,
        invoiceDate: req.invoiceDate,
        goodsReceiptIds: req.goodsReceiptIds,
        taxAmount: req.taxAmount,
        remark: req.remark,
      })
      toast.add(commonSuccessToast(t('apInvoices.messages.updated'), toastGroup))
    } else {
      await ApInvoicesService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('apInvoices.messages.created'), toastGroup))
    }
    emit('submitted')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return

  if (addedReceipts.value.length === 0) {
    toast.add(commonErrorToast(new Error(t('apInvoices.validation.receiptsRequired')), toastGroup))
    return
  }

  if (taxAmount.value < 0) {
    toast.add(commonErrorToast(new Error(t('apInvoices.validation.taxNegative')), toastGroup))
    return
  }

  let no: string | null = null
  if (props.mode === DialogMode.ADD && noMode.value === 'auto' && numberSeriesId.value !== null) {
    no = await generateCode()
  } else if (props.mode !== DialogMode.ADD || noMode.value === 'manual') {
    no = (event.states.no.value as string) || null
  }

  const request: CreateApInvoiceRequest = {
    no,
    branchId: showBranchPicker.value ? (event.states.branchId.value ?? null) : null,
    status: chosenStatus.value,
    supplierId: event.states.supplierId.value as number,
    supplierInvoiceNo: (event.states.supplierInvoiceNo.value as string).trim(),
    taxInvoiceNo: (event.states.taxInvoiceNo.value as string)?.trim() || null,
    // dayjs, never toISOString().split('T')[0] — the latter converts to UTC and
    // lands a day early at UTC+7.
    invoiceDate: dayjs(event.states.invoiceDate.value as Date).format('YYYY-MM-DD'),
    goodsReceiptIds: addedReceipts.value.map((r) => r.id),
    taxAmount: String(taxAmount.value),
    remark: (event.states.remark.value as string) || null,
  }

  pendingRequest.value = request

  if (chosenStatus.value === 'approved') {
    confirm.require({
      group: 'apInvoiceConfirm',
      header: t('apInvoices.confirm.header'),
      message: t('apInvoices.confirm.message'),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('apInvoices.actions.submitForApproval') },
      accept: doSubmit,
    })
  } else {
    await doSubmit()
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function loadApInvoice() {
  if (!props.apInvoiceId) return

  isLoading.value = true
  try {
    const invoice = await ApInvoicesService.get(props.apInvoiceId)

    initialValues.no = invoice.no
    initialValues.supplierId = invoice.supplierId
    initialValues.supplierInvoiceNo = invoice.supplierInvoiceNo
    initialValues.taxInvoiceNo = invoice.taxInvoiceNo ?? ''
    initialValues.invoiceDate = new Date(invoice.invoiceDate)
    initialValues.remark = invoice.remark ?? ''
    initialValues.branchId = invoice.branchId

    currentStatus.value = invoice.status
    selectedSupplierId.value = invoice.supplierId
    selectedBranchId.value = invoice.branchId
    invoiceDate.value = new Date(invoice.invoiceDate)

    initialSupplier.value = {
      id: invoice.supplierId,
      name: invoice.supplierName ?? '',
    } as Supplier

    paymentTermName.value = invoice.paymentTermName ?? ''
    // Derive the term's days from the saved dates so the read-only Due Date field
    // keeps agreeing with the server even if the master has moved since.
    termDays.value = dayjs(invoice.dueDate).diff(dayjs(invoice.invoiceDate), 'day')

    companyName.value = invoice.companyName ?? ''
    companyTaxId.value = invoice.companyTaxId ?? ''

    savedTaxBaseAmount.value = parseFloat(invoice.taxBaseAmount) || 0
    savedTotalAmount.value = parseFloat(invoice.totalAmount) || 0
    taxAmount.value = parseFloat(invoice.taxAmount) || 0

    addedReceipts.value = invoice.details.map((d) => ({
      id: d.goodsReceiptHeaderId,
      no: d.goodsReceiptNo,
      receiptDate: d.receiptDate,
      warehouseId: 0,
      warehouseName: d.warehouseName,
      purchaseOrderHeaderId: 0,
      purchaseOrderNo: d.purchaseOrderNo,
      subtotalAmount: d.taxBaseAmount,
    }))

    if (showBranchPicker.value) {
      const query = new GenericQueryBuilder()
        .withFilter('id', FilterOperator.EQUAL, invoice.branchId)
        .build()
      const branchResult = await BranchesService.list(query)
      initialBranch.value = branchResult.data[0]
    }

    if (props.mode === DialogMode.EDIT) {
      await fetchPickerData(0)
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function onApprovalChanged() {
  await approvalTimelineRef.value?.refresh()
  if (!props.apInvoiceId) return
  try {
    const invoice = await ApInvoicesService.get(props.apInvoiceId)
    currentStatus.value = invoice.status
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  }
}

onBeforeMount(async () => {
  if (props.mode === DialogMode.ADD) {
    isLoading.value = true
  }

  try {
    const taxConfig = await TaxConfigurationService.get().catch(() => ({ percentage: '0' }))
    taxRate.value = parseFloat(taxConfig.percentage) || 0

    if ((props.mode === DialogMode.VIEW || props.mode === DialogMode.EDIT) && props.apInvoiceId) {
      await loadApInvoice()
      return
    }

    if (showBranchPicker.value && authStore.primaryBranchId) {
      const branches = await loadUserBranches()
      const defaultBranch = branches.find((b) => b.id === authStore.primaryBranchId)
      if (defaultBranch) {
        initialValues.branchId = defaultBranch.id
        initialBranch.value = defaultBranch
        selectedBranchId.value = defaultBranch.id
      }
    } else {
      selectedBranchId.value = authStore.branchIds[0]
    }

    await resolveCompanyForBranch(selectedBranchId.value)
  } finally {
    if (props.mode === DialogMode.ADD) {
      isLoading.value = false
    }
  }
})
</script>
