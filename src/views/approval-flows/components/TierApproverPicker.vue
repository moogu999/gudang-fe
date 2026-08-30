<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
      <label class="text-xs font-semibold text-gray-500">
        {{ t('approvalFlows.labels.primaryApprover') }}
      </label>
      <div class="flex items-center gap-2">
        <InfiniteSelect
          option-label="name"
          option-value="id"
          :fetch-fn="(q) => EmployeesService.listForSelect(q)"
          :initial-option="primary._initialEmployee"
          :model-value="primary.employeeId"
          :disabled-values="otherEmployeeIds(primary)"
          :disabled="disabled"
          sort-by="name"
          sort-operator="asc"
          class="flex-1"
          @update:model-value="(v) => setEmployee(0, v as number | null)"
          @select-option="(opt) => setInitialEmployee(0, opt as EmployeeOption)"
        />
        <i
          v-if="showWarning(primary)"
          v-tooltip.top="t('approvalFlows.warnings.noUserAccount')"
          class="pi pi-exclamation-triangle text-yellow-500"
        />
      </div>
    </div>

    <div v-for="(alt, idx) in alternates" :key="idx" class="flex flex-col gap-1">
      <label class="text-xs font-semibold text-gray-500">
        {{ t('approvalFlows.labels.alternateApprover', { n: idx + 1 }) }}
      </label>
      <div class="flex items-center gap-2">
        <InfiniteSelect
          option-label="name"
          option-value="id"
          :fetch-fn="(q) => EmployeesService.listForSelect(q)"
          :initial-option="alt._initialEmployee"
          :model-value="alt.employeeId"
          :disabled-values="otherEmployeeIds(alt)"
          :disabled="disabled"
          sort-by="name"
          sort-operator="asc"
          class="flex-1"
          @update:model-value="(v) => setEmployee(idx + 1, v as number | null)"
          @select-option="(opt) => setInitialEmployee(idx + 1, opt as EmployeeOption)"
        />
        <i
          v-if="showWarning(alt)"
          v-tooltip.top="t('approvalFlows.warnings.noUserAccount')"
          class="pi pi-exclamation-triangle text-yellow-500"
        />
        <Button
          v-if="!disabled"
          icon="pi pi-trash"
          text
          severity="danger"
          size="small"
          :aria-label="t('approvalFlows.actions.removeAlternate')"
          @click="removeAlternate(idx)"
        />
      </div>
    </div>

    <Button
      v-if="!disabled && alternates.length < 4"
      :label="t('approvalFlows.actions.addAlternate')"
      icon="pi pi-plus"
      text
      size="small"
      class="w-fit"
      @click="addAlternate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { EmployeesService } from '@/services/employees.service'

export interface TierApproverForm {
  employeeId: number | null
  isPrimary: boolean
  _initialEmployee?: { id: number; name: string; hasUserAccount?: boolean }
}

interface EmployeeOption {
  id: number
  name: string
  hasUserAccount?: boolean
}

const approvers = defineModel<TierApproverForm[]>('approvers', { required: true })

defineProps<{ disabled?: boolean }>()

const { t } = useI18n()

const primary = computed(() => approvers.value[0])
const alternates = computed(() => approvers.value.slice(1))

function otherEmployeeIds(current: TierApproverForm): number[] {
  return approvers.value
    .filter((a) => a !== current)
    .map((a) => a.employeeId)
    .filter((id): id is number => id !== null)
}

function setEmployee(index: number, employeeId: number | null) {
  approvers.value[index].employeeId = employeeId
  if (employeeId === null) approvers.value[index]._initialEmployee = undefined
}

function setInitialEmployee(index: number, opt: EmployeeOption) {
  approvers.value[index]._initialEmployee = {
    id: opt.id,
    name: opt.name,
    hasUserAccount: opt.hasUserAccount,
  }
}

function showWarning(a: TierApproverForm): boolean {
  return !!a.employeeId && a._initialEmployee?.hasUserAccount === false
}

function addAlternate() {
  if (alternates.value.length >= 4) return
  approvers.value.push({ employeeId: null, isPrimary: false })
}

function removeAlternate(idx: number) {
  approvers.value.splice(idx + 1, 1)
}
</script>
