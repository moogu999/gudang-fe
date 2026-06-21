<template>
  <div class="p-2 sm:p-4 lg:p-10">
    <Toast position="top-center" :group="toastGroup" />

    <div class="mb-4 flex items-center gap-3">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.back()" />
      <h1 class="text-base font-bold sm:text-lg md:text-2xl">
        {{ t('deliveryConfirmations.createTitle') }}
      </h1>
    </div>

    <ResponsiveCard class="mb-4">
      <template #content>
        <div class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <!-- DC Number mode -->
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-semibold">
              {{ t('deliveryConfirmations.numberMode.label') }}
            </label>
            <div class="flex gap-2">
              <Button
                type="button"
                :label="t('deliveryConfirmations.numberMode.auto')"
                :severity="numberMode === 'auto' ? 'primary' : 'secondary'"
                size="small"
                @click="numberMode = 'auto'"
              />
              <Button
                type="button"
                :label="t('deliveryConfirmations.numberMode.manual')"
                :severity="numberMode === 'manual' ? 'primary' : 'secondary'"
                size="small"
                @click="numberMode = 'manual'"
              />
            </div>
            <div v-if="numberMode === 'auto'" class="mt-1 flex flex-col gap-1">
              <InputText
                :value="previewLoading ? '' : previewNo"
                :placeholder="previewLoading ? t('common.messages.loading') : ''"
                readonly
                class="w-full sm:w-80"
              />
              <small class="text-surface-500">
                {{ t('deliveryConfirmations.numberMode.assignedOnSave') }}
              </small>
            </div>
            <InputText
              v-else
              v-model="manualNo"
              class="mt-1 w-full sm:w-80"
              :placeholder="t('deliveryConfirmations.numberMode.manualPlaceholder')"
            />
          </div>

          <!-- Confirmation Date -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold" for="confirmationDate">
              {{ t('deliveryConfirmations.fields.confirmationDate') }}
            </label>
            <DatePicker
              id="confirmationDate"
              v-model="confirmationDate"
              date-format="dd/mm/yy"
              class="w-full"
              show-icon
            />
          </div>

          <!-- Notes -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold" for="dcNotes">
              {{ t('deliveryConfirmations.fields.notes') }}
            </label>
            <Textarea id="dcNotes" v-model="notes" rows="2" class="w-full" auto-resize />
          </div>

          <!-- Delivery Note picker -->
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-semibold">
              {{ t('deliveryConfirmations.picker.title') }}
              <span class="ml-1 text-red-500">*</span>
            </label>
            <Message severity="info" :closable="false" class="mb-1 text-sm">
              {{ t('deliveryConfirmations.picker.info') }}
            </Message>
            <InfiniteSelect
              v-model="selectedDnId"
              option-label="no"
              option-value="id"
              :fetch-fn="(q) => DeliveryConfirmationsService.listAvailableDeliveryNotes(q)"
              :placeholder="t('deliveryConfirmations.picker.placeholder')"
              sort-by="no"
              sort-operator="asc"
            >
              <template #option="{ option }">
                <div class="flex flex-col">
                  <span class="font-medium">{{ option.no }}</span>
                  <span class="text-xs text-stone-500">
                    {{ dayjs(option.deliveryDate).format(DateFormat.DATE) }}
                    <template v-if="option.driverName"> · {{ option.driverName }}</template>
                    <template v-if="option.vehiclePlate"> · {{ option.vehiclePlate }}</template>
                    · {{ option.doCount }} DO
                  </span>
                </div>
              </template>
            </InfiniteSelect>
          </div>
        </div>
      </template>
    </ResponsiveCard>

    <div class="flex justify-end gap-3">
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        outlined
        @click="router.back()"
      />
      <Button
        :label="t('deliveryConfirmations.actions.create')"
        icon="pi pi-check"
        :loading="submitting"
        @click="onSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import {
  DeliveryConfirmationsService,
  NumberSeriesService,
  commonSuccessToast,
  commonErrorToast,
} from '@/services'
import DateFormat from '@/constants/dateFormat'
import dayjs from 'dayjs'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const toastGroup = 'deliveryConfirmationCreate'

const selectedDnId = ref<number | null>(null)
const confirmationDate = ref<Date>(new Date())
const notes = ref('')
const numberMode = ref<'auto' | 'manual'>('auto')
const manualNo = ref('')
const previewNo = ref('')
const previewLoading = ref(false)
const submitting = ref(false)

async function loadPreview() {
  previewLoading.value = true
  try {
    const res = await NumberSeriesService.preview('delivery_confirmations')
    previewNo.value = res.code
  } catch {
    previewNo.value = ''
  } finally {
    previewLoading.value = false
  }
}

onMounted(loadPreview)

async function onSubmit() {
  if (selectedDnId.value === null) {
    toast.add({
      severity: 'warn',
      summary: t('deliveryConfirmations.messages.noDnSelected'),
      group: toastGroup,
      life: 3000,
    })
    return
  }

  if (numberMode.value === 'manual' && !manualNo.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: t('deliveryConfirmations.messages.noManualNo'),
      group: toastGroup,
      life: 3000,
    })
    return
  }

  submitting.value = true
  try {
    const res = await DeliveryConfirmationsService.create({
      no: numberMode.value === 'manual' ? manualNo.value.trim() : null,
      deliveryNoteId: selectedDnId.value,
      confirmationDate: dayjs(confirmationDate.value).format('YYYY-MM-DD'),
      notes: notes.value.trim() || null,
    })
    toast.add(
      commonSuccessToast(
        t('deliveryConfirmations.messages.createSuccess', { no: res.no }),
        toastGroup,
      ),
    )
    setTimeout(() => {
      router.push({ name: 'DeliveryConfirmationDetail', params: { id: res.id } })
    }, 1200)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    submitting.value = false
  }
}
</script>
