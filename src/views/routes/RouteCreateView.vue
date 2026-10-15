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
        {{ t('routes.createRoute') }}
      </h1>
    </div>

    <RouteForm
      ref="form"
      mode="add"
      :is-loading="isLoading"
      @submit="onSubmit"
      @cancel="router.back()"
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
import { RoutesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { usePostSaveNavigation } from '@/composables'
import type { CreateRouteRequest } from '@/types'
import RouteForm from './RouteForm.vue'
import { routeErrorCode, routeErrorField, routeErrorKey, translateRouteError } from './routeErrors'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const { afterCreate } = usePostSaveNavigation('/routes')

const toastGroup = 'routeCreate'
const isLoading = ref(false)
const form = ref<InstanceType<typeof RouteForm>>()

async function onSubmit(body: CreateRouteRequest) {
  isLoading.value = true
  try {
    const route = await RoutesService.create(body)
    toast.add(commonSuccessToast(t('routes.messages.created', { code: route.code }), toastGroup))
    // A route has no status, so it lands on its edit page to add customers.
    afterCreate({ id: route.id })
  } catch (e) {
    const code = routeErrorCode(e)
    const field = routeErrorField(code)
    const key = routeErrorKey(code)
    if (field && key) form.value?.setFieldError(field, t(key))
    else toast.add(commonErrorToast(translateRouteError(e, t), toastGroup))
  } finally {
    isLoading.value = false
  }
}
</script>
