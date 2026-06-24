<template>
  <div>
    <!-- Pays with giro toggle -->
    <div class="mb-4 flex items-center gap-3">
      <Checkbox
        v-model="paysWithGiroModel"
        :binary="true"
        :disabled="disabled"
        input-id="paysWithGiro"
      />
      <label for="paysWithGiro" class="text-sm font-medium">
        {{ t('customers.fields.paysWithGiro') }}
      </label>
    </div>

    <div class="mb-4 flex items-center justify-between">
      <h4 class="text-sm font-semibold text-stone-600">{{ t('customers.sections.banking') }}</h4>
      <Button
        v-if="!disabled"
        :label="t('customers.labels.addBankAccount')"
        icon="pi pi-plus"
        size="small"
        @click="openAdd"
      />
    </div>

    <p v-if="modelValue.length === 0" class="text-sm text-stone-400">
      {{ t('customers.labels.noBankAccounts') }}
    </p>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="(bank, idx) in modelValue"
        :key="idx"
        class="rounded-lg border border-stone-200 p-4"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <div class="mb-1 flex flex-wrap gap-1">
              <span
                v-if="bank.isDefault"
                class="bg-primary-100 text-primary-700 rounded px-2 py-0.5 text-xs font-medium"
              >
                {{ t('customers.fields.isDefault') }}
              </span>
            </div>
            <p class="text-sm font-medium">{{ bank.bankName }}</p>
            <p class="text-sm text-stone-500">
              {{ bank.accountNumber }} · {{ bank.accountHolder }}
            </p>
          </div>
          <div v-if="!disabled" class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              size="small"
              @click="openEdit(idx)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              @click="removeBank(idx)"
            />
          </div>
        </div>
      </div>
    </div>

    <BankAccountDialog
      :visible="dialogVisible"
      :mode="dialogMode"
      :model-value="editingBank ?? undefined"
      @hide="dialogVisible = false"
      @save="onDialogSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import BankAccountDialog from './BankAccountDialog.vue'
import type { CustomerBankAccount } from '@/types/customer.type'

const { t } = useI18n()

interface Props {
  modelValue: CustomerBankAccount[]
  paysWithGiro: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { disabled: false })

const emit = defineEmits<{
  'update:modelValue': [value: CustomerBankAccount[]]
  'update:paysWithGiro': [value: boolean]
}>()

const paysWithGiroModel = computed({
  get: () => props.paysWithGiro,
  set: (v) => emit('update:paysWithGiro', v),
})

const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingIndex = ref(-1)
const editingBank = ref<CustomerBankAccount | null>(null)

function openAdd() {
  dialogMode.value = 'add'
  editingIndex.value = -1
  editingBank.value = null
  dialogVisible.value = true
}

function openEdit(idx: number) {
  dialogMode.value = 'edit'
  editingIndex.value = idx
  editingBank.value = { ...props.modelValue[idx] }
  dialogVisible.value = true
}

function removeBank(idx: number) {
  const updated = [...props.modelValue]
  updated.splice(idx, 1)
  emit('update:modelValue', updated)
}

function onDialogSave(bank: CustomerBankAccount) {
  const updated = [...props.modelValue]
  if (dialogMode.value === 'add') {
    updated.push(bank)
  } else {
    updated[editingIndex.value] = bank
  }
  emit('update:modelValue', updated)
  dialogVisible.value = false
}
</script>
