<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('salesmanTargets.addLine.title')"
    :style="{ width: '44rem' }"
    :breakpoints="{ '960px': '90vw' }"
    @update:visible="(v) => !v && emit('close')"
  >
    <DataTable
      v-model:selection="selection"
      :value="available"
      data-key="employeeId"
      :loading="isLoading"
      scrollable
      scroll-height="22rem"
    >
      <Column selection-mode="multiple" header-style="width: 3rem" />
      <Column :header="t('salesmanTargets.addLine.salesman')">
        <template #body="{ data }">
          <div>{{ data.name }}</div>
          <div class="text-xs text-stone-500">{{ subInfo(data) }}</div>
        </template>
      </Column>
      <Column field="typeName" :header="t('salesmanTargets.addLine.type')" />
      <template #empty>
        <p class="py-4 text-center text-stone-500">{{ t('salesmanTargets.addLine.empty') }}</p>
      </template>
    </DataTable>

    <template #footer>
      <Button
        type="button"
        :label="t('common.actions.cancel')"
        severity="secondary"
        @click="emit('close')"
      />
      <Button
        type="button"
        :label="t('salesmanTargets.addLine.add', { n: selection.length })"
        :disabled="selection.length === 0"
        @click="emit('add', selection)"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { SalesmanTargetsService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type {
  SalesmanTargetCandidate,
  SalesmanTargetCandidateQuery,
} from '@/types/salesmanTarget.type'

const props = defineProps<{
  visible: boolean
  query: SalesmanTargetCandidateQuery
  /** Employees already in the grid. */
  existingEmployeeIds: number[]
  toastGroup: string
}>()

const emit = defineEmits<{
  close: []
  add: [candidates: SalesmanTargetCandidate[]]
}>()

const { t } = useI18n()
const toast = useToast()

const candidates = ref<SalesmanTargetCandidate[]>([])
const selection = ref<SalesmanTargetCandidate[]>([])
const isLoading = ref(false)

const available = computed(() =>
  candidates.value.filter((c) => !props.existingEmployeeIds.includes(c.employeeId)),
)

function subInfo(c: SalesmanTargetCandidate): string {
  const parts = [c.code, c.teamCodes.join(', '), c.principals.join(', ')]
  return parts.filter(Boolean).join(' · ')
}

// nextTick: the query props must have settled before the fetch.
watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    selection.value = []
    isLoading.value = true
    try {
      candidates.value = (await SalesmanTargetsService.candidates(props.query)).data
    } catch (e) {
      candidates.value = []
      toast.add(commonErrorToast(e, props.toastGroup))
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true },
)
</script>
