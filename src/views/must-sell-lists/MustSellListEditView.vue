<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog group="mustSellListStale" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/must-sell-lists')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ list ? list.code : t('mustSellLists.editTitle') }}
      </h1>
      <MslStatusTag v-if="list" :status="list.displayStatus" />
    </div>

    <div v-if="isLoadingList && !list" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <template v-else-if="list">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="list">{{ t('mustSellLists.tabs.list') }}</Tab>
          <Tab value="history">{{ t('mustSellLists.tabs.history') }}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="list">
            <!-- Remounted after each save: the form reads the list only on mount. -->
            <MustSellListForm
              :key="formKey"
              mode="edit"
              :list="list"
              :is-loading="isSaving"
              :readonly="!canWrite || list.displayStatus === 'ended'"
              :can-write="canWrite"
              :can-publish="canPublish"
              :toast-group="toastGroup"
              @save="onSave"
              @publish="onPublish"
              @unpublish="onUnpublish"
              @end-early="onEndEarly"
              @duplicate="onDuplicate"
              @remove="onRemove"
              @cancel="router.push('/must-sell-lists')"
            />
          </TabPanel>
          <TabPanel value="history">
            <ResponsiveCard>
              <template #content>
                <MslHistoryTab
                  :list-id="list.id"
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
        <Message severity="error">{{ t('mustSellLists.messages.notFound') }}</Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import { MustSellListsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants/permissions'
import { ApiError } from '@/types/api.type'
import type { MustSellList, UpdateMustSellListRequest } from '@/types/mustSellList.type'
import { mslErrorCode, translateMslError } from './mustSellListHelpers'
import MustSellListForm from './MustSellListForm.vue'
import MslHistoryTab from './components/MslHistoryTab.vue'
import MslStatusTag from './components/MslStatusTag.vue'

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { canWrite, hasPermission } = usePermissions('/must-sell-lists')
const canPublish = hasPermission(PERMISSIONS.MSL_PUBLISH)

const toastGroup = 'mustSellListEdit'
const list = ref<MustSellList | undefined>()
const isLoadingList = ref(false)
const isSaving = ref(false)
const formKey = ref(0)
const historyKey = ref(0)
const activeTab = ref('list')

// The route param, so duplicating (which lands on another list's edit page) reloads in place.
const listId = computed(() => Number(route.params.id))

async function reloadList() {
  isLoadingList.value = true
  try {
    list.value = await MustSellListsService.get(listId.value)
    formKey.value++
    historyKey.value++
  } catch (e) {
    list.value = undefined
    toast.add(commonErrorToast(translateMslError(e, t, te), toastGroup))
  } finally {
    isLoadingList.value = false
  }
}

watch(
  listId,
  async (id) => {
    if (isNaN(id)) {
      router.push('/must-sell-lists')
      return
    }
    activeTab.value = 'list'
    await reloadList()
  },
  { immediate: true },
)

/** Re-reads the stored document rather than trusting a response, so the form shows what was kept. */
async function refresh(message: string) {
  list.value = await MustSellListsService.get(listId.value)
  formKey.value++
  historyKey.value++
  toast.add(commonSuccessToast(message, toastGroup))
}

function onFailure(e: unknown) {
  if (mslErrorCode(e) === 'MSL_STALE') {
    confirm.require({
      group: 'mustSellListStale',
      header: t('mustSellLists.stale.header'),
      message: t('mustSellLists.stale.message'),
      icon: 'pi pi-exclamation-triangle',
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('mustSellLists.stale.reload') },
      accept: reloadList,
    })
    return
  }
  if (e instanceof ApiError && e.status === 404) {
    router.push('/must-sell-lists')
    return
  }
  toast.add(commonErrorToast(translateMslError(e, t, te), toastGroup))
}

async function run(action: () => Promise<void>) {
  isSaving.value = true
  try {
    await action()
  } catch (e) {
    onFailure(e)
  } finally {
    isSaving.value = false
  }
}

const onSave = (body: UpdateMustSellListRequest) =>
  run(async () => {
    await MustSellListsService.update(listId.value, body)
    await refresh(t('mustSellLists.messages.updated'))
  })

const onPublish = (body: UpdateMustSellListRequest | null) =>
  run(async () => {
    if (!list.value) return
    // Unsaved changes are saved first, and the new version is the one published.
    const version = body
      ? (await MustSellListsService.update(listId.value, body)).version
      : list.value.version
    await MustSellListsService.publish(listId.value, version)
    await refresh(t('mustSellLists.messages.published'))
  })

const onUnpublish = () =>
  run(async () => {
    if (!list.value) return
    await MustSellListsService.unpublish(listId.value, list.value.version)
    await refresh(t('mustSellLists.messages.unpublished'))
  })

const onEndEarly = () =>
  run(async () => {
    if (!list.value) return
    await MustSellListsService.endEarly(listId.value, list.value.version)
    await refresh(t('mustSellLists.messages.endedEarly'))
  })

const onDuplicate = () =>
  run(async () => {
    const copy = await MustSellListsService.duplicate(listId.value)
    toast.add(
      commonSuccessToast(t('mustSellLists.messages.duplicated', { code: copy.code }), toastGroup),
    )
    if (copy.scopeCleared) {
      toast.add({
        severity: 'warn',
        summary: t('mustSellLists.messages.scopeCleared'),
        life: 6000,
        group: toastGroup,
      })
    }
    await router.push(`/must-sell-lists/${copy.id}/edit`)
  })

const onRemove = () =>
  run(async () => {
    await MustSellListsService.delete(listId.value)
    toast.add(commonSuccessToast(t('mustSellLists.messages.deleted'), toastGroup))
    setTimeout(() => router.push('/must-sell-lists'), 800)
  })
</script>
