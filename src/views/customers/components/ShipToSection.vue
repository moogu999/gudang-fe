<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <p v-if="errors" class="text-sm text-red-500">{{ errors }}</p>
      <div v-else />
      <Button
        v-if="!disabled"
        :label="t('customers.labels.addAddress')"
        icon="pi pi-plus"
        size="small"
        @click="openAdd"
      />
    </div>

    <p v-if="modelValue.length === 0" class="text-sm text-stone-400">
      {{ t('customers.labels.noAddresses') }}
    </p>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="(addr, idx) in modelValue"
        :key="idx"
        class="rounded-lg border border-stone-200 p-4"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <!-- Badges -->
            <div class="mb-1 flex flex-wrap gap-1">
              <span
                v-if="addr.isPrimary"
                class="bg-primary-100 text-primary-700 rounded px-2 py-0.5 text-xs font-medium"
              >
                {{ t('customers.labels.primaryBadge') }}
              </span>
              <span
                v-if="addr.isDefaultShipping"
                class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                {{ t('customers.labels.defaultShippingBadge') }}
              </span>
              <span
                v-if="addr.isTaxInvoiceAddress"
                class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
              >
                {{ t('customers.labels.taxInvoiceBadge') }}
              </span>
            </div>
            <p v-if="addr.label" class="text-sm font-medium">{{ addr.label }}</p>
            <p class="text-sm text-stone-500">
              {{
                [addr.address, addr.city?.name, addr.province?.name, addr.zipCode]
                  .filter(Boolean)
                  .join(', ') || '—'
              }}
            </p>
            <p v-if="addr.picName" class="mt-1 text-xs text-stone-400">
              PIC: {{ addr.picName }}<span v-if="addr.picPhone"> · {{ addr.picPhone }}</span>
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
              @click="removeAddress(idx)"
            />
          </div>
        </div>
      </div>
    </div>

    <ShipToAddressDialog
      :visible="dialogVisible"
      :mode="dialogMode"
      :model-value="editingAddress ?? undefined"
      @hide="dialogVisible = false"
      @save="onDialogSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ShipToAddressDialog from './ShipToAddressDialog.vue'
import type { CustomerAddress } from '@/types/customer.type'

const { t } = useI18n()

interface Props {
  modelValue: CustomerAddress[]
  disabled?: boolean
  errors?: string
}

const props = withDefaults(defineProps<Props>(), { disabled: false })

const emit = defineEmits<{
  'update:modelValue': [value: CustomerAddress[]]
}>()

const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingIndex = ref<number>(-1)
const editingAddress = ref<CustomerAddress | null>(null)

function openAdd() {
  dialogMode.value = 'add'
  editingIndex.value = -1
  editingAddress.value = null
  dialogVisible.value = true
}

function openEdit(idx: number) {
  dialogMode.value = 'edit'
  editingIndex.value = idx
  editingAddress.value = { ...props.modelValue[idx] }
  dialogVisible.value = true
}

function removeAddress(idx: number) {
  const updated = [...props.modelValue]
  updated.splice(idx, 1)
  emit('update:modelValue', updated)
}

function onDialogSave(addr: CustomerAddress) {
  const updated = [...props.modelValue]
  if (dialogMode.value === 'add') {
    updated.push(addr)
  } else {
    updated[editingIndex.value] = addr
  }
  emit('update:modelValue', updated)
  dialogVisible.value = false
}
</script>
