<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog group="canvassLoadingDetailConfirm" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('canvassLoadings.viewLoading') }}
      </h1>
    </div>

    <ResponsiveCard>
      <template #content>
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <ProgressSpinner />
        </div>
        <Message v-else-if="!loading" severity="error">
          {{ t('canvassLoadings.messages.notFound') }}
        </Message>
        <div v-else>
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <Tag
              :severity="loadingStatusSeverity(loading.status)"
              :value="t(`canvassLoadings.status.${loading.status}`)"
            />
            <Tag
              severity="secondary"
              :value="t('canvassLoadings.labels.revision', { n: loading.revision })"
            />
          </div>

          <Message
            v-if="loading.status === 'rejected'"
            severity="warn"
            class="mb-4"
            data-testid="rejected-banner"
          >
            <div class="flex flex-wrap items-center gap-3">
              <span>{{ t('canvassLoadings.messages.rejectedBySalesman') }}</span>
              <Button
                v-if="canWrite"
                :label="t('canvassLoadings.actions.revise')"
                size="small"
                @click="router.push(`/canvass-loadings/${loading.id}/edit`)"
              />
            </div>
          </Message>

          <dl class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="item in headerItems" :key="item.label">
              <dt class="text-stone-500">{{ item.label }}</dt>
              <dd class="font-medium">{{ item.value }}</dd>
            </div>
          </dl>

          <div class="mt-4 flex flex-wrap gap-2">
            <Button
              v-if="canWrite && (loading.status === 'draft' || loading.status === 'rejected')"
              :label="t('common.actions.edit')"
              icon="pi pi-pencil"
              severity="secondary"
              @click="router.push(`/canvass-loadings/${loading.id}/edit`)"
            />
            <Button
              v-if="canWrite && ['draft', 'sent', 'rejected'].includes(loading.status)"
              :label="t('canvassLoadings.actions.cancelLoading')"
              icon="pi pi-times"
              severity="danger"
              outlined
              data-testid="cancel-loading"
              @click="onCancel"
            />
          </div>

          <Divider />

          <CanvassLoadingLinesTable
            :model-value="rows"
            readonly
            :show-change="loading.revision > 1 || loading.status === 'rejected'"
          />

          <template v-if="loading.rejections.length">
            <Divider />
            <h3 class="mb-3 text-sm font-semibold text-stone-700 sm:text-base">
              {{ t('canvassLoadings.sections.rejections') }}
            </h3>
            <CanvassRejectionPanel
              v-for="r in [...loading.rejections].reverse()"
              :key="r.revision"
              :rejection="r"
            />
          </template>

          <template v-if="(loading.revisions?.length ?? 0) > 1">
            <Divider />
            <h3 class="mb-3 text-sm font-semibold text-stone-700 sm:text-base">
              {{ t('canvassLoadings.sections.history') }}
            </h3>
            <CanvassRevisionHistory :loading="loading" />
          </template>
        </div>
      </template>
    </ResponsiveCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import CanvassRejectionPanel from '@/components/canvass/CanvassRejectionPanel.vue'
import CanvassRevisionHistory from '@/components/canvass/CanvassRevisionHistory.vue'
import CanvassLoadingLinesTable, { type LoadingRow } from './CanvassLoadingLinesTable.vue'
import DateFormat from '@/constants/dateFormat'
import { usePermissions } from '@/composables'
import { CanvassLoadingsService } from '@/services'
import { commonSuccessToast } from '@/services/toast'
import type { CanvassLoading } from '@/types/canvassLoading.type'
import { loadingStatusSeverity, toQty } from '@/utils/canvassHelpers'
import { canvassErrorToast } from '@/utils/canvassErrors'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const confirm = useConfirm()
const { canWrite } = usePermissions('/canvass-loadings')

const toastGroup = 'canvassLoadingDetail'
const loading = ref<CanvassLoading | undefined>()
const isLoading = ref(true)

const rows = computed<LoadingRow[]>(() =>
  (loading.value?.lines ?? []).map((l) => ({
    _key: String(l.productId),
    productId: l.productId,
    productCode: l.productCode,
    productName: l.productName,
    pinnedUom: l.pinnedUom,
    quantity: toQty(l.quantity),
    changed: l.changed,
    previousQuantity: l.previousQuantity,
  })),
)

const headerItems = computed(() => {
  const l = loading.value
  if (!l) return []
  const items = [
    { label: t('canvassLoadings.fields.no'), value: l.no },
    {
      label: t('canvassLoadings.fields.loadingDate'),
      value: dayjs(l.loadingDate).format(DateFormat.DATE),
    },
    { label: t('canvass.fields.branch'), value: l.branch.name },
    {
      label: t('canvass.fields.salesman'),
      value: l.salesman.nip ? `${l.salesman.name} (${l.salesman.nip})` : l.salesman.name,
    },
    { label: t('canvassLoadings.fields.sourceWarehouse'), value: l.sourceWarehouse.name },
    { label: t('canvass.fields.vanWarehouse'), value: l.vanWarehouse.name },
  ]
  const stamp = (label: string, at?: string) =>
    at ? [{ label, value: dayjs(at).format(DateFormat.DATE_TIME) }] : []
  return [
    ...items,
    ...stamp(t('canvassLoadings.fields.sentAt'), l.sentAt),
    ...stamp(t('canvassLoadings.fields.confirmedAt'), l.confirmedAt),
    ...stamp(t('canvassLoadings.fields.cancelledAt'), l.cancelledAt),
    ...(l.notes ? [{ label: t('canvass.fields.notes'), value: l.notes }] : []),
  ]
})

async function load(id: number) {
  isLoading.value = true
  try {
    loading.value = await CanvassLoadingsService.get(id)
  } catch (e) {
    toast.add(canvassErrorToast(e, t, toastGroup))
    loading.value = undefined
  } finally {
    isLoading.value = false
  }
}

function onCancel() {
  confirm.require({
    group: 'canvassLoadingDetailConfirm',
    header: t('canvassLoadings.confirm.cancelHeader'),
    message: t('canvassLoadings.confirm.cancelMessage'),
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('canvassLoadings.actions.cancelLoading'), severity: 'danger' },
    accept: async () => {
      try {
        await CanvassLoadingsService.cancel(loading.value!.id)
        toast.add(commonSuccessToast(t('canvassLoadings.messages.cancelled'), toastGroup))
        await load(loading.value!.id)
      } catch (e) {
        toast.add(canvassErrorToast(e, t, toastGroup))
      }
    },
  })
}

onMounted(() => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    router.push('/canvass-loadings')
    return
  }
  void load(id)
})
</script>
