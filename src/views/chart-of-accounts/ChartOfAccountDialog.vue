<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      ref="coaFormRef"
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <Message
        v-if="mode !== DialogMode.ADD && account?.inUse"
        severity="info"
        :closable="false"
        class="mb-4 text-sm"
      >
        {{ t('chartOfAccounts.warnings.accountInUse') }}
      </Message>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="parentId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('chartOfAccounts.fields.parent')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Select
            id="parentId"
            name="parentId"
            :options="parentOptions"
            option-label="label"
            option-value="id"
            show-clear
            class="w-full"
            :disabled="mode === DialogMode.VIEW"
            :placeholder="t('chartOfAccounts.labels.noParent')"
            @update:model-value="onParentIdUpdate"
          />
          <small class="text-surface-500">{{
            t('chartOfAccounts.labels.level', { level: newAccountLevel })
          }}</small>
          <Message
            v-if="selectedParent && !selectedParent.isHeader"
            severity="warn"
            :closable="false"
            class="text-sm"
          >
            {{ t('chartOfAccounts.warnings.detailParent') }}
          </Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="code" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('chartOfAccounts.fields.code')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="code"
            name="code"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW || fieldsFrozen"
            class="w-full font-mono"
          />
          <small class="text-surface-500">{{ t('chartOfAccounts.helpers.uniqueCode') }}</small>
          <Message v-if="$form.code?.invalid" severity="error" size="small" variant="simple">{{
            $form.code.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="name" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('chartOfAccounts.fields.name')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="name"
            name="name"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">{{
            $form.name.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="accountTypeId" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('chartOfAccounts.fields.accountType')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="accountTypeId"
            name="accountTypeId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => AccountTypesService.list(query)"
            :disabled="mode === DialogMode.VIEW || fieldsFrozen"
            :placeholder="t('chartOfAccounts.labels.selectAccountType')"
            :initial-option="initialAccountType"
            sort-by="sortOrder"
            sort-operator="asc"
            @select-option="(opt) => onAccountTypeSelect(opt as AccountType)"
          />
          <Message
            v-if="$form.accountTypeId?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.accountTypeId.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="normalBalance" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('chartOfAccounts.fields.normalBalance')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <SelectButton
            :model-value="normalBalance"
            :options="normalBalanceOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :disabled="mode === DialogMode.VIEW || fieldsFrozen"
            @update:model-value="onNormalBalanceUpdate"
          />
          <small class="text-surface-500">{{
            t('chartOfAccounts.helpers.autoNormalBalance')
          }}</small>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="isHeader" class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('chartOfAccounts.fields.nature')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <SelectButton
            name="isHeader"
            :options="natureOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :disabled="mode === DialogMode.VIEW"
            @update:model-value="onIsHeaderUpdate"
          />
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-32">{{
          t('chartOfAccounts.fields.controlAccount')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-2">
          <SelectButton
            :model-value="hasControlAccount"
            :options="yesNoOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :disabled="mode === DialogMode.VIEW || isHeader"
            @update:model-value="onHasControlAccountUpdate"
          />
          <InfiniteSelect
            v-if="hasControlAccount"
            id="controlAccountTypeId"
            name="controlAccountTypeId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => ControlAccountTypesService.list(query)"
            :disabled="mode === DialogMode.VIEW || isHeader"
            :placeholder="t('chartOfAccounts.labels.selectControlAccountType')"
            :initial-option="initialControlAccountType"
            sort-by="sortOrder"
            sort-operator="asc"
          />
          <small class="text-surface-500">{{ t('chartOfAccounts.helpers.controlAccount') }}</small>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div class="w-full md:w-32"></div>
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <ToggleSwitch
              id="isRetainedEarnings"
              name="isRetainedEarnings"
              :disabled="mode === DialogMode.VIEW"
            />
            <label for="isRetainedEarnings" class="text-sm font-semibold sm:text-base">{{
              t('chartOfAccounts.fields.retainedEarnings')
            }}</label>
          </div>
          <small class="text-surface-500">{{
            t('chartOfAccounts.helpers.retainedEarnings')
          }}</small>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div class="w-full md:w-32"></div>
        <div class="flex items-center gap-2">
          <ToggleSwitch id="isActive" name="isActive" :disabled="mode === DialogMode.VIEW" />
          <label for="isActive" class="text-sm font-semibold sm:text-base">{{
            $form.isActive?.value ? t('common.labels.active') : t('common.labels.inactive')
          }}</label>
        </div>
      </div>

      <div class="flex justify-end gap-2" v-if="mode !== DialogMode.VIEW">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="handleClose"
        ></Button>
        <Button
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
          :disabled="isLoading"
        ></Button>
      </div>
      <div class="flex justify-end gap-2" v-else>
        <Button type="button" :label="t('common.actions.close')" @click="handleClose"></Button>
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { ChartOfAccountsService, AccountTypesService, ControlAccountTypesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import DialogMode from '@/constants/dialogMode'
import type {
  ChartOfAccount,
  AccountType,
  AccountTypeRef,
  ControlAccountTypeRef,
  NormalBalance,
} from '@/types'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'

const { t } = useI18n()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  companyId: {
    type: Number,
    required: true,
  },
  account: {
    type: Object as PropType<ChartOfAccount>,
  },
  /** Pre-filled when the dialog is opened from a row's "+" (add child) button. */
  defaultParent: {
    type: Object as PropType<ChartOfAccount>,
  },
  /** All accounts of the selected company, sourced from the already-loaded
   *  tree — any account can be a parent (a Detail parent is legal, only
   *  warned about below; only Header accounts get the accompanying "+" row
   *  action in the view, but that doesn't restrict what can be picked here). */
  parentCandidates: {
    type: Array as PropType<ChartOfAccount[]>,
    default: () => [],
  },
})

const emits = defineEmits(['close'])

const toastGroup = 'chartOfAccountDialog'
const toast = useToast()
const coaFormRef = ref()

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const normalBalanceOptions = computed(() => [
  { label: t('chartOfAccounts.labels.debit'), value: 'DEBIT' },
  { label: t('chartOfAccounts.labels.credit'), value: 'CREDIT' },
])

const natureOptions = computed(() => [
  { label: t('chartOfAccounts.labels.header'), value: true },
  { label: t('chartOfAccounts.labels.detail'), value: false },
])

const yesNoOptions = computed(() => [
  { label: t('common.labels.yes'), value: true },
  { label: t('common.labels.no'), value: false },
])

// ---------------------------------------------------------------------------
// Reactive mirrors of form-bound fields, used for cascading UI logic.
// Most values actually sent to the API are read from the Form's own state
// (event.states.<field>.value) on submit. `normalBalance` is the one
// exception: PrimeVue's SelectButton does not re-render when a field's value
// is written programmatically through the Form's exposed `states` (only a
// direct user click on the button reliably updates it), which is exactly
// what the account-type auto-fill cascade needs to do. So normalBalance is
// kept out of Form registration entirely and driven by this plain ref,
// submitted from here rather than from event.states.
// ---------------------------------------------------------------------------

const isHeader = ref(false)
const hasControlAccount = ref(false)
const hasTouchedNormalBalance = ref(false)
const normalBalance = ref<NormalBalance>('DEBIT')
const selectedParent = ref<ChartOfAccount | undefined>(undefined)

const initialAccountType = ref<AccountTypeRef | undefined>(undefined)
const initialControlAccountType = ref<ControlAccountTypeRef | undefined>(undefined)

const newAccountLevel = computed(() => (selectedParent.value ? selectedParent.value.depth + 1 : 1))

// Frozen fields per mockup rule 5: code / account type / normal balance are
// locked once the account has appeared in a posted journal entry. `inUse` is
// always false until the GL module exists, so this never triggers today.
const fieldsFrozen = computed(() => props.mode === DialogMode.EDIT && props.account?.inUse === true)

// Excludes the account itself when editing — a full cycle guard against every
// descendant would need the tree shape, but the server already rejects those
// via ErrCyclicParent, so the client only needs to rule out the trivial case.
const parentOptions = computed(() =>
  props.parentCandidates
    .filter((a) => a.id !== props.account?.id)
    .map((a) => ({
      id: a.id,
      depth: a.depth,
      label: `${a.code} — ${a.name}`,
    })),
)

// ---------------------------------------------------------------------------
// Initial values
// ---------------------------------------------------------------------------

const initialValues = reactive({
  parentId: undefined as number | undefined,
  code: '',
  name: '',
  accountTypeId: undefined as number | undefined,
  isHeader: false,
  controlAccountTypeId: undefined as number | undefined,
  isRetainedEarnings: false,
  isActive: true,
})

onBeforeMount(() => {
  if (props.mode === DialogMode.ADD) {
    if (props.defaultParent) {
      applyParent(props.defaultParent)
    }
    return
  }

  if (!props.account) {
    return
  }

  const account = props.account

  initialValues.parentId = account.parentId ?? undefined
  initialValues.code = account.code
  initialValues.name = account.name
  initialValues.accountTypeId = account.accountTypeId
  initialValues.isHeader = account.isHeader
  initialValues.controlAccountTypeId = account.controlAccountTypeId ?? undefined
  initialValues.isRetainedEarnings = account.isRetainedEarnings
  initialValues.isActive = account.isActive

  isHeader.value = account.isHeader
  // The API omits a null field entirely rather than sending `null`, so a
  // strict `!== null` check would misread an absent field as present.
  hasControlAccount.value = Boolean(account.controlAccountTypeId)
  normalBalance.value = account.normalBalance
  hasTouchedNormalBalance.value = true

  if (account.parentId) {
    selectedParent.value = props.parentCandidates.find((a) => a.id === account.parentId)
  }

  if (account.accountType) {
    initialAccountType.value = account.accountType
  }
  if (account.controlAccountType) {
    initialControlAccountType.value = account.controlAccountType
  }
})

function applyParent(parent: ChartOfAccount) {
  initialValues.parentId = parent.id
  selectedParent.value = parent
}

// ---------------------------------------------------------------------------
// Cascades
// ---------------------------------------------------------------------------

function onParentIdUpdate(value: unknown) {
  selectedParent.value =
    typeof value === 'number' ? props.parentCandidates.find((a) => a.id === value) : undefined
}

function onAccountTypeSelect(accountType: AccountType) {
  if (hasTouchedNormalBalance.value) {
    return
  }

  normalBalance.value = accountType.defaultNormalBalance
}

function onNormalBalanceUpdate(value: NormalBalance) {
  normalBalance.value = value
  hasTouchedNormalBalance.value = true
}

function onIsHeaderUpdate(value: boolean) {
  isHeader.value = value

  if (value) {
    hasControlAccount.value = false
    if (coaFormRef.value?.states?.controlAccountTypeId) {
      coaFormRef.value.states.controlAccountTypeId.value = undefined
    }
  }
}

function onHasControlAccountUpdate(value: boolean) {
  hasControlAccount.value = value

  if (!value && coaFormRef.value?.states?.controlAccountTypeId) {
    coaFormRef.value.states.controlAccountTypeId.value = undefined
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const resolver = computed(() =>
  zodResolver(
    z.object({
      parentId: z.number().optional(),
      code: z.string().min(1, t('chartOfAccounts.validation.codeRequired')),
      name: z.string().min(1, t('chartOfAccounts.validation.nameRequired')),
      accountTypeId: z.number({
        required_error: t('chartOfAccounts.validation.accountTypeRequired'),
      }),
      isHeader: z.boolean(),
      controlAccountTypeId: hasControlAccount.value
        ? z.number({ required_error: t('chartOfAccounts.validation.controlAccountTypeRequired') })
        : z.number().optional(),
      isRetainedEarnings: z.boolean(),
      isActive: z.boolean(),
    }),
  ),
)

function handleClose() {
  emits('close')
}

const isLoading = ref(false)

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) {
    return
  }

  isLoading.value = true

  try {
    if (props.mode === DialogMode.ADD) {
      await addAccount(event)
    } else {
      await editAccount(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addAccount(event: FormSubmitEvent) {
  await ChartOfAccountsService.create({
    companyId: props.companyId,
    parentId: event.states.parentId.value,
    code: event.states.code.value,
    name: event.states.name.value,
    accountTypeId: event.states.accountTypeId.value,
    normalBalance: normalBalance.value,
    isHeader: event.states.isHeader.value,
    // The InfiniteSelect is v-if="hasControlAccount", so it never registers
    // with the Form (event.states.controlAccountTypeId is undefined) when
    // "No" is selected.
    controlAccountTypeId: event.states.controlAccountTypeId?.value,
    isRetainedEarnings: event.states.isRetainedEarnings.value,
    isActive: event.states.isActive.value,
  })

  toast.add(commonSuccessToast(t('chartOfAccounts.messages.accountCreated'), toastGroup))
}

async function editAccount(event: FormSubmitEvent) {
  await ChartOfAccountsService.update(props.account!.id, {
    parentId: event.states.parentId.value,
    code: event.states.code.value,
    name: event.states.name.value,
    accountTypeId: event.states.accountTypeId.value,
    normalBalance: normalBalance.value,
    isHeader: event.states.isHeader.value,
    // The InfiniteSelect is v-if="hasControlAccount", so it never registers
    // with the Form (event.states.controlAccountTypeId is undefined) when
    // "No" is selected.
    controlAccountTypeId: event.states.controlAccountTypeId?.value,
    isRetainedEarnings: event.states.isRetainedEarnings.value,
    isActive: event.states.isActive.value,
  })

  toast.add(commonSuccessToast(t('chartOfAccounts.messages.accountUpdated'), toastGroup))
}
</script>
