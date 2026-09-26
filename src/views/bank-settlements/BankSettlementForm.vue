<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="bankSettlementConfirm" />

  <div v-if="isLoading" class="flex items-center justify-center py-8">
    <ProgressSpinner />
  </div>

  <Message v-else-if="notEditable" severity="error">{{
    t('bankSettlements.messages.notEditable')
  }}</Message>

  <Form
    v-else
    v-slot="$form"
    ref="formRef"
    :initial-values="initialValues"
    :resolver="resolver"
    @submit="onFormSubmit"
  >
    <!-- Status + source tags (VIEW / EDIT modes) -->
    <div
      v-if="mode !== DialogMode.ADD && currentStatus"
      class="mb-4 flex flex-wrap items-center gap-2"
    >
      <Tag
        :severity="statusSeverity(currentStatus)"
        :value="t(`bankSettlements.status.${currentStatus}`)"
      />
      <Tag
        severity="secondary"
        :value="
          source === 'import'
            ? t('bankSettlements.labels.sourceImport')
            : t('bankSettlements.labels.sourceManual')
        "
      />
      <RouterLink
        v-if="splitFrom"
        :to="`/bank-settlements/${splitFrom.id}`"
        class="text-primary text-sm underline"
        >{{ t('bankSettlements.labels.splitFrom', { no: splitFrom.no }) }}</RouterLink
      >
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left column: document header -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('bankSettlements.sections.header') }}
        </h3>

        <!-- Document number -->
        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('bankSettlements.fields.no') }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('bankSettlements.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('bankSettlements.codeMode.manual')"
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
              t('bankSettlements.codeMode.assignedOnSave')
            }}</small>
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

        <!-- Legal entity — resolved from the document's branch, never editable -->
        <div class="flex flex-col gap-1">
          <label for="company" class="text-sm font-semibold">{{
            t('bankSettlements.fields.company')
          }}</label>
          <InputText id="company" :value="companyName" disabled class="w-full" />
          <small v-if="!companyName" class="text-surface-500">{{
            t('bankSettlements.labels.companyUnresolved')
          }}</small>
        </div>

        <!-- Branch — only shown when the user has more than one assigned branch -->
        <div v-if="showBranchPicker" class="flex flex-col gap-1">
          <label for="branchId" class="text-sm font-semibold">{{
            t('bankSettlements.fields.branch')
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

      <!-- Right column: which account, which statement -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('bankSettlements.fields.bankAccount') }}
        </h3>

        <!-- Bank account: active accounts of the settlement's branch only -->
        <div class="flex flex-col gap-1">
          <label for="branchBankAccountId" class="text-sm font-semibold">{{
            t('bankSettlements.fields.bankAccount')
          }}</label>
          <InfiniteSelect
            id="branchBankAccountId"
            name="branchBankAccountId"
            :option-label="bankAccountLabel"
            option-value="id"
            :fetch-fn="(q) => BranchBankAccountsService.list(q)"
            :custom-filters="bankAccountFilters"
            :initial-option="initialBankAccount"
            :disabled="mode === DialogMode.VIEW || !selectedBranchId"
            sort-by="bank_name"
            sort-operator="asc"
            class="w-full"
            @update:model-value="onBankAccountUpdate"
          />
          <Message
            v-if="$form.branchBankAccountId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.branchBankAccountId.error.message }}</Message
          >
        </div>

        <!-- Period -->
        <div class="flex flex-col gap-1">
          <label for="period" class="text-sm font-semibold">{{
            t('bankSettlements.fields.period')
          }}</label>
          <DatePicker
            id="period"
            :model-value="periodRange"
            selection-mode="range"
            date-format="dd/mm/yy"
            :manual-input="false"
            show-button-bar
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            @update:model-value="onPeriodUpdate"
          />
          <Message v-if="periodError" severity="error" size="small" variant="simple">{{
            t('bankSettlements.validation.periodRequired')
          }}</Message>
        </div>

        <div class="flex flex-col gap-1">
          <label for="remark" class="text-sm font-semibold">{{
            t('bankSettlements.fields.remark')
          }}</label>
          <Textarea
            id="remark"
            name="remark"
            rows="3"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <Divider class="my-6" />

    <div class="mb-6">
      <BankSettlementMutationTable
        ref="tableRef"
        v-model="rows"
        :readonly="mode === DialogMode.VIEW"
        :period="period"
        :candidates="giroCandidates"
      />
      <Message
        v-for="o in overMatched"
        :key="o.id"
        severity="error"
        variant="simple"
        class="mt-2"
        data-testid="over-matched"
      >
        {{
          t('bankSettlements.tagMode.overMatched', {
            no: o.no,
            linked: formatNumber(o.linked),
            unmatched: formatNumber(o.unmatched),
          })
        }}
      </Message>
    </div>

    <BankSettlementSummary
      :total="liveTotals.total"
      :tagged="liveTotals.tagged"
      :untagged="liveTotals.untagged"
      :readonly="mode === DialogMode.VIEW"
      :saved-total="savedTotals?.total"
      :saved-tagged="savedTotals?.tagged"
      :saved-untagged="savedTotals?.untagged"
    />

    <div class="mt-6 flex justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <Button
        v-if="mode === DialogMode.VIEW && canWrite && currentStatus === 'draft'"
        :label="t('bankSettlements.actions.editBankSettlement')"
        icon="pi pi-pencil"
        @click="router.push(`/bank-settlements/${bankSettlementId}/edit`)"
      />
      <template v-if="mode !== DialogMode.VIEW">
        <Button
          type="submit"
          severity="secondary"
          :label="t('bankSettlements.actions.saveAsDraft')"
          :loading="isSaving"
          @click="chosenStatus = 'draft'"
        />
        <!-- Nothing tagged is a 400 from the API, so don't let the user get there. -->
        <span
          v-tooltip.top="taggedCount === 0 ? t('bankSettlements.labels.submitDisabledHint') : null"
        >
          <Button
            type="submit"
            data-testid="submit"
            :label="t('bankSettlements.actions.submit')"
            :loading="isSaving"
            :disabled="taggedCount === 0 || overMatched.length > 0"
            @click="chosenStatus = 'completed'"
          />
        </span>
      </template>
    </div>
  </Form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
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
import ConfirmDialog from 'primevue/confirmdialog'
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import BankSettlementMutationTable from './components/BankSettlementMutationTable.vue'
import BankSettlementSummary from './components/BankSettlementSummary.vue'
import {
  batchOverMatch,
  partition,
  totals,
  type MutationRow,
  type Period,
} from './bankSettlementLines'
import DialogMode from '@/constants/dialogMode'
import FilterOperator from '@/constants/filterOperator'
import {
  BankSettlementsService,
  BranchBankAccountsService,
  BranchesService,
  CompaniesService,
  CompanyBranchesService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import type { Branch, BranchBankAccount } from '@/types'
import type {
  BankSettlementStatus,
  BankSettlementSource,
  BankSettlementLineRequest,
  BankSettlementResponse,
  CreateBankSettlementRequest,
  GiroClearingCandidate,
} from '@/types/bankSettlement.type'
import { useAuthStore } from '@/stores/auth'
import { useNumberSeries, usePermissions } from '@/composables'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const router = useRouter()
const authStore = useAuthStore()
const { canWrite } = usePermissions('/bank-settlements')

const {
  codeMode: noMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('bank_settlements')

const toastGroup = 'bankSettlementForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  bankSettlementId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: [settlement: BankSettlementResponse]
}>()

// Status
const chosenStatus = ref<BankSettlementStatus>('draft')
const currentStatus = ref<BankSettlementStatus | undefined>()
const source = ref<BankSettlementSource>('manual')
const splitFrom = ref<{ id: number; no: string } | null>(null)
const notEditable = ref(false)

function statusSeverity(status: BankSettlementStatus) {
  return status === 'completed' ? 'success' : 'secondary'
}

const isLoading = ref(false)
const isSaving = ref(false)

// The Form instance — used to clear the bank account when the branch changes.
const formRef = ref()
const tableRef = ref<InstanceType<typeof BankSettlementMutationTable> | null>(null)

// ---------------------------------------------------------------------------
// Header: company, branch, bank account, period
// ---------------------------------------------------------------------------

const companyName = ref('')

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

async function fetchUserBranches(query: string) {
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
 * Resolve the legal entity from a branch. A branch mapping to no company is a hard 400
 * on save, so surface the blank here rather than at submit.
 */
async function resolveCompanyForBranch(branchId: number | undefined) {
  companyName.value = ''
  if (!branchId) return
  try {
    const mappingQuery = new GenericQueryBuilder()
      .withFilter('branchId', FilterOperator.EQUAL, branchId)
      .build()
    const mappings = await CompanyBranchesService.list(mappingQuery)
    const companyId = mappings.data[0]?.companyId
    if (!companyId) return
    const company = await CompaniesService.get(companyId)
    companyName.value = company.name
  } catch {
    // Leave the field blank — the hint under it explains the unmapped branch.
  }
}

async function onBranchIdUpdate(value: unknown) {
  const next = typeof value === 'number' ? value : undefined
  if (next !== selectedBranchId.value && props.mode === DialogMode.ADD) {
    // The account must belong to the settlement's branch — a stale pick can't survive.
    if (formRef.value?.states?.branchBankAccountId) {
      formRef.value.states.branchBankAccountId.value = undefined
    }
    selectedBankAccountId.value = undefined
  }
  selectedBranchId.value = next
  await resolveCompanyForBranch(next)
}

const initialBankAccount = ref<BranchBankAccount | undefined>()

function bankAccountLabel(a: BranchBankAccount): string {
  return a.accountNumber ? `${a.bankName} - ${a.accountNumber}` : a.bankName
}

const bankAccountFilters = computed(() => [
  {
    filterBy: 'branch_id',
    filterOperator: FilterOperator.EQUAL,
    filterValue: selectedBranchId.value ?? 0,
  },
  { filterBy: 'is_active', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
])

// The header period as a picked range. Null until both ends are chosen; every row's
// date is checked against it, so narrowing it re-validates the table at once.
const periodRange = ref<Date[]>([])
const period = computed<Period | null>(() =>
  periodRange.value[0] && periodRange.value[1]
    ? [periodRange.value[0], periodRange.value[1]]
    : null,
)

// Not bound through the Form (`name`): PrimeVue's range DatePicker reads its own
// `modelValue` prop when rendering a selected day, which a Form-managed value leaves
// undefined, so picking a range crashes the overlay. The period is validated on submit.
const periodError = ref(false)

function onPeriodUpdate(value: unknown) {
  periodRange.value = Array.isArray(value) ? (value.filter(Boolean) as Date[]) : []
  if (period.value) periodError.value = false
}

// ---------------------------------------------------------------------------
// Giro clearing batches a line can be tagged to
// ---------------------------------------------------------------------------

const selectedBankAccountId = ref<number | undefined>()
const giroCandidates = ref<GiroClearingCandidate[]>([])

function onBankAccountUpdate(value: unknown) {
  selectedBankAccountId.value = typeof value === 'number' ? value : undefined
}

/** The period ±7 days, so a giro that cleared just outside the statement still shows. */
async function loadGiroCandidates() {
  // The endpoint needs BANK_SETTLEMENT_WRITE and a read-only view has nothing to tag.
  if (props.mode === DialogMode.VIEW || !selectedBankAccountId.value) {
    giroCandidates.value = []
    return
  }
  try {
    giroCandidates.value = await BankSettlementsService.giroClearingCandidates({
      branchBankAccountId: selectedBankAccountId.value,
      from: period.value
        ? dayjs(period.value[0]).subtract(7, 'day').format('YYYY-MM-DD')
        : undefined,
      to: period.value ? dayjs(period.value[1]).add(7, 'day').format('YYYY-MM-DD') : undefined,
    })
  } catch (e) {
    giroCandidates.value = []
    toast.add(commonErrorToast(e, toastGroup))
  }
}

watch(
  () => [selectedBankAccountId.value, period.value?.[0]?.getTime(), period.value?.[1]?.getTime()],
  loadGiroCandidates,
)

const overMatched = computed(() => batchOverMatch(rows.value, giroCandidates.value))

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ---------------------------------------------------------------------------
// Lines + summary
// ---------------------------------------------------------------------------

const rows = ref<MutationRow[]>([])
const liveTotals = computed(() => totals(rows.value))
const taggedCount = computed(() => partition(rows.value).tagged.length)
const savedTotals = ref<{ total: number; tagged: number; untagged: number } | undefined>()

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const initialValues = reactive({
  no: '',
  branchId: undefined as number | undefined,
  branchBankAccountId: undefined as number | undefined,
  remark: '',
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        props.mode === DialogMode.ADD && noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('bankSettlements.validation.noRequired')),
      branchBankAccountId: z.number({
        message: t('bankSettlements.validation.bankAccountRequired'),
      }),
      remark: z.string().optional().nullable(),
      branchId: showBranchPicker.value
        ? z.number({ message: t('bankSettlements.validation.branchRequired') })
        : z.number().optional(),
    }),
  ),
)

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

const pendingRequest = ref<CreateBankSettlementRequest | null>(null)

function failValidation(key: string) {
  toast.add(commonErrorToast(new Error(t(key)), toastGroup))
}

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    let saved: BankSettlementResponse
    if (props.mode === DialogMode.EDIT && props.bankSettlementId) {
      // Number, branch and company are stamped at creation and ignored on update.
      const req = pendingRequest.value
      saved = await BankSettlementsService.update(props.bankSettlementId, {
        branchBankAccountId: req.branchBankAccountId,
        periodStart: req.periodStart,
        periodEnd: req.periodEnd,
        status: req.status,
        remark: req.remark,
        lines: req.lines,
      })
      toast.add(commonSuccessToast(t('bankSettlements.messages.updated'), toastGroup))
    } else {
      saved = await BankSettlementsService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('bankSettlements.messages.created'), toastGroup))
    }
    // A draft save keeps the user on the edit page — refresh the server-computed state.
    if (props.mode === DialogMode.EDIT && saved.status === 'draft') await loadBankSettlement()
    emit('submitted', saved)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  // The period lives outside the Form (see onPeriodUpdate), so check it alongside.
  periodError.value = !period.value
  if (!event.valid || !period.value) return

  if (rows.value.length === 0) return failValidation('bankSettlements.validation.noLines')

  if (tableRef.value && !tableRef.value.validate()) {
    return failValidation('bankSettlements.validation.linesInvalid')
  }

  const { tagged, untagged } = partition(rows.value)
  if (chosenStatus.value === 'completed' && tagged.length === 0) {
    return failValidation('bankSettlements.validation.noTaggedLines')
  }
  // The server refuses it too, but only on completion; a draft may still be over.
  if (chosenStatus.value === 'completed' && overMatched.value.length > 0) {
    return failValidation('bankSettlements.validation.giroOverMatched')
  }

  // Auto mode sends no number — the backend assigns one from the series on save.
  let no: string | null = null
  if (props.mode !== DialogMode.ADD || noMode.value === 'manual') {
    no = (event.states.no.value as string) || null
  }

  const [start, end] = period.value

  const lines: BankSettlementLineRequest[] = rows.value.map((r) => ({
    // dayjs, never toISOString().split('T')[0] — the latter converts to UTC and
    // lands a day early at UTC+7.
    mutationDate: dayjs(r.mutationDate as Date).format('YYYY-MM-DD'),
    description: r.description.trim(),
    amount: (r.amount as number).toFixed(2),
    customerId: r.customerId ?? null,
    giroClearingId: r.giroClearingId ?? null,
    note: r.note?.trim() || null,
  }))

  pendingRequest.value = {
    no,
    branchId: showBranchPicker.value ? (event.states.branchId.value ?? null) : null,
    branchBankAccountId: event.states.branchBankAccountId.value as number,
    periodStart: dayjs(start).format('YYYY-MM-DD'),
    periodEnd: dayjs(end).format('YYYY-MM-DD'),
    status: chosenStatus.value,
    remark: (event.states.remark?.value as string | undefined)?.trim() || null,
    lines,
  }

  if (chosenStatus.value === 'completed') {
    confirm.require({
      group: 'bankSettlementConfirm',
      header: t('bankSettlements.confirm.header'),
      message:
        untagged.length > 0
          ? t('bankSettlements.confirm.messageSplit', { count: untagged.length })
          : t('bankSettlements.confirm.messageComplete'),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('bankSettlements.actions.submit') },
      accept: doSubmit,
    })
  } else {
    await doSubmit()
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function loadBankSettlement() {
  if (!props.bankSettlementId) return

  isLoading.value = true
  try {
    const settlement = await BankSettlementsService.get(props.bankSettlementId)

    // Completed is terminal. The list never offers Edit, but a typed URL can get here.
    if (props.mode === DialogMode.EDIT && settlement.status === 'completed') {
      notEditable.value = true
      return
    }

    const start = dayjs(settlement.periodStart.slice(0, 10)).toDate()
    const end = dayjs(settlement.periodEnd.slice(0, 10)).toDate()

    initialValues.no = settlement.no
    initialValues.branchId = settlement.branchId
    initialValues.branchBankAccountId = settlement.branchBankAccountId
    initialValues.remark = settlement.remark ?? ''

    periodRange.value = [start, end]
    currentStatus.value = settlement.status
    source.value = settlement.source
    selectedBranchId.value = settlement.branchId
    companyName.value = settlement.companyName ?? ''
    splitFrom.value =
      settlement.splitFromId && settlement.splitFromNo
        ? { id: settlement.splitFromId, no: settlement.splitFromNo }
        : null
    selectedBankAccountId.value = settlement.branchBankAccountId
    initialBankAccount.value = {
      id: settlement.branchBankAccountId,
      bankName: settlement.branchBankAccountLabel ?? '',
      accountNumber: '',
    } as BranchBankAccount

    savedTotals.value = {
      total: parseFloat(settlement.totalCreditAmount) || 0,
      tagged: parseFloat(settlement.taggedAmount) || 0,
      untagged: parseFloat(settlement.untaggedAmount) || 0,
    }

    rows.value = settlement.lines.map((l) => ({
      _key: crypto.randomUUID(),
      mutationDate: dayjs(l.mutationDate.slice(0, 10)).toDate(),
      description: l.description,
      amount: parseFloat(l.amount) || 0,
      customerId: l.customerId ?? undefined,
      customer: l.customerId
        ? { id: l.customerId, name: l.customerName ?? '', code: l.customerCode ?? undefined }
        : undefined,
      giroClearingId: l.giroClearingId ?? undefined,
      giroClearingNo: l.giroClearingNo ?? undefined,
      note: l.note ?? null,
    }))

    if (showBranchPicker.value) {
      const query = new GenericQueryBuilder()
        .withFilter('id', FilterOperator.EQUAL, settlement.branchId)
        .build()
      const branchResult = await BranchesService.list(query)
      initialBranch.value = branchResult.data[0]
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

onBeforeMount(async () => {
  if (props.mode === DialogMode.ADD) {
    isLoading.value = true
  }

  try {
    if (
      (props.mode === DialogMode.VIEW || props.mode === DialogMode.EDIT) &&
      props.bankSettlementId
    ) {
      await loadBankSettlement()
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
