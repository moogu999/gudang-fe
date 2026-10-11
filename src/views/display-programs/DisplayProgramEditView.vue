<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog group="displayProgramStale" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/display-programs')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ program ? `${program.code} — ${program.name}` : t('displayPrograms.editTitle') }}
      </h1>
      <DisplayProgramStatusTag v-if="program" :status="program.displayStatus" />
    </div>

    <div v-if="isLoadingProgram && !program" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <template v-else-if="program">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="settings">{{ t('displayPrograms.tabs.settings') }}</Tab>
          <Tab value="customers"
            >{{ t('displayPrograms.tabs.customers') }}
            <Badge :value="participantCount" severity="secondary" class="ml-1"
          /></Tab>
          <Tab value="history">{{ t('displayPrograms.tabs.history') }}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="settings">
            <!-- Remounted after each save: the form reads the program only on mount. -->
            <DisplayProgramForm
              :key="formKey"
              mode="edit"
              :program="program"
              :participant-count="participantCount"
              :is-loading="isSaving"
              :readonly="!canWrite || program.displayStatus === 'ended'"
              :can-write="canWrite"
              :can-publish="canPublish"
              :toast-group="toastGroup"
              @save="onSave"
              @publish="onPublish"
              @unpublish="onUnpublish"
              @end-early="onEndEarly"
              @duplicate="onDuplicate"
              @remove="onRemove"
              @cancel="router.push('/display-programs')"
            />
          </TabPanel>
          <TabPanel value="customers">
            <ResponsiveCard>
              <template #content>
                <DisplayCustomersTab
                  :key="customersKey"
                  :program-id="program.id"
                  :version="program.version"
                  :status="program.displayStatus"
                  :start-date="program.startDate"
                  :end-date="program.endDate"
                  :can-write="canWrite"
                  :toast-group="toastGroup"
                  @changed="onCustomersChanged"
                  @stale="onStale"
                />
              </template>
            </ResponsiveCard>
          </TabPanel>
          <TabPanel value="history">
            <ResponsiveCard>
              <template #content>
                <DisplayProgramHistoryTab
                  :program-id="program.id"
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
        <Message severity="error">{{ t('displayPrograms.messages.notFound') }}</Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Message from 'primevue/message'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { DisplayProgramsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants/permissions'
import { ApiError } from '@/types/api.type'
import type { DisplayProgram, UpdateDisplayProgramRequest } from '@/types/displayProgram.type'
import { displayProgramErrorCode, translateDisplayProgramError } from './displayProgramErrors'
import DisplayProgramForm from './DisplayProgramForm.vue'
import DisplayCustomersTab from './components/DisplayCustomersTab.vue'
import DisplayProgramHistoryTab from './components/DisplayProgramHistoryTab.vue'
import DisplayProgramStatusTag from './components/DisplayProgramStatusTag.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { canWrite, hasPermission } = usePermissions('/display-programs')
const canPublish = hasPermission(PERMISSIONS.DISPLAY_PROGRAM_PUBLISH)

const toastGroup = 'displayProgramEdit'
const program = ref<DisplayProgram | undefined>()
const isLoadingProgram = ref(false)
const isSaving = ref(false)
const formKey = ref(0)
const customersKey = ref(0)
const historyKey = ref(0)
const activeTab = ref('settings')
const participantCount = ref(0)

// The route param, so duplicating (which lands on another program's edit page) reloads in place.
const programId = computed(() => Number(route.params.id))

function adopt(fresh: DisplayProgram) {
  program.value = fresh
  participantCount.value = fresh.participantCount
}

async function reloadProgram() {
  isLoadingProgram.value = true
  try {
    adopt(await DisplayProgramsService.get(programId.value))
    formKey.value++
    customersKey.value++
    historyKey.value++
  } catch (e) {
    program.value = undefined
    toast.add(commonErrorToast(translateDisplayProgramError(e, t), toastGroup))
  } finally {
    isLoadingProgram.value = false
  }
}

watch(
  programId,
  async (id) => {
    if (isNaN(id)) {
      router.push('/display-programs')
      return
    }
    activeTab.value = 'settings'
    await reloadProgram()
  },
  { immediate: true },
)

/** Re-reads the stored document rather than trusting a response, so the form shows what was kept. */
async function refresh(message: string) {
  adopt(await DisplayProgramsService.get(programId.value))
  formKey.value++
  customersKey.value++
  historyKey.value++
  toast.add(commonSuccessToast(message, toastGroup))
}

/**
 * A customer write bumped the version. Only the version and the count are taken from the
 * server, so unsaved changes in the Settings tab survive.
 */
async function onCustomersChanged(version: number) {
  if (program.value) program.value.version = version
  historyKey.value++
  try {
    const fresh = await DisplayProgramsService.get(programId.value)
    participantCount.value = fresh.participantCount
    if (program.value) program.value.version = fresh.version
  } catch {
    // The count catches up on the next load.
  }
}

function onStale() {
  confirm.require({
    group: 'displayProgramStale',
    header: t('displayPrograms.stale.header'),
    message: t('displayPrograms.stale.message'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('displayPrograms.stale.reload') },
    accept: reloadProgram,
  })
}

function onFailure(e: unknown) {
  if (displayProgramErrorCode(e) === 'DISPLAY_PROGRAM_STALE') {
    onStale()
    return
  }
  if (e instanceof ApiError && e.status === 404) {
    router.push('/display-programs')
    return
  }
  toast.add(commonErrorToast(translateDisplayProgramError(e, t), toastGroup))
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

const onSave = (body: UpdateDisplayProgramRequest) =>
  run(async () => {
    await DisplayProgramsService.update(programId.value, body)
    await refresh(t('displayPrograms.messages.updated'))
  })

const onPublish = (body: UpdateDisplayProgramRequest | null) =>
  run(async () => {
    if (!program.value) return
    // Unsaved changes are saved first, and the new version is the one published.
    const version = body
      ? (await DisplayProgramsService.update(programId.value, body)).version
      : program.value.version
    await DisplayProgramsService.publish(programId.value, version)
    await refresh(t('displayPrograms.messages.published'))
  })

const onUnpublish = () =>
  run(async () => {
    if (!program.value) return
    await DisplayProgramsService.unpublish(programId.value, program.value.version)
    await refresh(t('displayPrograms.messages.unpublished'))
  })

const onEndEarly = () =>
  run(async () => {
    if (!program.value) return
    await DisplayProgramsService.endEarly(programId.value, program.value.version)
    await refresh(t('displayPrograms.messages.endedEarly'))
  })

const onDuplicate = () =>
  run(async () => {
    const copy = await DisplayProgramsService.duplicate(programId.value)
    toast.add(
      commonSuccessToast(t('displayPrograms.messages.duplicated', { code: copy.code }), toastGroup),
    )
    await router.push(`/display-programs/${copy.id}/edit`)
  })

const onRemove = () =>
  run(async () => {
    await DisplayProgramsService.delete(programId.value)
    toast.add(commonSuccessToast(t('displayPrograms.messages.deleted'), toastGroup))
    setTimeout(() => router.push('/display-programs'), 800)
  })
</script>
