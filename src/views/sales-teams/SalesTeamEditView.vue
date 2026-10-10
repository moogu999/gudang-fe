<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/sales-teams')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ team ? `${team.code} · ${team.name}` : t('salesTeams.editTeam') }}
      </h1>
      <Tag
        v-if="team"
        :value="team.isActive ? t('salesTeams.status.active') : t('salesTeams.status.inactive')"
        :severity="team.isActive ? 'success' : 'secondary'"
      />
    </div>

    <div v-if="isLoadingTeam && !team" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <template v-else-if="team">
      <!-- Remounted after each save: the form reads the team only on mount. -->
      <SalesTeamForm
        :key="formKey"
        mode="edit"
        :team="team"
        :is-loading="isSaving"
        :readonly="!canWrite"
        @submit="onSubmit"
        @cancel="router.push('/sales-teams')"
      />

      <ResponsiveCard class="mt-6">
        <template #content>
          <Tabs v-model:value="activeTab">
            <TabList>
              <Tab value="products">
                {{ t('salesTeams.tabs.products') }} ({{ team.skuCount }})
              </Tab>
              <Tab value="members">
                {{ t('salesTeams.tabs.members') }} ({{ team.memberCount }})
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel value="products">
                <SalesTeamProductsTab
                  :team="team"
                  :can-write="canWrite"
                  :toast-group="toastGroup"
                  @changed="reloadTeam"
                />
              </TabPanel>
              <TabPanel value="members">
                <SalesTeamMembersTab
                  :team="team"
                  :can-write="canWrite"
                  :toast-group="toastGroup"
                  @changed="reloadTeam"
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </template>
      </ResponsiveCard>
    </template>

    <ResponsiveCard v-else>
      <template #content>
        <Message severity="error">{{ t('salesTeams.messages.notFound') }}</Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { SalesTeamsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import type { CreateSalesTeamRequest, SalesTeam } from '@/types/salesTeam.type'
import SalesTeamForm from './SalesTeamForm.vue'
import SalesTeamProductsTab from './components/SalesTeamProductsTab.vue'
import SalesTeamMembersTab from './components/SalesTeamMembersTab.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { canWrite } = usePermissions('/sales-teams')

const toastGroup = 'salesTeamEdit'
const team = ref<SalesTeam | undefined>()
const isLoadingTeam = ref(false)
const isSaving = ref(false)
const formKey = ref(0)
const activeTab = ref('products')

const teamId = Number(route.params.id)

async function reloadTeam() {
  isLoadingTeam.value = true
  try {
    team.value = await SalesTeamsService.get(teamId)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingTeam.value = false
  }
}

onMounted(async () => {
  if (isNaN(teamId)) {
    router.push('/sales-teams')
    return
  }
  await reloadTeam()
})

async function onSubmit(body: CreateSalesTeamRequest) {
  if (!team.value) return
  isSaving.value = true
  try {
    await SalesTeamsService.update(team.value.id, {
      name: body.name,
      supervisorEmployeeId: body.supervisorEmployeeId,
      customerChannelId: body.customerChannelId ?? null,
    })
    // Re-read rather than trusting the update response, so the form shows exactly what was stored.
    team.value = await SalesTeamsService.get(team.value.id)
    formKey.value++
    toast.add(commonSuccessToast(t('salesTeams.messages.updated'), toastGroup))
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isSaving.value = false
  }
}
</script>
