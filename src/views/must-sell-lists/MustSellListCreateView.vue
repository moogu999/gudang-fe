<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/must-sell-lists')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('mustSellLists.list.create') }}
      </h1>
    </div>

    <MustSellListForm
      mode="add"
      :is-loading="isLoading"
      :can-write="true"
      :toast-group="toastGroup"
      @create="onCreate"
      @cancel="router.push('/must-sell-lists')"
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
import { MustSellListsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePostSaveNavigation } from '@/composables'
import type { CreateMustSellListRequest } from '@/types/mustSellList.type'
import { errorField, mslErrorCode, translateMslError } from './mustSellListHelpers'
import MustSellListForm from './MustSellListForm.vue'

const { t, te } = useI18n()
const router = useRouter()
const toast = useToast()
const { afterCreate } = usePostSaveNavigation('/must-sell-lists')

const toastGroup = 'mustSellListCreate'
const isLoading = ref(false)

async function onCreate(body: CreateMustSellListRequest, setCodeError: (message: string) => void) {
  isLoading.value = true
  try {
    const saved = await MustSellListsService.create(body)
    toast.add(
      commonSuccessToast(t('mustSellLists.messages.created', { code: saved.code }), toastGroup),
    )
    afterCreate(saved)
  } catch (e) {
    const translated = translateMslError(e, t, te)
    // A taken code belongs on the Code field, not in a toast.
    if (errorField(mslErrorCode(e)) === 'code') {
      setCodeError(translated instanceof Error ? translated.message : String(translated))
    } else {
      toast.add(commonErrorToast(translated, toastGroup))
    }
  } finally {
    isLoading.value = false
  }
}
</script>
