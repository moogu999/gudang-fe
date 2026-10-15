<template>
  <Dialog
    :visible="true"
    :header="t('journeyPlans.add.title')"
    modal
    :breakpoints="{ '960px': '75vw', '640px': '95vw' }"
    :style="{ width: '34rem' }"
    @update:visible="(v: boolean) => !v && emit('close')"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">{{ t('journeyPlans.add.date') }}</label>
        <SelectButton
          v-model="date"
          :options="dateOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          data-testid="add-date"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">
          {{ t('journeyPlans.add.salesman') }}<span class="ml-0.5 text-red-500">*</span>
        </label>
        <Select
          v-model="employeeId"
          :options="salesmen"
          :option-label="employeeLabel"
          option-value="id"
          :loading="salesmenLoading"
          :placeholder="t('journeyPlans.add.selectSalesman')"
          filter
          class="w-full"
          data-testid="add-salesman"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-semibold">
          {{ t('journeyPlans.add.customer') }}<span class="ml-0.5 text-red-500">*</span>
        </label>
        <InfiniteSelect
          v-model="customerId"
          :fetch-fn="(q: string) => CustomersService.list(q)"
          :custom-filters="customerFilters"
          :option-label="customerLabel"
          option-value="id"
          :placeholder="t('journeyPlans.add.selectCustomer')"
          class="w-full"
          data-testid="add-customer"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="addReason" class="text-sm font-semibold">
          {{ t('journeyPlans.add.reason') }}<span class="ml-0.5 text-red-500">*</span>
        </label>
        <Textarea
          id="addReason"
          v-model="reason"
          rows="2"
          maxlength="200"
          auto-resize
          :invalid="!!errorText"
          class="w-full"
          data-testid="add-reason"
        />
      </div>

      <p class="text-xs text-stone-500">{{ t('journeyPlans.add.note') }}</p>
      <Message v-if="errorText" severity="error" size="small" data-testid="add-error">
        {{ errorText }}
      </Message>
    </div>

    <template #footer>
      <Button
        :label="t('common.actions.cancel')"
        severity="secondary"
        :disabled="isSaving"
        @click="emit('close')"
      />
      <Button
        :label="t('journeyPlans.add.submit')"
        :icon="isSaving ? 'pi pi-spinner pi-spin' : ''"
        :disabled="!canSubmit || isSaving"
        data-testid="submit-visit"
        @click="onSubmit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { CustomersService, EmployeesService, JourneyPlansService } from '@/services'
import { EmployeeTypesService } from '@/services/employeeTypes.service'
import { EMPLOYEE_TYPE_NAMES } from '@/constants/employeeTypes'
import type { Employee } from '@/types/employee.type'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import FilterOperator from '@/constants/filterOperator'
import { ApiError } from '@/types/api.type'
import { addDays } from '@/utils/visitCycle'

const props = defineProps<{
  branchId: number
  /** `YYYY-MM-DD`, the business today. */
  today: string
  /** Preselected from the viewer's salesman filter. */
  salesman?: { id: number; name: string; nip?: string | null }
  /** The date the viewer is showing, when it is today or tomorrow. */
  initialDate?: string
  toastGroup: string
}>()
const emit = defineEmits<{ close: []; added: [] }>()

const { t } = useI18n()
const toast = useToast()

const tomorrow = addDays(props.today, 1)
const date = ref(props.initialDate === tomorrow ? tomorrow : props.today)
const employeeId = ref<number | undefined>(props.salesman?.id)
const customerId = ref<number | undefined>()
const reason = ref('')
const isSaving = ref(false)
const errorText = ref('')

const dateOptions = computed(() => [
  { label: t('journeyPlans.add.today'), value: props.today },
  { label: t('journeyPlans.add.tomorrow'), value: tomorrow },
])

const salesmen = ref<Employee[]>([])
const salesmenLoading = ref(false)

// Only the types a journey plan can be written for; the picker is loaded once because a branch has few of them.
async function loadSalesmen() {
  salesmenLoading.value = true
  try {
    const types = await EmployeeTypesService.list()
    const ids = types.data
      .filter((x) => x.name === EMPLOYEE_TYPE_NAMES.SALESMAN || x.name === EMPLOYEE_TYPE_NAMES.CANVASS)
      .map((x) => x.id)
    const pages = await Promise.all(
      ids.map((id) =>
        EmployeesService.list(
          `employeeTypeId=${id}&branchId=${props.branchId}&isActive=true&isDraft=false&limit=200`,
        ),
      ),
    )
    salesmen.value = pages.flatMap((r) => r.data).sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    salesmenLoading.value = false
  }
}
onMounted(loadSalesmen)
const customerFilters = [
  { filterBy: 'branch_id', filterOperator: FilterOperator.EQUAL, filterValue: props.branchId },
  { filterBy: 'is_active', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
]

function employeeLabel(e: { name: string; nip?: string | null }): string {
  return e.nip ? `${e.name} · ${e.nip}` : e.name
}

function customerLabel(c: { code?: string; name?: string }): string {
  return c.code && c.name ? `${c.code} - ${c.name}` : (c.name ?? c.code ?? '')
}

const canSubmit = computed(
  () =>
    !!employeeId.value && !!customerId.value && reason.value.trim().length >= 3,
)

async function onSubmit() {
  if (!employeeId.value || !customerId.value) return
  isSaving.value = true
  errorText.value = ''
  try {
    await JourneyPlansService.addVisit({
      branchId: props.branchId,
      date: date.value,
      employeeId: employeeId.value,
      customerId: customerId.value,
      reason: reason.value.trim(),
    })
    toast.add(commonSuccessToast(t('journeyPlans.messages.visitAdded'), props.toastGroup))
    emit('added')
    emit('close')
  } catch (e) {
    const code = e instanceof ApiError ? e.code : undefined
    const known: Record<string, string> = {
      JOURNEY_PLAN_DUPLICATE_VISIT: 'journeyPlans.errors.duplicateVisit',
      JOURNEY_PLAN_DATE_NOT_ALLOWED: 'journeyPlans.errors.dateNotAllowed',
      JOURNEY_PLAN_SALESMAN_NOT_ELIGIBLE: 'journeyPlans.errors.salesmanNotEligible',
      JOURNEY_PLAN_REASON_REQUIRED: 'journeyPlans.errors.reasonRequired',
    }
    if (code && known[code]) errorText.value = t(known[code])
    else toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isSaving.value = false
  }
}
</script>
