<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/display-programs')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('displayPrograms.list.create') }}
      </h1>
    </div>

    <Tabs value="settings">
      <TabList>
        <Tab value="settings">{{ t('displayPrograms.tabs.settings') }}</Tab>
        <Tab v-tooltip.top="t('displayPrograms.tabs.saveFirst')" value="customers" disabled>{{
          t('displayPrograms.tabs.customers')
        }}</Tab>
        <Tab v-tooltip.top="t('displayPrograms.tabs.saveFirst')" value="history" disabled>{{
          t('displayPrograms.tabs.history')
        }}</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="settings">
          <DisplayProgramForm
            ref="form"
            mode="add"
            :is-loading="isLoading"
            :can-write="true"
            :toast-group="toastGroup"
            @create="onCreate"
            @cancel="router.push('/display-programs')"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { DisplayProgramsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePostSaveNavigation } from '@/composables'
import type { CreateDisplayProgramRequest } from '@/types/displayProgram.type'
import {
  displayProgramErrorCode,
  displayProgramErrorField,
  translateDisplayProgramError,
} from './displayProgramErrors'
import DisplayProgramForm from './DisplayProgramForm.vue'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const { afterCreate } = usePostSaveNavigation('/display-programs')

const toastGroup = 'displayProgramCreate'
const isLoading = ref(false)
const form = ref<InstanceType<typeof DisplayProgramForm> | null>(null)

async function onCreate(
  body: CreateDisplayProgramRequest,
  setCodeError: (message: string) => void,
) {
  isLoading.value = true
  try {
    const saved = await DisplayProgramsService.create(body)
    toast.add(
      commonSuccessToast(t('displayPrograms.messages.created', { code: saved.code }), toastGroup),
    )
    // Photos picked before the program existed upload now. A failure doesn't undo the create.
    const failed = (await form.value?.flushPhotos(saved.id)) ?? 0
    if (failed > 0) {
      toast.add({
        severity: 'warn',
        summary: t('displayPrograms.messages.photosFailed', { n: failed }),
        life: 6000,
        group: toastGroup,
      })
    }
    afterCreate(saved)
  } catch (e) {
    const translated = translateDisplayProgramError(e, t)
    // A taken code belongs on the Code field, not in a toast.
    if (displayProgramErrorField(displayProgramErrorCode(e)) === 'code') {
      setCodeError(translated instanceof Error ? translated.message : String(translated))
    } else {
      toast.add(commonErrorToast(translated, toastGroup))
    }
  } finally {
    isLoading.value = false
  }
}
</script>
