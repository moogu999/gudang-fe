<template>
  <Dialog
    :visible="true"
    :header="t('routes.move.title')"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '95vw' }"
    :style="{ width: '36rem' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <p class="mb-4 text-sm text-stone-600">{{ option.name }} · {{ option.code }}</p>

    <div class="mb-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <div class="flex-1 rounded-md border p-3" data-testid="from-route">
        <div class="text-xs text-stone-500 uppercase">{{ t('routes.move.from') }}</div>
        <div class="font-mono font-semibold">{{ option.teamRoute?.routeCode }}</div>
        <div class="text-sm">{{ option.teamRoute?.routeName }}</div>
        <div class="text-xs text-stone-500">
          {{ option.teamRoute?.holderName ?? t('routes.noSalesman') }}
        </div>
      </div>
      <i class="pi pi-arrow-right self-center text-stone-400 max-sm:rotate-90" />
      <div class="border-[var(--p-primary-300)] flex-1 rounded-md border p-3" data-testid="to-route">
        <div class="text-xs text-stone-500 uppercase">{{ t('routes.move.to') }}</div>
        <div class="font-mono font-semibold">{{ route.code }}</div>
        <div class="text-sm">{{ route.name }}</div>
        <div class="text-xs text-stone-500">
          {{ route.holder?.name ?? t('routes.noSalesman') }}
        </div>
      </div>
    </div>

    <Message severity="info" size="small" variant="simple">{{ t('routes.move.note') }}</Message>

    <template #footer>
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isSaving"
        @click="emit('close')"
      />
      <Button
        :label="t('routes.move.confirm')"
        :icon="isSaving ? 'pi pi-spinner pi-spin' : ''"
        :disabled="isSaving"
        data-testid="confirm-move"
        @click="onConfirm"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { RoutesService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import type { Route, RouteCustomerOption } from '@/types'
import { translateRouteError } from '../routeErrors'

const props = defineProps<{
  route: Route
  option: RouteCustomerOption
  toastGroup: string
}>()
const emit = defineEmits<{ close: []; moved: [] }>()

const { t } = useI18n()
const toast = useToast()
const isSaving = ref(false)

async function onConfirm() {
  const source = props.option.teamRoute
  if (!source) return
  isSaving.value = true
  try {
    // The options list carries the route a customer sits in, not the row that holds it.
    const rows = await RoutesService.listCustomers(source.routeId)
    const row = rows.find((r) => r.customer.id === props.option.id)
    if (!row) throw new Error(t('routes.move.notFound'))
    await RoutesService.moveCustomer(props.route.id, row.routeCustomerId)
    toast.add(commonSuccessToast(t('routes.messages.customerMoved'), props.toastGroup))
    emit('moved')
    emit('close')
  } catch (e) {
    toast.add(commonErrorToast(translateRouteError(e, t), props.toastGroup))
  } finally {
    isSaving.value = false
  }
}
</script>
