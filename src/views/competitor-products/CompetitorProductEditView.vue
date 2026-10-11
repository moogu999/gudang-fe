<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        :aria-label="t('common.actions.back')"
        @click="router.push('/competitor-products')"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ product ? `${product.code} · ${product.name}` : t('competitorProducts.editProduct') }}
      </h1>
      <Tag
        v-if="product"
        :value="product.isActive ? t('common.labels.active') : t('common.labels.inactive')"
        :severity="product.isActive ? 'success' : 'secondary'"
      />
    </div>

    <div v-if="isLoadingProduct && !product" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <!-- Remounted after each save: the form reads the product only on mount. -->
    <CompetitorProductForm
      v-else-if="product"
      :key="formKey"
      ref="form"
      :toast-group="toastGroup"
      mode="edit"
      :product="product"
      :is-loading="isSaving"
      :readonly="!canWrite"
      @submit="onSubmit"
      @cancel="router.push('/competitor-products')"
      @photo-error="(m: string) => toast.add(commonErrorToast(m, toastGroup))"
    />

    <ResponsiveCard v-else>
      <template #content>
        <Message severity="error">{{ t('competitorProducts.messages.notFound') }}</Message>
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
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { CompetitorProductsService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePermissions } from '@/composables'
import type { CompetitorProduct } from '@/types'
import CompetitorProductForm, { type CompetitorProductSubmit } from './CompetitorProductForm.vue'
import { competitorProductErrorKey } from './competitorProductErrors'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { canWrite } = usePermissions('/competitor-products')

const toastGroup = 'competitorProductEdit'
const form = ref<InstanceType<typeof CompetitorProductForm> | null>(null)
const product = ref<CompetitorProduct | undefined>()
const isLoadingProduct = ref(false)
const isSaving = ref(false)
const formKey = ref(0)

const productId = Number(route.params.id)

async function load() {
  isLoadingProduct.value = true
  try {
    product.value = await CompetitorProductsService.get(productId)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingProduct.value = false
  }
}

onMounted(async () => {
  if (isNaN(productId)) {
    router.push('/competitor-products')
    return
  }
  await load()
})

async function onSubmit({ payload }: CompetitorProductSubmit) {
  if (!product.value) return
  isSaving.value = true
  try {
    await CompetitorProductsService.update(product.value.id, payload)
    // Re-read rather than trusting the update response, so the form shows exactly what was stored.
    product.value = await CompetitorProductsService.get(product.value.id)
    formKey.value++
    toast.add(commonSuccessToast(t('competitorProducts.messages.updated'), toastGroup))
  } catch (e) {
    const key = competitorProductErrorKey(e)
    const message = key ? t(key) : undefined
    if (!(message && form.value?.applyServerError(message, e))) {
      toast.add(commonErrorToast(message ?? e, toastGroup))
    }
  } finally {
    isSaving.value = false
  }
}
</script>
