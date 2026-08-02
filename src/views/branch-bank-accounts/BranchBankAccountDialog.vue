<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="branchId" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('branchBankAccounts.fields.branch')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            v-if="mode === DialogMode.ADD"
            id="branchId"
            name="branchId"
            option-label="name"
            option-value="id"
            :fetch-fn="(query) => BranchesService.list(query)"
            sort-by="name"
            sort-operator="asc"
            class="w-full"
          />
          <InputText v-else :value="props.branchBankAccount?.branchName" disabled class="w-full" />
          <Message v-if="$form.branchId?.invalid" severity="error" size="small" variant="simple">{{
            $form.branchId.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="bankName" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('branchBankAccounts.fields.bankName')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="bankName"
            name="bankName"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.bankName?.invalid" severity="error" size="small" variant="simple">{{
            $form.bankName.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="accountNumber" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('branchBankAccounts.fields.accountNumber')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="accountNumber"
            name="accountNumber"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message
            v-if="$form.accountNumber?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.accountNumber.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="accountHolderName" class="w-full text-sm font-semibold sm:text-base md:w-40">{{
          t('branchBankAccounts.fields.accountHolderName')
        }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="accountHolderName"
            name="accountHolderName"
            autocomplete="off"
            :disabled="mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message
            v-if="$form.accountHolderName?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.accountHolderName.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div class="w-full md:w-40"></div>
        <div class="flex items-center gap-2">
          <ToggleSwitch id="isDefault" name="isDefault" :disabled="mode === DialogMode.VIEW" />
          <label for="isDefault" class="text-sm font-semibold sm:text-base">{{
            t('branchBankAccounts.labels.default')
          }}</label>
        </div>
      </div>
      <small v-if="mode !== DialogMode.VIEW" class="text-surface-500 mb-4 block">
        {{ t('branchBankAccounts.labels.defaultHint') }}
      </small>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div class="w-full md:w-40"></div>
        <div class="flex items-center gap-2">
          <ToggleSwitch id="isActive" name="isActive" :disabled="mode === DialogMode.VIEW" />
          <label for="isActive" class="text-sm font-semibold sm:text-base">{{
            t('common.labels.active')
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
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed, ref } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { BranchBankAccountsService, BranchesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { ApiError } from '@/types/api.type'
import DialogMode from '@/constants/dialogMode'
import type { BranchBankAccount } from '@/types'
import { useAuthStore } from '@/stores'

const { t } = useI18n()
const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  branchBankAccount: {
    type: Object as PropType<BranchBankAccount>,
  },
})

const emits = defineEmits(['close'])

onBeforeMount(() => {
  if (
    (props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) ||
    !props.branchBankAccount
  ) {
    return
  }

  initialValues.bankName = props.branchBankAccount.bankName
  initialValues.accountNumber = props.branchBankAccount.accountNumber
  initialValues.accountHolderName = props.branchBankAccount.accountHolderName
  initialValues.isDefault = props.branchBankAccount.isDefault
  initialValues.isActive = props.branchBankAccount.isActive
})

const toastGroup = 'branchBankAccountDialog'
const toast = useToast()

const initialValues = reactive({
  branchId: undefined as number | undefined,
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
  isDefault: false,
  isActive: true,
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      branchId:
        props.mode === DialogMode.ADD
          ? z.number({ message: t('branchBankAccounts.validation.branchRequired') })
          : z.number().optional(),
      bankName: z.string().min(1, t('branchBankAccounts.validation.bankNameRequired')),
      accountNumber: z.string().min(1, t('branchBankAccounts.validation.accountNumberRequired')),
      accountHolderName: z
        .string()
        .min(1, t('branchBankAccounts.validation.accountHolderNameRequired')),
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
      await addBranchBankAccount(event)
    } else {
      await editBranchBankAccount(event)
    }

    emits('close')
  } catch (e) {
    // The one-default-per-branch partial unique index has no server-side
    // demotion hook — surface the 409 as an actionable message rather than
    // the raw constraint-violation text.
    if (e instanceof ApiError && e.status === 409) {
      toast.add(
        commonErrorToast(new Error(t('branchBankAccounts.messages.defaultConflict')), toastGroup),
      )
    } else {
      toast.add(commonErrorToast(e, toastGroup))
    }
  } finally {
    isLoading.value = false
  }
}

async function addBranchBankAccount(event: FormSubmitEvent) {
  await BranchBankAccountsService.create({
    branchId: event.states.branchId.value as number,
    bankName: (event.states.bankName.value as string).trim(),
    accountNumber: (event.states.accountNumber.value as string).trim(),
    accountHolderName: (event.states.accountHolderName.value as string).trim(),
    isDefault: event.states.isDefault.value as boolean,
    isActive: event.states.isActive.value as boolean,
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('branchBankAccounts.messages.created'), toastGroup))
}

async function editBranchBankAccount(event: FormSubmitEvent) {
  await BranchBankAccountsService.update(props.branchBankAccount!.id, {
    bankName: (event.states.bankName.value as string).trim(),
    accountNumber: (event.states.accountNumber.value as string).trim(),
    accountHolderName: (event.states.accountHolderName.value as string).trim(),
    isDefault: event.states.isDefault.value as boolean,
    isActive: event.states.isActive.value as boolean,
    updatedBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('branchBankAccounts.messages.updated'), toastGroup))
}
</script>
