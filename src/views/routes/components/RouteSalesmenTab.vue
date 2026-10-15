<template>
  <div>
    <DataTable :value="rows" :loading="loading" data-key="id" class="text-sm">
      <Column :header="t('routes.salesmen.columns.salesman')">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <span
              class="bg-[var(--p-primary-100)] text-[var(--p-primary-700)] flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
            >
              {{ initials(data.employeeName) }}
            </span>
            <div>
              <div>{{ data.employeeName }}</div>
              <div class="text-xs text-stone-500">{{ data.nip }}</div>
            </div>
          </div>
        </template>
      </Column>
      <Column field="startDate" :header="t('routes.salesmen.columns.from')" />
      <Column :header="t('routes.salesmen.columns.to')">
        <template #body="{ data }">{{ data.endDate ?? '—' }}</template>
      </Column>
      <Column :header="t('routes.salesmen.columns.status')">
        <template #body="{ data }">
          <Tag
            :value="t(`routes.salesmen.status.${data.status}`)"
            :severity="severity(data.status)"
          />
        </template>
      </Column>
      <Column v-if="canWrite" :header="t('common.labels.actions')">
        <template #body="{ data }">
          <Button
            v-if="data.status === 'pending'"
            :label="t('routes.salesmen.cancelPending')"
            size="small"
            severity="secondary"
            text
            data-testid="cancel-pending"
            @click="confirmCancel"
          />
        </template>
      </Column>
      <template #empty>
        <div class="py-6 text-center text-stone-500">{{ t('routes.salesmen.empty') }}</div>
      </template>
    </DataTable>

    <ConfirmDialog :group="confirmGroup" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import ConfirmDialog from 'primevue/confirmdialog'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { RoutesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { HolderHistoryRow, HolderStatus, Route } from '@/types'
import { translateRouteError } from '../routeErrors'

const props = defineProps<{
  route: Route
  canWrite: boolean
  /** Bumped by the parent after each change, so the list re-reads. */
  reloadKey: number
  toastGroup: string
}>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const confirmGroup = 'routeSalesmenConfirm'

const rows = ref<HolderHistoryRow[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    rows.value = await RoutesService.listSalesmen(props.route.id)
  } catch (e) {
    toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
  } finally {
    loading.value = false
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function severity(status: HolderStatus): 'success' | 'info' | 'secondary' {
  if (status === 'current') return 'success'
  if (status === 'pending') return 'info'
  return 'secondary'
}

function confirmCancel() {
  confirm.require({
    group: confirmGroup,
    header: t('routes.salesmen.cancelHeader'),
    message: t('routes.salesmen.cancelMessage'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.actions.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('routes.salesmen.cancelPending') },
    accept: async () => {
      try {
        await RoutesService.cancelPendingHandover(props.route.id)
        toast.add(commonSuccessToast(t('routes.messages.pendingCancelled'), props.toastGroup))
        emit('changed')
      } catch (e) {
        toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
      }
    },
  })
}

onMounted(load)
watch(() => props.reloadKey, load)
</script>
