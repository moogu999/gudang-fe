<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-gray-600">{{ t('approvalFlows.fields.tiers') }}</span>
      <Button
        v-if="!disabled"
        :label="t('approvalFlows.actions.addTier')"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        @click="addTier"
      />
    </div>

    <div v-if="tiers.length === 0" class="rounded border p-3 text-center text-sm text-gray-500">
      {{ t('table.noItems') }}
    </div>

    <div
      v-for="(tier, index) in tiers"
      :key="index"
      class="flex flex-col gap-3 rounded-lg border border-stone-200 p-4"
    >
      <div class="flex items-start gap-3">
        <div class="flex flex-1 flex-col gap-1">
          <label class="text-sm font-semibold">
            {{ t('approvalFlows.labels.tierN', { n: index + 1 }) }}
          </label>
          <InputText
            v-model="tier.name"
            :disabled="disabled"
            :placeholder="t('approvalFlows.placeholders.tierName')"
            autocomplete="off"
          />
          <small v-if="errors[index]" class="text-red-500">{{ errors[index] }}</small>
        </div>
        <div v-if="!disabled" class="flex gap-0.5">
          <Button
            icon="pi pi-arrow-up"
            text
            size="small"
            :disabled="index === 0"
            :aria-label="t('common.actions.moveUp')"
            @click="moveTier(index, -1)"
          />
          <Button
            icon="pi pi-arrow-down"
            text
            size="small"
            :disabled="index === tiers.length - 1"
            :aria-label="t('common.actions.moveDown')"
            @click="moveTier(index, 1)"
          />
          <Button
            icon="pi pi-trash"
            text
            severity="danger"
            size="small"
            :aria-label="t('approvalFlows.actions.removeTier')"
            @click="removeTier(index)"
          />
        </div>
      </div>

      <TierApproverPicker v-model:approvers="tier.approvers" :disabled="disabled" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import TierApproverPicker, { type TierApproverForm } from './TierApproverPicker.vue'

export interface TierForm {
  id?: number
  tierOrder: number
  name: string
  approvers: TierApproverForm[]
}

const tiers = defineModel<TierForm[]>('tiers', { required: true })

defineProps<{
  errors: string[]
  disabled?: boolean
}>()

const { t } = useI18n()

function renumber() {
  tiers.value.forEach((tier, i) => {
    tier.tierOrder = i + 1
  })
}

function addTier() {
  tiers.value.push({
    tierOrder: tiers.value.length + 1,
    name: '',
    approvers: [{ employeeId: null, isPrimary: true }],
  })
}

function removeTier(index: number) {
  tiers.value.splice(index, 1)
  renumber()
}

function moveTier(index: number, dir: -1 | 1) {
  const newIndex = index + dir
  if (newIndex < 0 || newIndex >= tiers.value.length) return
  const arr = tiers.value
  ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
  renumber()
}
</script>
