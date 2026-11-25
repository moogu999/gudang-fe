<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog group="surveyStale" />

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/surveys')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ survey ? survey.name : t('surveys.editTitle') }}
      </h1>
      <template v-if="survey">
        <span class="font-mono text-sm text-stone-500">{{ survey.code }}</span>
        <SurveyStatusTag :status="survey.displayStatus" />
        <Tag :value="t(`surveys.types.${survey.type}`)" severity="info" />
      </template>
    </div>

    <div v-if="isLoadingSurvey && !survey" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <!-- Remounted after each save: the form reads the survey only on mount. -->
    <SurveyForm
      v-else-if="survey"
      :key="formKey"
      ref="form"
      v-model:tab="activeTab"
      mode="edit"
      :survey="survey"
      :is-loading="isSaving"
      :readonly="!canWrite || survey.displayStatus === 'ended'"
      :can-write="canWrite"
      :can-publish="canPublish"
      :toast-group="toastGroup"
      @save="onSave"
      @publish="onPublish"
      @unpublish="onUnpublish"
      @end-early="onEndEarly"
      @duplicate="onDuplicate"
      @remove="onRemove"
      @cancel="router.push('/surveys')"
    >
      <template #history>
        <SurveyHistoryTab
          :survey-id="survey.id"
          :reload-key="historyKey"
          :toast-group="toastGroup"
        />
      </template>
    </SurveyForm>

    <ResponsiveCard v-else>
      <template #content>
        <Message severity="error">{{ t('surveys.messages.notFound') }}</Message>
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
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { SurveysService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants/permissions'
import { ApiError } from '@/types/api.type'
import type { Survey, UpdateSurveyRequest } from '@/types/survey.type'
import { isReloadError, surveyErrorCode, translateSurveyError } from './surveyErrors'
import SurveyForm from './SurveyForm.vue'
import SurveyHistoryTab from './components/SurveyHistoryTab.vue'
import SurveyStatusTag from './components/SurveyStatusTag.vue'

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { canWrite, hasPermission } = usePermissions('/surveys')
const canPublish = hasPermission(PERMISSIONS.SURVEY_PUBLISH)

const toastGroup = 'surveyEdit'
const survey = ref<Survey | undefined>()
const isLoadingSurvey = ref(false)
const isSaving = ref(false)
const formKey = ref(0)
const historyKey = ref(0)
const activeTab = ref('settings')
const form = ref<InstanceType<typeof SurveyForm> | null>(null)

// The route param, so duplicating (which lands on another survey's edit page) reloads in place.
const surveyId = computed(() => Number(route.params.id))

async function reloadSurvey() {
  isLoadingSurvey.value = true
  try {
    survey.value = await SurveysService.get(surveyId.value)
    formKey.value++
    historyKey.value++
  } catch (e) {
    survey.value = undefined
    toast.add(commonErrorToast(translateSurveyError(e, t, te), toastGroup))
  } finally {
    isLoadingSurvey.value = false
  }
}

watch(
  surveyId,
  async (id) => {
    if (isNaN(id)) {
      router.push('/surveys')
      return
    }
    activeTab.value = 'settings'
    await reloadSurvey()
  },
  { immediate: true },
)

/** Re-reads the stored document rather than trusting a response, so the form shows what was kept. */
async function refresh(message: string) {
  survey.value = await SurveysService.get(surveyId.value)
  formKey.value++
  historyKey.value++
  toast.add(commonSuccessToast(message, toastGroup))
}

function onFailure(e: unknown) {
  const code = surveyErrorCode(e)
  if (code === 'SURVEY_STALE') {
    confirm.require({
      group: 'surveyStale',
      header: t('surveys.stale.header'),
      message: t('surveys.stale.message'),
      icon: 'pi pi-exclamation-triangle',
      rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
      acceptProps: { label: t('surveys.stale.reload') },
      accept: reloadSurvey,
    })
    return
  }
  if (e instanceof ApiError && e.status === 404) {
    router.push('/surveys')
    return
  }
  toast.add(commonErrorToast(translateSurveyError(e, t, te), toastGroup))
  // A locked or unknown id means the form holds an out-of-date document.
  if (isReloadError(code)) reloadSurvey()
  else form.value?.applyError(e)
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

const onSave = (body: UpdateSurveyRequest) =>
  run(async () => {
    await SurveysService.update(surveyId.value, body)
    await refresh(t('surveys.messages.updated'))
  })

const onPublish = (body: UpdateSurveyRequest | null) =>
  run(async () => {
    if (!survey.value) return
    // Unsaved changes are saved first, and the new version is the one published.
    const version = body
      ? (await SurveysService.update(surveyId.value, body)).version
      : survey.value.version
    await SurveysService.publish(surveyId.value, version)
    await refresh(t('surveys.messages.published'))
  })

const onUnpublish = () =>
  run(async () => {
    if (!survey.value) return
    await SurveysService.unpublish(surveyId.value, survey.value.version)
    await refresh(t('surveys.messages.unpublished'))
  })

const onEndEarly = () =>
  run(async () => {
    if (!survey.value) return
    await SurveysService.endEarly(surveyId.value, survey.value.version)
    await refresh(t('surveys.messages.endedEarly'))
  })

const onDuplicate = () =>
  run(async () => {
    const copy = await SurveysService.duplicate(surveyId.value)
    toast.add(commonSuccessToast(t('surveys.messages.duplicated', { code: copy.code }), toastGroup))
    if (copy.scopeCleared) {
      toast.add({
        severity: 'warn',
        summary: t('surveys.messages.scopeCleared'),
        life: 6000,
        group: toastGroup,
      })
    }
    await router.push(`/surveys/${copy.id}/edit`)
  })

const onRemove = () =>
  run(async () => {
    await SurveysService.delete(surveyId.value)
    toast.add(commonSuccessToast(t('surveys.messages.deleted'), toastGroup))
    setTimeout(() => router.push('/surveys'), 800)
  })
</script>
