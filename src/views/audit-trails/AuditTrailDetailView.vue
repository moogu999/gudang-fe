<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        aria-label="Go back"
        @click="router.back()"
      />
      <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
        {{ t('auditTrails.detail.title') }}
      </h1>
    </div>

    <div v-if="isLoadingData" class="flex items-center justify-center p-8">
      <i class="pi pi-spinner pi-spin text-4xl" />
    </div>

    <template v-else-if="auditTrail">
      <ResponsiveCard class="mb-4">
        <template #content>
          <div class="flex flex-wrap gap-4 text-sm">
            <div>
              <span class="font-semibold">{{ t('auditTrails.columns.referenceType') }}:</span>
              {{ t(`auditTrails.references.${auditTrail.referenceType}`) }}
            </div>
            <div>
              <span class="font-semibold">{{ t('auditTrails.columns.referenceId') }}:</span>
              {{ auditTrail.referenceId }}
            </div>
            <div>
              <span class="font-semibold">{{ t('auditTrails.detail.changedBy') }}:</span>
              {{ auditTrail.createdByUser?.email ?? '—' }}
            </div>
            <div>
              <span class="font-semibold">{{ t('auditTrails.detail.createdAt') }}:</span>
              {{ dayjs(auditTrail.createdAt).format(DateFormat.DATE_TIME) }}
            </div>
            <div class="w-full">
              <span class="font-semibold">{{ t('auditTrails.columns.description') }}:</span>
              {{ auditTrail.description }}
            </div>
          </div>
        </template>
      </ResponsiveCard>

      <ResponsiveCard>
        <template #content>
          <AuditTrailDiffViewer :prev="auditTrail.prev" :curr="auditTrail.curr" />
        </template>
      </ResponsiveCard>
    </template>

    <ResponsiveCard v-else>
      <template #content>
        <Message severity="error">{{ t('auditTrails.detail.notFound') }}</Message>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import dayjs from 'dayjs'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { commonErrorToast } from '@/services/toast'
import { AuditTrailsService } from '@/services/auditTrails.service'
import type { AuditTrail } from '@/types/auditTrail.type'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import DateFormat from '@/constants/dateFormat'
import AuditTrailDiffViewer from './components/AuditTrailDiffViewer.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const toastGroup = 'auditTrailDetail'
const isLoadingData = ref(false)
const auditTrail = ref<AuditTrail | undefined>(undefined)

onMounted(async () => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/audit-trails')
    return
  }
  isLoadingData.value = true
  try {
    auditTrail.value = await AuditTrailsService.getById(id)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoadingData.value = false
  }
})
</script>
