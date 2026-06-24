<template>
  <Dialog
    :visible="visible"
    :header="
      mode === 'add' ? t('customers.labels.addBankAccount') : t('customers.labels.editBankAccount')
    "
    modal
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    :style="{ width: '40vw' }"
    :pt="{ header: 'text-base sm:text-lg' }"
    @update:visible="emit('hide')"
  >
    <div class="flex flex-col gap-4 pt-2">
      <!-- Bank Name -->
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-36">
          {{ t('customers.fields.bankName') }}
          <span class="ml-0.5 text-red-500">*</span>
        </label>
        <div class="flex w-full flex-col gap-1">
          <InputText v-model="form.bankName" class="w-full" />
          <small v-if="errors.bankName" class="text-red-500">{{ errors.bankName }}</small>
        </div>
      </div>

      <!-- Account Number -->
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-36">
          {{ t('customers.fields.accountNumber') }}
          <span class="ml-0.5 text-red-500">*</span>
        </label>
        <div class="flex w-full flex-col gap-1">
          <InputText v-model="form.accountNumber" class="w-full" />
          <small v-if="errors.accountNumber" class="text-red-500">{{ errors.accountNumber }}</small>
        </div>
      </div>

      <!-- Account Holder -->
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label class="w-full text-sm font-semibold sm:text-base md:w-36">
          {{ t('customers.fields.accountHolder') }}
          <span class="ml-0.5 text-red-500">*</span>
        </label>
        <div class="flex w-full flex-col gap-1">
          <InputText v-model="form.accountHolder" class="w-full" />
          <small v-if="errors.accountHolder" class="text-red-500">{{ errors.accountHolder }}</small>
        </div>
      </div>

      <!-- Is Default -->
      <div class="flex flex-row items-center gap-3">
        <Checkbox v-model="form.isDefault" :binary="true" input-id="bankIsDefault" />
        <label for="bankIsDefault" class="text-sm">{{ t('customers.fields.isDefault') }}</label>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('hide')" />
        <Button :label="t('common.actions.save')" @click="onSave" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import type { CustomerBankAccount } from '@/types/customer.type'

const { t } = useI18n()

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  modelValue?: CustomerBankAccount
}

const props = defineProps<Props>()

const emit = defineEmits<{
  hide: []
  save: [value: CustomerBankAccount]
}>()

const form = reactive<CustomerBankAccount>({
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  isDefault: false,
})

const errors = reactive<Record<string, string>>({})

watch(
  () => props.visible,
  (val) => {
    if (!val) return
    errors.bankName = ''
    errors.accountNumber = ''
    errors.accountHolder = ''
    if (props.modelValue) {
      form.id = props.modelValue.id
      form.bankName = props.modelValue.bankName
      form.accountNumber = props.modelValue.accountNumber
      form.accountHolder = props.modelValue.accountHolder
      form.isDefault = props.modelValue.isDefault
    } else {
      form.id = undefined
      form.bankName = ''
      form.accountNumber = ''
      form.accountHolder = ''
      form.isDefault = false
    }
  },
)

function onSave() {
  errors.bankName = ''
  errors.accountNumber = ''
  errors.accountHolder = ''

  let valid = true
  if (!form.bankName.trim()) {
    errors.bankName = t('common.messages.required')
    valid = false
  }
  if (!form.accountNumber.trim()) {
    errors.accountNumber = t('common.messages.required')
    valid = false
  }
  if (!form.accountHolder.trim()) {
    errors.accountHolder = t('common.messages.required')
    valid = false
  }
  if (!valid) return

  emit('save', { ...form })
}
</script>
