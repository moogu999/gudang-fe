<template>
  <Dialog
    :visible="!!source"
    :header="t('salesTeams.duplicate.title', { code: source?.code ?? '' })"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    :style="{ width: '50vw' }"
    :pt="{ header: 'text-base sm:text-lg md:text-xl' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <!-- Keyed on the source so the form re-reads it for each duplicate. -->
    <SalesTeamForm
      v-if="source"
      :key="source.id"
      mode="add"
      :source="source"
      :is-loading="isLoading"
      @submit="onSubmit"
      @cancel="emit('close')"
    />
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { CreateSalesTeamRequest, SalesTeam } from '@/types/salesTeam.type'
import SalesTeamForm from '../SalesTeamForm.vue'

const props = defineProps<{
  /** The team to duplicate; the dialog is open while it is set. */
  source?: SalesTeam
  toastGroup: string
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const isLoading = ref(false)

async function onSubmit(body: CreateSalesTeamRequest) {
  isLoading.value = true
  try {
    // The SKU list is copied server-side; members are not.
    const team = await SalesTeamsService.create({ ...body, copyFromTeamId: props.source?.id })
    toast.add(
      commonSuccessToast(t('salesTeams.messages.created', { code: team.code }), props.toastGroup),
    )
    emit('close')
    router.push(`/sales-teams/${team.id}/edit`)
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
