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
        {{ t('competitorProducts.addProduct') }}
      </h1>
    </div>

    <div v-if="isLoadingRecommendation" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>
    <CompetitorProductForm
      v-else
      ref="form"
      :toast-group="toastGroup"
      mode="add"
      :recommendation="recommendation"
      :is-loading="isLoading"
      @submit="onSubmit"
      @cancel="router.back()"
      @photo-error="(m: string) => toast.add(commonErrorToast(m, toastGroup))"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import {
  CompetitorProductRecommendationsService,
  CompetitorProductsService,
} from '@/services'
import { commonErrorToast, commonSuccessToast, commonWarnToast } from '@/services/toast'
import { usePostSaveNavigation } from '@/composables'
import type { CompetitorProduct, CompetitorProductRecommendation } from '@/types'
import CompetitorProductForm, { type CompetitorProductSubmit } from './CompetitorProductForm.vue'
import { competitorProductErrorCode, competitorProductErrorKey } from './competitorProductErrors'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { afterCreate } = usePostSaveNavigation('/competitor-products')

const toastGroup = 'competitorProductCreate'
const RECOMMENDATIONS_TAB = '/competitor-products?tab=recommendations'

const form = ref<InstanceType<typeof CompetitorProductForm> | null>(null)
const isLoading = ref(false)
const recommendation = ref<CompetitorProductRecommendation | undefined>()

const recommendationId = Number(route.query.recommendationId) || undefined
const isLoadingRecommendation = ref(!!recommendationId)

function backToRecommendations(message: string) {
  toast.add(commonErrorToast(message, toastGroup))
  setTimeout(() => router.replace(RECOMMENDATIONS_TAB), 1500)
}

onMounted(async () => {
  if (!recommendationId) return
  try {
    const loaded = await CompetitorProductRecommendationsService.get(recommendationId)
    if (loaded.status !== 'pending') {
      backToRecommendations(t('competitorProducts.recommendations.notPending'))
      return
    }
    recommendation.value = loaded
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingRecommendation.value = false
  }
})

async function onSubmit({ payload, carryOverIds, similarIds }: CompetitorProductSubmit) {
  isLoading.value = true
  try {
    let saved: CompetitorProduct
    if (recommendation.value) {
      saved = await CompetitorProductRecommendationsService.createProduct(
        payload,
        [recommendation.value.id, ...similarIds],
        carryOverIds,
      )
    } else {
      saved = await CompetitorProductsService.create(payload)
    }
    toast.add(
      commonSuccessToast(t('competitorProducts.messages.created', { code: saved.code }), toastGroup),
    )

    const failed = (await form.value?.flushPhotos(saved.id)) ?? 0
    if (failed > 0) {
      toast.add(
        commonWarnToast(t('competitorProducts.messages.photoUploadFailed', { n: failed }), toastGroup),
      )
    }
    afterCreate({ id: saved.id })
  } catch (e) {
    const key = competitorProductErrorKey(e)
    const message = key ? t(key) : undefined
    if (competitorProductErrorCode(e) === 'recommendation_not_pending') {
      backToRecommendations(message!)
    } else if (!(message && form.value?.applyServerError(message, e))) {
      toast.add(commonErrorToast(message ?? e, toastGroup))
    }
  } finally {
    isLoading.value = false
  }
}
</script>
