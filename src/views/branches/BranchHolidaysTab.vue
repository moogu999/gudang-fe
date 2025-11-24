<template>
  <div>
    <!-- Add Holiday Form -->
    <div v-if="mode !== DialogMode.VIEW" class="mb-6">
      <h3 class="mb-4 text-base font-semibold sm:text-lg">
        {{ t('branches.holidays.addHoliday') }}
      </h3>
      <div class="mb-4 flex flex-col gap-4 md:flex-row">
        <div class="flex flex-1 flex-col gap-2">
          <label for="startDate" class="text-sm font-semibold sm:text-base">{{
            t('branches.holidays.startDate')
          }}</label>
          <DatePicker
            id="startDate"
            v-model="newHoliday.startDate"
            :invalid="!!holidayErrors.startDate"
            class="w-full"
          />
          <Message v-if="holidayErrors.startDate" severity="error" size="small" variant="simple">{{
            holidayErrors.startDate
          }}</Message>
        </div>
        <div class="flex flex-1 flex-col gap-2">
          <label for="endDate" class="text-sm font-semibold sm:text-base">{{
            t('branches.holidays.endDate')
          }}</label>
          <DatePicker
            id="endDate"
            v-model="newHoliday.endDate"
            :invalid="!!holidayErrors.endDate"
            class="w-full"
          />
          <Message v-if="holidayErrors.endDate" severity="error" size="small" variant="simple">{{
            holidayErrors.endDate
          }}</Message>
        </div>
      </div>
      <div class="flex justify-end">
        <Button
          :label="t('branches.holidays.addHoliday')"
          icon="pi pi-plus"
          @click="handleAddHoliday"
          :disabled="isLoadingHolidays"
        />
      </div>
    </div>

    <!-- Holidays List -->
    <div>
      <h3 class="mb-4 text-base font-semibold sm:text-lg">
        {{ t('branches.holidays.existingHolidays') }}
      </h3>
      <div v-if="isLoadingHolidays" class="flex items-center justify-center py-8">
        <i class="pi pi-spinner pi-spin text-2xl"></i>
      </div>
      <div v-else-if="holidays.length === 0" class="py-8 text-center text-gray-500">
        {{ t('branches.holidays.noHolidays') }}
      </div>
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="holiday in holidays"
          :key="holiday.id"
          class="flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex-1">
            <div class="text-sm font-semibold">
              {{ formatDate(holiday.startDate) }} - {{ formatDate(holiday.endDate) }}
            </div>
            <div class="text-xs text-gray-500">
              {{ t('common.labels.createdBy') }}: {{ holiday.createdByUser?.email || '-' }}
            </div>
          </div>
          <Button
            v-if="mode !== DialogMode.VIEW"
            icon="pi pi-trash"
            severity="danger"
            size="small"
            text
            @click="handleDeleteHoliday(holiday.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { onMounted, reactive, ref, watch, type PropType } from 'vue'
import { BranchHolidaysService } from '@/services/branchHolidays.service'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { Branch, BranchHoliday } from '@/types/branch.type'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import FilterOperator from '@/constants/filterOperator'

dayjs.extend(utc)

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()

const props = defineProps({
  branch: {
    type: Object as PropType<Branch>,
    required: true,
  },
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.EDIT,
  },
  toastGroup: {
    type: String,
    default: 'branchDialog',
  },
})

// Holidays Management
const holidays = ref<BranchHoliday[]>([])
const isLoadingHolidays = ref(false)
const newHoliday = reactive({
  startDate: null as Date | null,
  endDate: null as Date | null,
})
const holidayErrors = reactive({
  startDate: '',
  endDate: '',
})

// Watch for date changes to clear errors
watch(
  () => newHoliday.startDate,
  () => {
    if (holidayErrors.startDate) {
      holidayErrors.startDate = ''
    }
  },
)

watch(
  () => newHoliday.endDate,
  () => {
    if (holidayErrors.endDate) {
      holidayErrors.endDate = ''
    }
  },
)

onMounted(() => {
  loadHolidays()
})

async function loadHolidays() {
  isLoadingHolidays.value = true
  try {
    const query = new GenericQueryBuilder()
      .withFilter('branchId', FilterOperator.EQUAL, props.branch.id.toString())
      .withSort('startDate', 'desc')
      .build()

    const response = await BranchHolidaysService.list(query)
    holidays.value = response.data
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isLoadingHolidays.value = false
  }
}

function validateHolidayDates(): boolean {
  let isValid = true

  // Clear previous errors
  holidayErrors.startDate = ''
  holidayErrors.endDate = ''

  // Check if dates are selected
  if (!newHoliday.startDate) {
    holidayErrors.startDate = t('branches.holidays.validation.startDateRequired')
    isValid = false
  }

  if (!newHoliday.endDate) {
    holidayErrors.endDate = t('branches.holidays.validation.endDateRequired')
    isValid = false
  }

  // Check if end date is not before start date
  if (newHoliday.startDate && newHoliday.endDate) {
    if (dayjs(newHoliday.endDate).isBefore(dayjs(newHoliday.startDate))) {
      holidayErrors.endDate = t('branches.holidays.validation.endDateBeforeStartDate')
      isValid = false
    }
  }

  return isValid
}

async function handleAddHoliday() {
  if (!validateHolidayDates()) return

  isLoadingHolidays.value = true
  try {
    // Set start date to start of day (00:00:00) in UTC
    const startDateUtc = dayjs(newHoliday.startDate!).startOf('day').utc().format()

    // Set end date to end of day (23:59:59) in UTC
    const endDateUtc = dayjs(newHoliday.endDate!).endOf('day').utc().format()

    await BranchHolidaysService.create({
      branchId: props.branch.id,
      startDate: startDateUtc,
      endDate: endDateUtc,
      createdBy: authStore.userId!,
    })

    toast.add(commonSuccessToast(t('branches.holidays.messages.holidayCreated'), props.toastGroup))

    // Reset form
    newHoliday.startDate = null
    newHoliday.endDate = null

    // Reload holidays
    await loadHolidays()
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isLoadingHolidays.value = false
  }
}

async function handleDeleteHoliday(id: number) {
  isLoadingHolidays.value = true
  try {
    await BranchHolidaysService.delete(id)
    toast.add(commonSuccessToast(t('branches.holidays.messages.holidayDeleted'), props.toastGroup))
    await loadHolidays()
  } catch (e) {
    toast.add(commonErrorToast(e, props.toastGroup))
  } finally {
    isLoadingHolidays.value = false
  }
}

function formatDate(date: string): string {
  return dayjs(date).format('DD MMM YYYY HH:mm')
}
</script>
