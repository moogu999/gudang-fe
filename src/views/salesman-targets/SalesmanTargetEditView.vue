<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog group="salesmanTargetStale" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/salesman-targets')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ target ? target.code : t('salesmanTargets.editTitle') }}
      </h1>
      <SalesmanTargetStatusTag v-if="target" :status="target.status" />
    </div>

    <div v-if="isLoadingTarget && !target" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <template v-else-if="target">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="target">{{ t('salesmanTargets.tabs.target') }}</Tab>
          <Tab value="history">{{ t('salesmanTargets.tabs.history') }}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="target">
            <!-- Remounted after each save: the form reads the target only on mount. -->
            <SalesmanTargetForm
              :key="formKey"
              mode="edit"
              :target="target"
              :is-loading="isSaving"
              :readonly="!canWrite || target.status === 'closed'"
              :can-activate="canActivate"
              :toast-group="toastGroup"
              @save="onSave"
              @activate="onActivate"
              @close="onClose"
              @remove="onRemove"
              @cancel="router.push('/salesman-targets')"
            />
          </TabPanel>
          <TabPanel value="history">
            <ResponsiveCard>
              <template #content>
                <SalesmanTargetHistoryTab
                  :target-id="target.id"
                  :reload-key="historyKey"
                  :toast-group="toastGroup"
                />
              </template>
            </ResponsiveCard>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>

    <ResponsiveCard v-else>
      <template #content>
        <Message severity="error">{{ t('salesmanTargets.messages.notFound') }}</Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Message from 'primevue/message'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { SalesmanTargetsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants/permissions'
import { ApiError } from '@/types/api.type'
import type { SalesmanTarget, UpdateSalesmanTargetRequest } from '@/types/salesmanTarget.type'
import { targetErrorCode, translateTargetError } from './salesmanTargetHelpers'
import SalesmanTargetForm from './SalesmanTargetForm.vue'
import SalesmanTargetHistoryTab from './components/SalesmanTargetHistoryTab.vue'
import SalesmanTargetStatusTag from './components/SalesmanTargetStatusTag.vue'

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { canWrite, hasPermission } = usePermissions('/salesman-targets')
const canActivate = hasPermission(PERMISSIONS.SALESMAN_TARGET_ACTIVATE)

const toastGroup = 'salesmanTargetEdit'
const target = ref<SalesmanTarget | undefined>()
const isLoadingTarget = ref(false)
const isSaving = ref(false)
const formKey = ref(0)
const historyKey = ref(0)
const activeTab = ref('target')

const targetId = Number(route.params.id)

async function reloadTarget() {
  isLoadingTarget.value = true
  try {
    target.value = await SalesmanTargetsService.get(targetId)
    formKey.value++
    historyKey.value++
  } catch (e) {
    toast.add(commonErrorToast(translateTargetError(e, t, te), toastGroup))
  } finally {
    isLoadingTarget.value = false
  }
}

onMounted(async () => {
  if (isNaN(targetId)) {
    router.push('/salesman-targets')
    return
  }
  await reloadTarget()
})

/** Re-reads the stored document rather than trusting a response, so the form shows what was kept. */
async function refresh(message: string) {
  target.value = await SalesmanTargetsService.get(targetId)
  formKey.value++
  historyKey.value++
  toast.add(commonSuccessToast(message, toastGroup))
}

function onFailure(e: unknown) {
  if (targetErrorCode(e) === 'TARGET_STALE') {
    confirm.require({
      group: 'salesmanTargetStale',
      header: t('salesmanTargets.stale.header'),
      message: t('salesmanTargets.stale.message'),
      icon: 'pi pi-exclamation-triangle',
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('salesmanTargets.stale.reload') },
      accept: reloadTarget,
    })
    return
  }
  if (e instanceof ApiError && e.status === 404) {
    router.push('/salesman-targets')
    return
  }
  toast.add(commonErrorToast(translateTargetError(e, t, te), toastGroup))
}

async function onSave(body: UpdateSalesmanTargetRequest) {
  isSaving.value = true
  try {
    await SalesmanTargetsService.update(targetId, body)
    await refresh(t('salesmanTargets.messages.updated'))
  } catch (e) {
    onFailure(e)
  } finally {
    isSaving.value = false
  }
}

async function onActivate(body: UpdateSalesmanTargetRequest | null) {
  if (!target.value) return
  isSaving.value = true
  try {
    // Unsaved changes are saved first, and the new version is the one activated.
    const version = body
      ? (await SalesmanTargetsService.update(targetId, body)).version
      : target.value.version
    await SalesmanTargetsService.activate(targetId, version)
    await refresh(t('salesmanTargets.messages.activated'))
  } catch (e) {
    onFailure(e)
  } finally {
    isSaving.value = false
  }
}

async function onClose() {
  if (!target.value) return
  isSaving.value = true
  try {
    await SalesmanTargetsService.close(targetId, target.value.version)
    await refresh(t('salesmanTargets.messages.closed'))
  } catch (e) {
    onFailure(e)
  } finally {
    isSaving.value = false
  }
}

async function onRemove() {
  isSaving.value = true
  try {
    await SalesmanTargetsService.delete(targetId)
    toast.add(commonSuccessToast(t('salesmanTargets.messages.deleted'), toastGroup))
    setTimeout(() => router.push('/salesman-targets'), 800)
  } catch (e) {
    onFailure(e)
  } finally {
    isSaving.value = false
  }
}
</script>
