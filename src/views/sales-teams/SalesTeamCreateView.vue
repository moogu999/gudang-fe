<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.back()"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('salesTeams.createTeam') }}
      </h1>
    </div>

    <SalesTeamForm mode="add" :is-loading="isLoading" @submit="onSubmit" @cancel="router.back()" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePostSaveNavigation } from '@/composables'
import type { CreateSalesTeamRequest } from '@/types/salesTeam.type'
import SalesTeamForm from './SalesTeamForm.vue'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const { afterCreate } = usePostSaveNavigation('/sales-teams')

const toastGroup = 'salesTeamCreate'
const isLoading = ref(false)

async function onSubmit(body: CreateSalesTeamRequest) {
  isLoading.value = true
  try {
    const team = await SalesTeamsService.create(body)
    toast.add(commonSuccessToast(t('salesTeams.messages.created', { code: team.code }), toastGroup))
    // A team has no status, so it always lands on its edit page to add SKUs and members.
    afterCreate({ id: team.id })
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
