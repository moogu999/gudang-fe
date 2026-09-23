<template>
  <Toast position="top-center" :group="toastGroup" />
  <ConfirmDialog group="giroClearingConfirm" />

  <div v-if="isLoading" class="flex items-center justify-center py-8">
    <ProgressSpinner />
  </div>

  <Message v-else-if="notEditable" severity="error">{{
    t('giroClearings.messages.notEditable')
  }}</Message>

  <Form
    v-else
    v-slot="$form"
    ref="formRef"
    :initial-values="initialValues"
    :resolver="resolver"
    @submit="onFormSubmit"
  >
    <div v-if="mode !== DialogMode.ADD && currentStatus" class="mb-4 flex flex-wrap gap-2">
      <Tag
        :severity="statusSeverity(currentStatus)"
        :value="t(`giroClearings.status.${currentStatus}`)"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <!-- Left column: document header -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('giroClearings.sections.header') }}
        </h3>

        <div class="flex flex-col gap-1">
          <label for="no" class="text-sm font-semibold">{{ t('giroClearings.fields.no') }}</label>
          <div v-if="mode === DialogMode.ADD" class="mb-1 flex gap-2">
            <Button
              type="button"
              :label="t('giroClearings.codeMode.auto')"
              :severity="noMode === 'auto' ? 'primary' : 'secondary'"
              size="small"
              :disabled="!hasDefaultSeries || numberSeriesLoading"
              @click="noMode = 'auto'"
            />
            <Button
              type="button"
              :label="t('giroClearings.codeMode.manual')"
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
            <small class="text-surface-500">{{ t('giroClearings.codeMode.assignedOnSave') }}</small>
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

        <!-- Branch — only shown when the user has more than one assigned branch -->
        <div v-if="showBranchPicker" class="flex flex-col gap-1">
          <label for="branchId" class="text-sm font-semibold">{{
            t('giroClearings.fields.branch')
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

        <div class="flex flex-col gap-1">
          <label for="depositDate" class="text-sm font-semibold">{{
            t('giroClearings.fields.depositDate')
          }}</label>
          <DatePicker
            id="depositDate"
            name="depositDate"
            date-format="dd/mm/yy"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
            @update:model-value="onDepositDateUpdate"
          />
          <Message
            v-if="$form.depositDate?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.depositDate.error.message }}</Message
          >
        </div>
      </div>

      <!-- Right column: where it goes -->
      <div class="space-y-4">
        <h3 class="mb-2 text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('giroClearings.sections.bank') }}
        </h3>

        <!-- Active bank accounts of the batch's branch only -->
        <div class="flex flex-col gap-1">
          <label for="branchBankAccountId" class="text-sm font-semibold">{{
            t('giroClearings.fields.bankAccount')
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
          />
          <Message
            v-if="$form.branchBankAccountId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.branchBankAccountId.error.message }}</Message
          >
        </div>

        <div class="flex flex-col gap-1">
          <label for="remark" class="text-sm font-semibold">{{
            t('giroClearings.fields.remark')
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

    <!-- Draft: pick held giros -->
    <template v-if="mode !== DialogMode.VIEW">
      <GiroClearingPicker
        ref="pickerRef"
        v-model:selected="selected"
        :branch-id="selectedBranchId"
        :deposit-date="depositDate"
      />
      <Message
        v-if="earlyCount > 0"
        severity="warn"
        variant="simple"
        class="mt-3"
        data-testid="early-warning"
      >
        {{ t('giroClearings.hints.earlyDeposit', { n: earlyCount }) }}
      </Message>
      <Message severity="secondary" variant="simple" class="mt-3">
        {{ t('giroClearings.hints.afterDeposit') }}
      </Message>
    </template>

    <!-- Deposited + write: record results -->
    <template v-else-if="canRecordResults">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h3 class="text-sm font-semibold text-stone-700 sm:text-base">
          {{ t('giroClearings.sections.results') }}
        </h3>
        <div class="flex flex-col gap-1">
          <label for="resultDate" class="text-sm font-semibold">{{
            t('giroClearings.fields.resultDate')
          }}</label>
          <DatePicker
            v-model="resultDate"
            input-id="resultDate"
            date-format="dd/mm/yy"
            :min-date="depositDate ?? undefined"
            class="w-48"
          />
        </div>
      </div>
      <GiroClearingResultsTable ref="resultsRef" v-model="resultRows" />
    </template>

    <!-- Everything else: read-only lines -->
    <template v-else>
      <h3 class="mb-3 text-sm font-semibold text-stone-700 sm:text-base">
        {{ t('giroClearings.sections.lines') }}
      </h3>
      <DataTable :value="savedLines" data-key="id" class="text-sm" responsive-layout="scroll">
        <Column :header="t('giroReceipts.fields.giroNo')">
          <template #body="{ data }">
            <div class="font-mono">{{ data.giroNo }}</div>
            <div class="text-xs text-stone-500">{{ data.issuingBank }}</div>
          </template>
        </Column>
        <Column :header="t('giroReceipts.fields.customer')">
          <template #body="{ data }">{{ data.customerName }}</template>
        </Column>
        <Column :header="t('giroReceipts.fields.dueDate')">
          <template #body="{ data }">{{ dayjs(data.dueDate).format(DateFormat.DATE) }}</template>
        </Column>
        <Column :header="t('giroReceipts.fields.amount')" class="text-right">
          <template #body="{ data }">{{ formatNumber(parseFloat(data.amount) || 0) }}</template>
        </Column>
        <Column :header="t('giroClearings.fields.result')">
          <template #body="{ data }">
            <div class="flex flex-col items-start gap-1">
              <GiroStatusTag :status="data.giroStatus" />
              <small v-if="data.resultDate" class="text-stone-500">{{
                dayjs(data.resultDate).format(DateFormat.DATE)
              }}</small>
              <small v-if="data.note" class="text-stone-500">{{ data.note }}</small>
            </div>
          </template>
        </Column>
      </DataTable>
    </template>

    <!-- Batch totals (VIEW, once deposited) -->
    <div
      v-if="mode === DialogMode.VIEW && savedTotals && currentStatus !== 'draft'"
      class="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-stone-200 p-4 sm:grid-cols-4"
      data-testid="batch-totals"
    >
      <div class="flex flex-col">
        <span class="text-xs text-stone-500">{{ t('giroClearings.fields.total') }}</span>
        <span class="font-semibold">{{ formatNumber(savedTotals.total) }}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs text-stone-500">{{ t('giroClearings.results.cleared') }}</span>
        <span class="font-semibold text-green-700">{{ formatNumber(savedTotals.cleared) }}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs text-stone-500">{{ t('giroClearings.results.rejected') }}</span>
        <span class="font-semibold text-red-600">{{ formatNumber(savedTotals.rejected) }}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs text-stone-500">{{ t('giroClearings.results.pending') }}</span>
        <span class="font-semibold">{{ savedTotals.pendingCount }}</span>
      </div>
      <div class="col-span-2 text-sm text-stone-600 sm:col-span-4" data-testid="bank-matched">
        {{
          t('giroClearings.fields.bankMatched', {
            matched: formatNumber(savedTotals.bankMatched),
            cleared: formatNumber(savedTotals.cleared),
          })
        }}
      </div>
    </div>

    <div class="mt-6 flex flex-wrap justify-end gap-2">
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('cancel')" />
      <Button
        v-if="mode === DialogMode.VIEW && canWrite && currentStatus === 'draft'"
        type="button"
        :label="t('giroClearings.actions.editGiroClearing')"
        icon="pi pi-pencil"
        @click="router.push(`/giro-clearings/${giroClearingId}/edit`)"
      />
      <Button
        v-if="canRecordResults"
        type="button"
        data-testid="submit-results"
        :label="t('giroClearings.actions.submitResults')"
        :loading="isSaving"
        :disabled="chosenResultCount === 0"
        @click="onSubmitResults"
      />
      <template v-if="mode !== DialogMode.VIEW">
        <Button
          type="submit"
          severity="secondary"
          :label="t('giroClearings.actions.saveDraft')"
          :loading="isSaving"
          @click="chosenStatus = 'draft'"
        />
        <Button
          type="submit"
          data-testid="deposit"
          :label="t('giroClearings.actions.deposit', { n: selected.length })"
          :loading="isSaving"
          :disabled="selected.length === 0"
          @click="chosenStatus = 'deposited'"
        />
      </template>
    </div>
  </Form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import Form from '@primevue/forms/form'
import type { FormSubmitEvent } from '@primevue/forms'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import GiroStatusTag from '@/views/giro-receipts/components/GiroStatusTag.vue'
import GiroClearingPicker from './components/GiroClearingPicker.vue'
import GiroClearingResultsTable from './components/GiroClearingResultsTable.vue'
import { parseDepositQuery } from '@/views/giro-register/giroRegister'
import {
  buildResultsPayload,
  fromClearingLine,
  fromRegisterRow,
  isNotYetDue,
  resultTotals,
  selectionTotal,
  toResultRow,
  type GiroPick,
  type ResultRow,
} from './giroClearingLines'
import DialogMode from '@/constants/dialogMode'
import DateFormat from '@/constants/dateFormat'
import FilterOperator from '@/constants/filterOperator'
import {
  GiroClearingsService,
  GirosService,
  BranchBankAccountsService,
  BranchesService,
  GenericQueryBuilder,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import { ApiError } from '@/types/api.type'
import type { Branch, BranchBankAccount } from '@/types'
import type {
  GiroClearingStatus,
  GiroClearingLineResponse,
  GiroClearingResponse,
  CreateGiroClearingRequest,
} from '@/types/giroClearing.type'
import { useAuthStore } from '@/stores/auth'
import { useNumberSeries, usePermissions } from '@/composables'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { canWrite } = usePermissions('/giro-clearings')

const {
  codeMode: noMode,
  previewCode,
  loading: numberSeriesLoading,
  hasDefaultSeries,
} = useNumberSeries('giro_clearings')

const toastGroup = 'giroClearingForm'

interface Props {
  mode: DialogMode.ADD | DialogMode.VIEW | DialogMode.EDIT
  giroClearingId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  submitted: [clearing: GiroClearingResponse]
}>()

const chosenStatus = ref<'draft' | 'deposited'>('draft')
const currentStatus = ref<GiroClearingStatus | undefined>()
const notEditable = ref(false)

function statusSeverity(status: GiroClearingStatus) {
  if (status === 'completed') return 'success'
  if (status === 'deposited') return 'info'
  return 'secondary'
}

const isLoading = ref(false)
const isSaving = ref(false)

const formRef = ref()
const pickerRef = ref<InstanceType<typeof GiroClearingPicker> | null>(null)
const resultsRef = ref<InstanceType<typeof GiroClearingResultsTable> | null>(null)

// ---------------------------------------------------------------------------
// Header: branch, bank account, deposit date
// ---------------------------------------------------------------------------

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

function onBranchIdUpdate(value: unknown) {
  const next = typeof value === 'number' ? value : undefined
  if (next !== selectedBranchId.value && props.mode === DialogMode.ADD) {
    // Assumption 4: a batch is single-branch — its account and its giros can't survive a switch.
    if (formRef.value?.states?.branchBankAccountId) {
      formRef.value.states.branchBankAccountId.value = undefined
    }
    selected.value = []
  }
  selectedBranchId.value = next
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

const depositDate = ref<Date | null>(props.mode === DialogMode.ADD ? new Date() : null)

function onDepositDateUpdate(value: unknown) {
  depositDate.value = value instanceof Date ? value : null
}

// ---------------------------------------------------------------------------
// Draft: picked giros
// ---------------------------------------------------------------------------

const selected = ref<GiroPick[]>([])
const earlyCount = computed(
  () => selected.value.filter((p) => isNotYetDue(p.dueDate, depositDate.value)).length,
)

// ---------------------------------------------------------------------------
// Deposited: saved lines + results
// ---------------------------------------------------------------------------

const savedLines = ref<GiroClearingLineResponse[]>([])
const savedTotals = ref<{
  total: number
  cleared: number
  rejected: number
  bankMatched: number
  pendingCount: number
} | null>(null)

const canRecordResults = computed(
  () => props.mode === DialogMode.VIEW && canWrite.value && currentStatus.value === 'deposited',
)
const resultRows = ref<ResultRow[]>([])
const resultDate = ref<Date | null>(new Date())
const chosenResultCount = computed(
  () => buildResultsPayload(resultRows.value, resultDate.value ?? new Date()).lines.length,
)

function onSubmitResults() {
  if (!props.giroClearingId) return
  if (!resultDate.value) return failValidation('giroClearings.validation.resultDateRequired')
  if (depositDate.value && dayjs(resultDate.value).isBefore(depositDate.value, 'day')) {
    return failValidation('giroClearings.validation.resultDateBeforeDeposit')
  }
  if (resultsRef.value && !resultsRef.value.validate()) {
    return failValidation('giroClearings.validation.rejectionNoteRequired')
  }

  const payload = buildResultsPayload(resultRows.value, resultDate.value)
  if (payload.lines.length === 0) return

  // D9: results are final, so repeat what's about to be recorded before sending it.
  const totals = resultTotals(resultRows.value)
  const id = props.giroClearingId
  confirm.require({
    group: 'giroClearingConfirm',
    header: t('giroClearings.confirm.header'),
    message: t('giroClearings.hints.confirmResults', {
      clearedCount: totals.cleared.count,
      clearedAmount: formatNumber(totals.cleared.amount),
      rejectedCount: totals.rejected.count,
      rejectedAmount: formatNumber(totals.rejected.amount),
    }),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('giroClearings.actions.submitResults') },
    accept: async () => {
      isSaving.value = true
      try {
        await GiroClearingsService.recordResults(id, payload)
        toast.add(commonSuccessToast(t('giroClearings.messages.resultsRecorded'), toastGroup))
        await loadClearing()
      } catch (e) {
        toast.add(commonErrorToast(e, toastGroup))
      } finally {
        isSaving.value = false
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const initialValues = reactive({
  no: '',
  branchId: undefined as number | undefined,
  branchBankAccountId: undefined as number | undefined,
  depositDate: (props.mode === DialogMode.ADD ? new Date() : undefined) as Date | undefined,
  remark: '',
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      no:
        props.mode === DialogMode.ADD && noMode.value === 'auto'
          ? z.string().optional()
          : z.string().min(1, t('giroClearings.validation.noRequired')),
      branchBankAccountId: z.number({
        message: t('giroClearings.validation.bankAccountRequired'),
      }),
      depositDate: z.date({ message: t('giroClearings.validation.depositDateRequired') }),
      remark: z.string().optional().nullable(),
      branchId: showBranchPicker.value
        ? z.number({ message: t('giroClearings.validation.branchRequired') })
        : z.number().optional(),
    }),
  ),
)

const pendingRequest = ref<CreateGiroClearingRequest | null>(null)

function failValidation(key: string) {
  toast.add(commonErrorToast(new Error(t(key)), toastGroup))
}

async function doSubmit() {
  if (!pendingRequest.value) return
  isSaving.value = true
  try {
    let saved: GiroClearingResponse
    if (props.mode === DialogMode.EDIT && props.giroClearingId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { no, branchId, ...req } = pendingRequest.value
      saved = await GiroClearingsService.update(props.giroClearingId, req)
      toast.add(commonSuccessToast(t('giroClearings.messages.updated'), toastGroup))
    } else {
      saved = await GiroClearingsService.create(pendingRequest.value)
      toast.add(commonSuccessToast(t('giroClearings.messages.created'), toastGroup))
    }
    // A draft save keeps the user on the edit page — refresh the server-computed state.
    if (props.mode === DialogMode.EDIT && saved.status === 'draft') await loadClearing()
    emit('submitted', saved)
  } catch (e) {
    // ErrGiroNotHeld: another batch deposited one of the picks since this page loaded.
    if (e instanceof ApiError && e.status === 409 && pickerRef.value) {
      const dropped = await pickerRef.value.reloadAndPrune()
      if (dropped > 0) {
        toast.add(
          commonErrorToast(
            new Error(t('giroClearings.errors.giroNotHeld', { n: dropped })),
            toastGroup,
          ),
        )
        return
      }
    }
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return

  const depositing = chosenStatus.value === 'deposited'
  if (depositing && selected.value.length === 0) {
    return failValidation('giroClearings.validation.noneSelected')
  }

  let no: string | null = null
  if (props.mode !== DialogMode.ADD || noMode.value === 'manual') {
    no = (event.states.no.value as string) || null
  }

  pendingRequest.value = {
    no,
    branchId: showBranchPicker.value ? (event.states.branchId.value ?? null) : null,
    branchBankAccountId: event.states.branchBankAccountId.value as number,
    // dayjs, never toISOString() — UTC+7 lands a day early.
    depositDate: dayjs(event.states.depositDate.value as Date).format('YYYY-MM-DD'),
    remark: (event.states.remark?.value as string | undefined)?.trim() || null,
    status: chosenStatus.value,
    giroIds: selected.value.map((p) => p.giroId),
  }

  if (depositing) {
    const total = selectionTotal(selected.value)
    confirm.require({
      group: 'giroClearingConfirm',
      header: t('giroClearings.confirm.header'),
      message: t('giroClearings.confirm.deposit', {
        n: total.count,
        amount: formatNumber(total.amount),
      }),
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('giroClearings.actions.deposit', { n: total.count }) },
      accept: doSubmit,
    })
  } else {
    await doSubmit()
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function loadClearing() {
  if (!props.giroClearingId) return

  isLoading.value = true
  try {
    const clearing = await GiroClearingsService.get(props.giroClearingId)

    if (props.mode === DialogMode.EDIT && clearing.status !== 'draft') {
      notEditable.value = true
      return
    }

    const deposit = dayjs(clearing.depositDate.slice(0, 10)).toDate()
    initialValues.no = clearing.no
    initialValues.branchId = clearing.branchId
    initialValues.branchBankAccountId = clearing.branchBankAccountId
    initialValues.depositDate = deposit
    initialValues.remark = clearing.remark ?? ''

    currentStatus.value = clearing.status
    selectedBranchId.value = clearing.branchId
    depositDate.value = deposit
    initialBankAccount.value = {
      id: clearing.branchBankAccountId,
      bankName: clearing.bankAccountLabel ?? '',
      accountNumber: '',
    } as BranchBankAccount

    savedLines.value = clearing.lines
    selected.value = clearing.lines.map(fromClearingLine)
    resultRows.value = clearing.lines.map(toResultRow)
    // A result can't predate the deposit; default to today, or the deposit day if that's later.
    resultDate.value = dayjs().isBefore(deposit, 'day') ? deposit : new Date()
    savedTotals.value = {
      total: parseFloat(clearing.totalAmount) || 0,
      cleared: parseFloat(clearing.clearedAmount) || 0,
      rejected: parseFloat(clearing.rejectedAmount) || 0,
      bankMatched: parseFloat(clearing.bankMatchedAmount) || 0,
      pendingCount: clearing.pendingCount,
    }

    if (showBranchPicker.value) {
      const query = new GenericQueryBuilder()
        .withFilter('id', FilterOperator.EQUAL, clearing.branchId)
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
  if (props.mode !== DialogMode.ADD && props.giroClearingId) {
    await loadClearing()
    return
  }

  isLoading.value = true
  try {
    // "Deposit selected" on the Register hands over ?branchId=&giroIds=. The batch takes that
    // branch (when the user holds it) instead of their primary one.
    const handOff = parseDepositQuery(route.query)
    const handOffBranch =
      handOff.branchId && authStore.branchIds.includes(handOff.branchId) ? handOff.branchId : null

    if (showBranchPicker.value && authStore.primaryBranchId) {
      const branches = await loadUserBranches()
      const defaultBranch = branches.find(
        (b) => b.id === (handOffBranch ?? authStore.primaryBranchId),
      )
      if (defaultBranch) {
        initialValues.branchId = defaultBranch.id
        initialBranch.value = defaultBranch
        selectedBranchId.value = defaultBranch.id
      }
    } else {
      selectedBranchId.value = authStore.branchIds[0]
    }

    if (handOff.giroIds.length > 0 && selectedBranchId.value) {
      await preselectGiros(handOff.giroIds, selectedBranchId.value)
    }
  } finally {
    isLoading.value = false
  }
})

/**
 * Pick the handed-over giros from the branch's held giros. Any that is no longer held (deposited
 * elsewhere since the Register loaded) or belongs to another branch is dropped with a warning.
 */
async function preselectGiros(ids: number[], branchId: number) {
  try {
    const held = await GirosService.register({ bucket: 'held', branchId, limit: 500 })
    const byId = new Map(held.data.map((row) => [row.id, row]))
    selected.value = ids.filter((id) => byId.has(id)).map((id) => fromRegisterRow(byId.get(id)!))
    const dropped = ids.length - selected.value.length
    if (dropped > 0) {
      toast.add({
        severity: 'warn',
        summary: t('giroClearings.messages.preselectDroppedTitle'),
        detail: t('giroClearings.messages.preselectDropped', { n: dropped }),
        group: toastGroup,
        life: 6000,
      })
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  }
}
</script>
