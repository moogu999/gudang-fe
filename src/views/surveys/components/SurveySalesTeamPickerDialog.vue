<template>
  <Dialog
    :visible="true"
    :header="t('surveys.scope.teamPickerTitle')"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '95vw' }"
    :style="{ width: '40vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="mb-3">
      <IconField>
        <InputIcon><i class="pi pi-search" /></InputIcon>
        <InputText
          v-model="search"
          :placeholder="t('surveys.scope.teamSearch')"
          data-testid="team-search"
          @keydown.enter="load"
        />
      </IconField>
    </div>

    <DataTable
      v-model:selection="selection"
      :value="available"
      data-key="id"
      selection-mode="multiple"
      :loading="loading"
      scrollable
      scroll-height="40vh"
      class="text-sm"
    >
      <Column selection-mode="multiple" header-style="width: 3rem" />
      <Column field="code" :header="t('surveys.scope.teamColumns.code')" class="font-mono" />
      <Column field="name" :header="t('surveys.scope.teamColumns.name')" />
      <Column field="memberCount" :header="t('surveys.scope.teamColumns.members')" />
      <template #empty>
        <div class="py-6 text-center text-stone-500">{{ t('table.noResults') }}</div>
      </template>
    </DataTable>

    <template #footer>
      <Button :label="t('common.actions.cancel')" severity="secondary" @click="emit('close')" />
      <Button
        :label="t('surveys.scope.addTeams', { n: selection.length })"
        icon="pi pi-plus"
        :disabled="selection.length === 0"
        data-testid="team-picker-add"
        @click="confirm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import { SurveysService } from '@/services'
import { commonErrorToast } from '@/services/toast'
import type { SurveySalesTeamOption, SurveySalesTeamRef } from '@/types/survey.type'

const props = defineProps<{
  branchId: number
  /** Teams already chosen, left out of the list. */
  excludeIds: number[]
  toastGroup?: string
}>()

const emit = defineEmits<{ select: [teams: SurveySalesTeamRef[]]; close: [] }>()

const { t } = useI18n()
const toast = useToast()

const search = ref('')
const options = ref<SurveySalesTeamOption[]>([])
const selection = ref<SurveySalesTeamOption[]>([])
const loading = ref(false)

const available = computed(() => options.value.filter((o) => !props.excludeIds.includes(o.id)))

async function load() {
  loading.value = true
  try {
    options.value = await SurveysService.salesTeamOptions(props.branchId, search.value.trim())
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup ?? ''))
  } finally {
    loading.value = false
  }
}

function confirm() {
  emit(
    'select',
    selection.value.map((o) => ({ id: o.id, code: o.code, name: o.name, isActive: true })),
  )
}

onMounted(load)
</script>
