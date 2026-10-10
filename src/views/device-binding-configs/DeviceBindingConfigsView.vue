<template>
  <ResponsiveCard>
    <template #content>
      <div v-if="isLoading" class="flex justify-center py-8">
        <ProgressSpinner style="width: 2rem; height: 2rem" />
      </div>

      <form
        v-else-if="config"
        class="flex max-w-2xl flex-col gap-5"
        data-testid="device-binding-config-form"
        @submit.prevent="onSave"
      >
        <div>
          <h2 class="text-base font-semibold sm:text-lg">{{ t('deviceBinding.config.title') }}</h2>
          <p v-if="!config.saved" class="text-sm text-stone-500">
            {{ t('deviceBinding.config.defaults') }}
          </p>
        </div>

        <!-- Approval flow -->
        <div class="flex flex-col gap-1">
          <label for="dbFlow" class="text-sm font-semibold">{{
            t('deviceBinding.config.flow')
          }}</label>
          <Select
            v-model="form.approvalFlowId"
            input-id="dbFlow"
            :options="flowOptions"
            option-label="label"
            option-value="value"
            :disabled="!canWrite"
            class="w-full md:w-80"
          />
          <small class="text-stone-500">{{ t('deviceBinding.config.flowHelp') }}</small>
        </div>

        <!-- Numbers -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div v-for="field in NUMBER_FIELDS" :key="field.key" class="flex flex-col gap-1">
            <label :for="`db-${field.key}`" class="text-sm font-semibold">
              {{ t(`deviceBinding.config.${field.key}`) }}
            </label>
            <InputNumber
              v-model="form[field.key]"
              :input-id="`db-${field.key}`"
              :min="field.min"
              :max="field.max"
              :use-grouping="false"
              show-buttons
              :disabled="!canWrite"
              class="w-full"
            />
            <small class="text-stone-500">
              {{ t('deviceBinding.config.range', { min: field.min, max: field.max }) }}
            </small>
          </div>
        </div>

        <!-- Versions -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div v-for="field in VERSION_FIELDS" :key="field.key" class="flex flex-col gap-1">
            <label :for="`db-${field.key}`" class="text-sm font-semibold">
              {{
                t(`deviceBinding.config.${field.kind}`, {
                  platform: field.platform === 'ios' ? 'iOS' : 'Android',
                })
              }}
            </label>
            <InputText
              v-model="form[field.key]"
              :id="`db-${field.key}`"
              :placeholder="field.required ? '' : t('deviceBinding.config.noMinimum')"
              :disabled="!canWrite"
              :invalid="!!errors[field.key]"
              class="w-full"
            />
            <small v-if="errors[field.key]" class="text-red-500">{{ errors[field.key] }}</small>
          </div>
        </div>

        <div v-if="canWrite">
          <Button
            type="submit"
            :label="t('common.actions.save')"
            icon="pi pi-check"
            :loading="isSaving"
            data-testid="device-binding-config-save"
          />
        </div>
      </form>
    </template>
  </ResponsiveCard>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import { ApprovalsService, DeviceBindingConfigService } from '@/services'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import ToastLife from '@/constants/toastLife'
import { usePermissions } from '@/composables'
import type { ApprovalFlow } from '@/types'
import type { DeviceBindingConfig, DeviceBindingConfigInput } from '@/types/deviceBinding.type'

const props = defineProps<{
  /** Toast group of the host page. */
  toastGroup: string
}>()

type NumberKey = 'activationCodeTtlDays' | 'syncOnlyDays' | 'maxPinAttempts' | 'lockoutMinutes'
type VersionKey = 'minAppVersionAndroid' | 'minAppVersionIos' | 'minOsAndroid' | 'minOsIos'

// The same bounds as the table's CHECK constraints.
const NUMBER_FIELDS: { key: NumberKey; min: number; max: number }[] = [
  { key: 'activationCodeTtlDays', min: 1, max: 30 },
  { key: 'syncOnlyDays', min: 0, max: 14 },
  { key: 'maxPinAttempts', min: 3, max: 10 },
  { key: 'lockoutMinutes', min: 1, max: 1440 },
]

const VERSION_FIELDS: {
  key: VersionKey
  kind: 'minApp' | 'minOs'
  platform: 'android' | 'ios'
  required: boolean
}[] = [
  { key: 'minAppVersionAndroid', kind: 'minApp', platform: 'android', required: false },
  { key: 'minAppVersionIos', kind: 'minApp', platform: 'ios', required: false },
  { key: 'minOsAndroid', kind: 'minOs', platform: 'android', required: true },
  { key: 'minOsIos', kind: 'minOs', platform: 'ios', required: true },
]

const VERSION_PATTERN = /^\d+(\.\d+){0,2}$/

/** Select treats a null value as nothing chosen, so "None" needs a value of its own. */
const NO_FLOW = 0

const { t } = useI18n()
const toast = useToast()
const { canWrite } = usePermissions('/device-binding-configs')

const config = ref<DeviceBindingConfig>()
const flows = ref<ApprovalFlow[]>([])
const isLoading = ref(true)
const isSaving = ref(false)

const form = reactive({
  approvalFlowId: NO_FLOW as number,
  activationCodeTtlDays: 7 as number | null,
  syncOnlyDays: 3 as number | null,
  maxPinAttempts: 5 as number | null,
  lockoutMinutes: 30 as number | null,
  minAppVersionAndroid: '',
  minAppVersionIos: '',
  minOsAndroid: '',
  minOsIos: '',
})
const errors = reactive<Partial<Record<VersionKey, string>>>({})

const flowOptions = computed(() => [
  { label: t('deviceBinding.config.flowNone'), value: NO_FLOW },
  ...flows.value.map((f) => ({ label: f.name, value: f.id })),
])

function fill(c: DeviceBindingConfig) {
  config.value = c
  form.approvalFlowId = c.approvalFlowId ?? NO_FLOW
  form.activationCodeTtlDays = c.activationCodeTtlDays
  form.syncOnlyDays = c.syncOnlyDays
  form.maxPinAttempts = c.maxPinAttempts
  form.lockoutMinutes = c.lockoutMinutes
  form.minAppVersionAndroid = c.minAppVersionAndroid ?? ''
  form.minAppVersionIos = c.minAppVersionIos ?? ''
  form.minOsAndroid = c.minOsAndroid
  form.minOsIos = c.minOsIos
}

function validate(): boolean {
  let ok = true
  for (const field of VERSION_FIELDS) {
    const value = form[field.key].trim()
    errors[field.key] = undefined
    if (!value && field.required) {
      errors[field.key] = t('deviceBinding.config.versionRequired')
      ok = false
    } else if (value && !VERSION_PATTERN.test(value)) {
      errors[field.key] = t('deviceBinding.config.versionInvalid')
      ok = false
    }
  }
  return ok && NUMBER_FIELDS.every((f) => form[f.key] != null)
}

async function onSave() {
  if (!config.value || !validate()) return
  const hadFlow = config.value.approvalFlowId != null
  const body: DeviceBindingConfigInput = {
    activationCodeTtlDays: form.activationCodeTtlDays!,
    syncOnlyDays: form.syncOnlyDays!,
    maxPinAttempts: form.maxPinAttempts!,
    lockoutMinutes: form.lockoutMinutes!,
    minOsAndroid: form.minOsAndroid.trim(),
    minOsIos: form.minOsIos.trim(),
  }
  if (form.approvalFlowId !== NO_FLOW) body.approvalFlowId = form.approvalFlowId
  if (form.minAppVersionAndroid.trim()) body.minAppVersionAndroid = form.minAppVersionAndroid.trim()
  if (form.minAppVersionIos.trim()) body.minAppVersionIos = form.minAppVersionIos.trim()

  isSaving.value = true
  try {
    const saved = await DeviceBindingConfigService.update(config.value.companyId, body)
    fill(saved)
    const submitted = saved.submittedCount ?? 0
    const message =
      !hadFlow && submitted > 0
        ? t('deviceBinding.config.savedSubmitted', { n: submitted })
        : t('deviceBinding.config.saved')
    toast.add(commonSuccessToast(message, props.toastGroup))
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup, ToastLife.FIVE_SECONDS))
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  try {
    const [c, f] = await Promise.all([
      DeviceBindingConfigService.getMyCompany(),
      ApprovalsService.listFlows('device_binding').catch(() => [] as ApprovalFlow[]),
    ])
    // An inactive flow can't be chosen, but the saved one must still show by name.
    flows.value = f.filter((flow) => flow.isActive || flow.id === c.approvalFlowId)
    fill(c)
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isLoading.value = false
  }
})
</script>
