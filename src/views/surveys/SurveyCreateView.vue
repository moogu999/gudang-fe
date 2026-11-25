<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/surveys')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('surveys.list.create') }}
      </h1>
    </div>

    <SurveyForm
      ref="form"
      v-model:tab="tab"
      mode="add"
      :is-loading="isLoading"
      :can-write="true"
      :toast-group="toastGroup"
      @create="onCreate"
      @cancel="router.push('/surveys')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { SurveysService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePostSaveNavigation } from '@/composables'
import type { CreateSurveyRequest } from '@/types/survey.type'
import { errorField, surveyErrorCode, translateSurveyError } from './surveyErrors'
import SurveyForm from './SurveyForm.vue'

const { t, te } = useI18n()
const router = useRouter()
const toast = useToast()
const { afterCreate } = usePostSaveNavigation('/surveys')

const toastGroup = 'surveyCreate'
const isLoading = ref(false)
const tab = ref('settings')
const form = ref<InstanceType<typeof SurveyForm> | null>(null)

async function onCreate(body: CreateSurveyRequest, setCodeError: (message: string) => void) {
  isLoading.value = true
  try {
    const saved = await SurveysService.create(body)
    toast.add(commonSuccessToast(t('surveys.messages.created', { code: saved.code }), toastGroup))
    afterCreate(saved)
  } catch (e) {
    const translated = translateSurveyError(e, t, te)
    // A taken code belongs on the Code field, not in a toast.
    if (errorField(surveyErrorCode(e)) === 'code') {
      setCodeError(translated instanceof Error ? translated.message : String(translated))
    } else {
      toast.add(commonErrorToast(translated, toastGroup))
      form.value?.applyError(e)
    }
  } finally {
    isLoading.value = false
  }
}
</script>
