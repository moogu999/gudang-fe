<template>
  <div class="flex flex-col gap-4">
    <Toast position="top-center" :group="toastGroup" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <ResponsiveCard>
        <template #content>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label for="name" class="text-sm font-semibold">
                {{ t('approvalFlows.fields.name') }} *
              </label>
              <InputText id="name" name="name" :disabled="isView" autocomplete="off" />
              <Message v-if="$form.name?.invalid" severity="error" size="small" variant="simple">
                {{ $form.name.error.message }}
              </Message>
            </div>

            <div class="flex flex-col gap-1">
              <label for="moduleKey" class="text-sm font-semibold">
                {{ t('approvalFlows.fields.module') }} *
              </label>
              <Select
                id="moduleKey"
                name="moduleKey"
                :options="modules"
                option-label="label"
                option-value="key"
                :disabled="isView || mode === 'edit'"
                class="w-full"
              />
              <Message
                v-if="$form.moduleKey?.invalid"
                severity="error"
                size="small"
                variant="simple"
              >
                {{ $form.moduleKey.error.message }}
              </Message>
            </div>

            <div class="flex flex-col gap-1 md:col-span-2">
              <label for="description" class="text-sm font-semibold">
                {{ t('approvalFlows.fields.description') }}
              </label>
              <Textarea id="description" name="description" rows="2" :disabled="isView" />
            </div>

            <div class="flex items-center gap-2">
              <ToggleSwitch id="isActive" name="isActive" :disabled="isView" />
              <label for="isActive" class="text-sm font-semibold">
                {{ t('approvalFlows.fields.isActive') }}
              </label>
            </div>
          </div>
        </template>
      </ResponsiveCard>

      <ResponsiveCard class="mt-4">
        <template #content>
          <TiersTable v-model:tiers="tiers" :errors="tierErrors" :disabled="isView" />
          <small v-if="tiersError" class="mt-2 block text-red-500">{{ tiersError }}</small>
        </template>
      </ResponsiveCard>

      <div class="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          :label="isView ? t('common.actions.back') : t('common.actions.cancel')"
          severity="secondary"
          @click="emit('cancel')"
        />
        <Button
          v-if="!isView"
          type="submit"
          :label="t('common.actions.save')"
          :loading="isLoading"
        />
      </div>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeMount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import Toast from 'primevue/toast'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import Button from 'primevue/button'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import TiersTable, { type TierForm } from './components/TiersTable.vue'
import { ApprovalsService } from '@/services/approvals.service'
import { commonErrorToast } from '@/services/toast'
import type {
  ApprovalFlow,
  ApprovalModule,
  CreateApprovalFlowDto,
  UpdateApprovalFlowDto,
} from '@/types/approval.type'

type FormMode = 'create' | 'edit' | 'view'

const props = defineProps<{
  mode: FormMode
  flow?: ApprovalFlow
  isLoading?: boolean
}>()

const emit = defineEmits<{
  submit: [dto: CreateApprovalFlowDto | UpdateApprovalFlowDto]
  cancel: []
}>()

const { t } = useI18n()
const toast = useToast()
const toastGroup = 'approvalFlowForm'

const isView = computed(() => props.mode === 'view')

const modules = ref<ApprovalModule[]>([])
const tiers = ref<TierForm[]>([])
const tiersError = ref('')
const tierErrors = ref<string[]>([])

const initialValues = reactive({
  name: '',
  moduleKey: undefined as string | undefined,
  description: '',
  isActive: true,
})

onMounted(async () => {
  try {
    modules.value = await ApprovalsService.listModules()
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  }
})

onBeforeMount(() => {
  if (!props.flow) return

  initialValues.name = props.flow.name
  initialValues.moduleKey = props.flow.moduleKey
  initialValues.description = props.flow.description ?? ''
  initialValues.isActive = props.flow.isActive

  tiers.value = props.flow.tiers
    .slice()
    .sort((a, b) => a.tierOrder - b.tierOrder)
    .map((tier) => ({
      id: tier.id,
      tierOrder: tier.tierOrder,
      name: tier.name,
      approvers: tier.approvers
        .slice()
        .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
        .map((a) => ({
          employeeId: a.employeeId,
          isPrimary: a.isPrimary,
          _initialEmployee: { id: a.employeeId, name: a.employeeName },
        })),
    }))
})

const resolver = computed(() =>
  zodResolver(
    z.object({
      name: z.string().min(1, t('approvalFlows.validation.nameRequired')),
      moduleKey: z.string({ message: t('approvalFlows.validation.moduleRequired') }).min(1),
      description: z.string().optional(),
      isActive: z.boolean(),
    }),
  ),
)

function validateTiers(): boolean {
  tiersError.value = ''
  tierErrors.value = tiers.value.map(() => '')
  let valid = true

  if (tiers.value.length === 0) {
    tiersError.value = t('approvalFlows.validation.tiersRequired')
    return false
  }

  tiers.value.forEach((tier, index) => {
    if (!tier.name.trim()) {
      tierErrors.value[index] = t('approvalFlows.validation.tierNameRequired')
      valid = false
      return
    }

    const primary = tier.approvers[0]
    if (!primary || primary.employeeId === null) {
      tierErrors.value[index] = t('approvalFlows.validation.primaryRequired')
      valid = false
      return
    }

    const filled = tier.approvers.filter((a) => a.employeeId !== null)
    if (tier.approvers.some((a) => a.employeeId === null)) {
      tierErrors.value[index] = t('approvalFlows.validation.emptyAlternate')
      valid = false
      return
    }

    const uniqueIds = new Set(filled.map((a) => a.employeeId))
    if (uniqueIds.size < filled.length) {
      tierErrors.value[index] = t('approvalFlows.validation.duplicateApprover')
      valid = false
    }
  })

  return valid
}

function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return
  if (!validateTiers()) return

  const dto: CreateApprovalFlowDto = {
    name: event.states.name.value as string,
    moduleKey: event.states.moduleKey.value as string,
    isActive: event.states.isActive.value as boolean,
    description: (event.states.description.value as string) || undefined,
    tiers: tiers.value.map((tier) => ({
      tierOrder: tier.tierOrder,
      name: tier.name.trim(),
      approvers: tier.approvers.map((a) => ({
        employeeId: a.employeeId!,
        isPrimary: a.isPrimary,
      })),
    })),
  }

  emit('submit', dto)
}
</script>
