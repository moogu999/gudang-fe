<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />
    <ConfirmDialog :group="toastGroup + '-unsaved'" />

    <!-- Full-size photo dialog -->
    <Dialog
      v-model:visible="showPhotoDialog"
      modal
      :header="employee?.name ?? t('employees.fields.photo')"
      :style="{ maxWidth: '90vw' }"
    >
      <div class="flex justify-center">
        <img
          v-if="photoPreview"
          :src="photoPreview"
          class="max-h-[75vh] max-w-full rounded object-contain"
          alt="Employee photo"
        />
      </div>
    </Dialog>

    <!-- Header -->
    <div class="mb-4 flex items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        aria-label="Back"
        @click="handleBack"
      />
      <div class="flex-1">
        <h1 class="text-base font-semibold sm:text-lg md:text-2xl">
          {{ mode === 'add' ? t('employees.addButton') : (employee?.name ?? t('employees.title')) }}
        </h1>
        <p v-if="employee?.isDraft" class="mt-0.5 text-sm text-amber-600">
          {{ t('employees.status.draft') }} — {{ t('employees.status.draftTooltip') }}
        </p>
      </div>
      <Button
        v-if="mode === 'view' && hasPermission(PERMISSIONS.AUDIT_TRAIL_READ)"
        icon="pi pi-history"
        :label="t('employees.actions.viewAuditTrail')"
        severity="secondary"
        outlined
        size="small"
        @click="goToAuditTrail"
      />
    </div>

    <!-- Loading state -->
    <div v-if="isLoadingData" class="flex justify-center py-16">
      <i class="pi pi-spinner pi-spin text-3xl text-stone-400" />
    </div>

    <template v-else>
      <!-- Employee Type Selection -->
      <div class="mb-6">
        <p class="mb-3 text-sm font-semibold">
          {{ t('employees.fields.employeeType') }}
          <span class="text-red-500">*</span>
        </p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <EmployeeTypeCard
            v-for="et in employeeTypes"
            :key="et.id"
            :name="et.name"
            :icon="typeIcon(et.name)"
            :selected="selectedTypeId === et.id"
            @select="
              selectedTypeId = et.id
              isDirty = true
            "
          />
        </div>
        <p v-if="typeError" class="mt-2 text-sm text-red-500">{{ typeError }}</p>
      </div>

      <Form
        ref="formRef"
        v-slot="$form"
        :initial-values="initialValues"
        :resolver="resolver"
        @submit="onFormSubmit"
        @value-change="isDirty = true"
      >
        <!-- Section: Identitas -->
        <ResponsiveCard class="mb-6">
          <template #header>
            <h2
              class="px-4 pt-4 text-sm font-semibold tracking-wide text-stone-500 uppercase sm:px-6"
            >
              {{ t('employees.sections.identity') }}
            </h2>
          </template>
          <template #content>
            <div class="flex flex-col gap-5 px-4 pb-4 sm:px-6 sm:pb-6">
              <!-- Photo -->
              <div class="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <label class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('employees.fields.photo') }}
                  <span class="ml-1 text-xs font-normal text-stone-400">{{
                    t('employees.labels.optional')
                  }}</span>
                </label>
                <div class="flex items-center gap-4">
                  <!-- Avatar: clickable to view full size when photo exists -->
                  <button
                    v-if="photoPreview"
                    type="button"
                    class="hover:ring-primary-400 focus:ring-primary-400 h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-stone-100 ring-2 ring-stone-200 transition-all focus:outline-none"
                    :title="t('employees.labels.viewPhoto')"
                    @click="showPhotoDialog = true"
                  >
                    <img
                      :src="photoPreview"
                      class="h-full w-full object-cover"
                      alt="Photo preview"
                    />
                  </button>
                  <div
                    v-else
                    class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-stone-100"
                  >
                    <i class="pi pi-user text-2xl text-stone-400" />
                  </div>

                  <!-- Upload + delete actions -->
                  <div class="flex flex-col gap-2">
                    <input
                      ref="photoInput"
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="onPhotoSelected"
                    />
                    <Button
                      type="button"
                      :label="t('employees.labels.uploadPhoto')"
                      icon="pi pi-upload"
                      severity="secondary"
                      size="small"
                      @click="photoInput?.click()"
                    />
                    <Button
                      v-if="photoPreview"
                      type="button"
                      :label="t('employees.labels.deletePhoto')"
                      icon="pi pi-trash"
                      severity="danger"
                      outlined
                      size="small"
                      :loading="isDeletingPhoto"
                      @click="onDeletePhoto"
                    />
                  </div>
                </div>
              </div>

              <!-- Nama -->
              <FormField
                name="name"
                :label="t('employees.fields.name')"
                :required="true"
                :form="$form"
              >
                <InputText
                  id="name"
                  name="name"
                  class="w-full"
                  :placeholder="t('employees.placeholders.name')"
                />
              </FormField>

              <!-- Nickname -->
              <FormField
                name="nickname"
                :label="t('employees.fields.nickname')"
                :optional="true"
                :form="$form"
              >
                <InputText
                  id="nickname"
                  name="nickname"
                  class="w-full"
                  :placeholder="t('employees.placeholders.nickname')"
                />
              </FormField>

              <!-- NIP -->
              <FormField
                name="nip"
                :label="t('employees.fields.nip')"
                :required="!submittingAsDraft"
                :form="$form"
              >
                <InputText
                  id="nip"
                  name="nip"
                  class="w-full"
                  :placeholder="t('employees.placeholders.nip')"
                />
              </FormField>

              <!-- KTP -->
              <FormField
                name="ktpNumber"
                :label="t('employees.fields.ktpNumber')"
                :required="!submittingAsDraft"
                :form="$form"
              >
                <InputText
                  id="ktpNumber"
                  name="ktpNumber"
                  class="w-full"
                  maxlength="16"
                  :placeholder="t('employees.placeholders.ktpNumber')"
                />
              </FormField>

              <!-- Phone -->
              <FormField
                name="phoneNumber"
                :label="t('employees.fields.phoneNumber')"
                :required="!submittingAsDraft"
                :form="$form"
              >
                <InputText
                  id="phoneNumber"
                  name="phoneNumber"
                  class="w-full"
                  :placeholder="t('employees.placeholders.phoneNumber')"
                />
              </FormField>

              <!-- Email -->
              <FormField
                name="email"
                :label="t('employees.fields.email')"
                :optional="true"
                :form="$form"
              >
                <InputText
                  id="email"
                  name="email"
                  type="email"
                  class="w-full"
                  :placeholder="t('employees.placeholders.email')"
                />
              </FormField>

              <!-- Birth Date -->
              <FormField
                name="birthDate"
                :label="t('employees.fields.birthDate')"
                :optional="true"
                :form="$form"
              >
                <DatePicker
                  id="birthDate"
                  name="birthDate"
                  class="w-full"
                  date-format="dd/mm/yy"
                  show-icon
                />
              </FormField>

              <!-- Address -->
              <FormField
                name="address"
                :label="t('employees.fields.address')"
                :optional="true"
                :form="$form"
              >
                <Textarea
                  id="address"
                  name="address"
                  class="w-full"
                  rows="3"
                  :placeholder="t('employees.placeholders.address')"
                />
              </FormField>
            </div>
          </template>
        </ResponsiveCard>

        <!-- Section: Pekerjaan -->
        <ResponsiveCard class="mb-6">
          <template #header>
            <h2
              class="px-4 pt-4 text-sm font-semibold tracking-wide text-stone-500 uppercase sm:px-6"
            >
              {{ t('employees.sections.employment') }}
            </h2>
          </template>
          <template #content>
            <div class="flex flex-col gap-5 px-4 pb-4 sm:px-6 sm:pb-6">
              <!-- Company -->
              <FormField
                name="companyId"
                :label="t('employees.fields.company')"
                :required="!submittingAsDraft"
                :form="$form"
              >
                <InfiniteSelect
                  id="companyId"
                  name="companyId"
                  option-label="name"
                  option-value="id"
                  :fetch-fn="(q) => CompaniesService.list(q)"
                  :initial-option="initialCompany"
                  sort-by="name"
                  sort-operator="asc"
                  @update:model-value="onCompanyChange"
                />
              </FormField>

              <!-- Branch -->
              <FormField
                name="branchId"
                :label="t('employees.fields.branch')"
                :required="!submittingAsDraft"
                :form="$form"
              >
                <InfiniteSelect
                  id="branchId"
                  name="branchId"
                  option-label="name"
                  option-value="id"
                  :fetch-fn="(q) => BranchesService.list(q)"
                  :initial-option="initialBranch"
                  sort-by="name"
                  sort-operator="asc"
                />
              </FormField>

              <!-- Department -->
              <FormField
                name="departmentId"
                :label="t('employees.fields.department')"
                :required="!submittingAsDraft"
                :form="$form"
              >
                <InfiniteSelect
                  id="departmentId"
                  name="departmentId"
                  option-label="name"
                  option-value="id"
                  :fetch-fn="(q) => DepartmentsService.list(q)"
                  :initial-option="initialDepartment"
                  sort-by="name"
                  sort-operator="asc"
                />
              </FormField>

              <!-- Division -->
              <FormField
                name="divisionId"
                :label="t('employees.fields.division')"
                :required="!submittingAsDraft"
                :form="$form"
              >
                <InfiniteSelect
                  id="divisionId"
                  name="divisionId"
                  option-label="name"
                  option-value="id"
                  :fetch-fn="(q) => DivisionsService.list(q)"
                  :initial-option="initialDivision"
                  sort-by="name"
                  sort-operator="asc"
                />
              </FormField>

              <!-- Sales Organization -->
              <FormField
                name="salesOrganizationId"
                :label="t('employees.fields.salesOrg')"
                :required="!submittingAsDraft && requiresSalesOrg"
                :optional="!requiresSalesOrg"
                :form="$form"
              >
                <InfiniteSelect
                  id="salesOrganizationId"
                  name="salesOrganizationId"
                  option-label="name"
                  option-value="id"
                  :fetch-fn="(q) => SalesOrganizationsService.list(q)"
                  :initial-option="initialSalesOrg"
                  sort-by="name"
                  sort-operator="asc"
                  show-clear
                  @update:model-value="onSalesOrgChange"
                />
              </FormField>

              <!-- Join Date -->
              <FormField
                name="joinDate"
                :label="t('employees.fields.joinDate')"
                :optional="true"
                :form="$form"
              >
                <DatePicker
                  id="joinDate"
                  name="joinDate"
                  class="w-full"
                  date-format="dd/mm/yy"
                  show-icon
                />
              </FormField>

              <!-- Employment Status -->
              <FormField
                name="employmentStatus"
                :label="t('employees.fields.employmentStatus')"
                :optional="true"
                :form="$form"
              >
                <Select
                  id="employmentStatus"
                  name="employmentStatus"
                  :options="employmentStatusOptions"
                  option-label="label"
                  option-value="value"
                  show-clear
                  class="w-full"
                />
              </FormField>

              <!-- Supervisor -->
              <FormField
                name="supervisorId"
                :label="t('employees.fields.supervisor')"
                :optional="true"
                :form="$form"
              >
                <InfiniteSelect
                  id="supervisorId"
                  name="supervisorId"
                  option-label="name"
                  option-value="id"
                  :fetch-fn="supervisorFetchFn"
                  :initial-option="initialSupervisor"
                  :placeholder="t('employees.placeholders.selectSupervisor')"
                  sort-by="name"
                  sort-operator="asc"
                  show-clear
                />
              </FormField>

              <!-- Is Active -->
              <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                <label for="isActive" class="w-full text-sm font-semibold sm:text-base md:w-40">
                  {{ t('employees.fields.isActive') }}
                </label>
                <ToggleSwitch id="isActive" name="isActive" />
              </div>
            </div>
          </template>
        </ResponsiveCard>

        <!-- Section: Akses Sistem -->
        <ResponsiveCard class="mb-6">
          <template #header>
            <h2
              class="px-4 pt-4 text-sm font-semibold tracking-wide text-stone-500 uppercase sm:px-6"
            >
              {{ t('employees.sections.systemAccess') }}
            </h2>
          </template>
          <template #content>
            <div class="px-4 pb-4 sm:px-6 sm:pb-6">
              <p class="mb-4 text-sm text-stone-500">
                {{ t('employees.sections.systemAccessNote') }}
              </p>
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between gap-4">
                  <label for="accessNcommand" class="text-sm font-medium sm:text-base">
                    {{ t('employees.fields.accessNcommand') }}
                  </label>
                  <ToggleSwitch id="accessNcommand" name="accessNcommand" />
                </div>
                <div class="flex items-center justify-between gap-4">
                  <label for="accessNforce" class="text-sm font-medium sm:text-base">
                    {{ t('employees.fields.accessNforce') }}
                  </label>
                  <ToggleSwitch id="accessNforce" name="accessNforce" />
                </div>
              </div>
            </div>
          </template>
        </ResponsiveCard>

        <!-- Submit Buttons -->
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            v-if="mode === 'add'"
            type="button"
            :label="isLoading && submittingAsDraft ? '' : t('employees.labels.saveDraft')"
            :icon="isLoading && submittingAsDraft ? 'pi pi-spinner pi-spin' : 'pi pi-file'"
            severity="secondary"
            :disabled="isLoading"
            @click="onSaveDraft"
          />
          <Button
            type="submit"
            :label="isLoading && !submittingAsDraft ? '' : t('common.actions.save')"
            :icon="isLoading && !submittingAsDraft ? 'pi pi-spinner pi-spin' : ''"
            :disabled="isLoading"
          />
        </div>
      </Form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import ResponsiveCard from '@/components/card/ResponsiveCard.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import EmployeeTypeCard from './components/EmployeeTypeCard.vue'
import FormField from './components/FormField.vue'
import {
  EmployeesService,
  EmployeeTypesService,
  BranchesService,
  CompaniesService,
  DepartmentsService,
  DivisionsService,
  SalesOrganizationsService,
} from '@/services'
import { commonErrorToast, commonSuccessToast, commonWarnToast } from '@/services/toast'
import type { Employee, EmployeeType, EmploymentStatus } from '@/types/employee.type'
import { usePermissions } from '@/composables'
import { PERMISSIONS } from '@/constants'

const { t } = useI18n()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()
const { hasPermission } = usePermissions()

const toastGroup = 'employeeDetail'

const props = defineProps<{
  mode: 'add' | 'view'
  id?: number
}>()

// State
const isLoadingData = ref(false)
const isLoading = ref(false)
const isDirty = ref(false)
const isSubmitting = ref(false)
const submittingAsDraft = ref(false)
const isDeletingPhoto = ref(false)
const showPhotoDialog = ref(false)
const employee = ref<Employee | null>(null)
const formRef = ref()
const photoInput = ref<HTMLInputElement | null>(null)
const pendingPhoto = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const typeError = ref('')

// Employee types
const employeeTypes = ref<EmployeeType[]>([])
const selectedTypeId = ref<number | undefined>(undefined)

const selectedTypeName = computed(
  () => employeeTypes.value.find((et) => et.id === selectedTypeId.value)?.name ?? '',
)

const requiresSalesOrg = computed(() => ['Salesman', 'Collector'].includes(selectedTypeName.value))

// Current salesOrg for supervisor filter
const currentSalesOrgId = ref<number | undefined>(undefined)

// Initial options for InfiniteSelect dropdowns
const initialCompany = ref()
const initialBranch = ref()
const initialDepartment = ref()
const initialDivision = ref()
const initialSalesOrg = ref()
const initialSupervisor = ref()

// Form initial values
const initialValues = reactive({
  name: '',
  nickname: '',
  nip: '',
  ktpNumber: '',
  phoneNumber: '',
  email: '',
  birthDate: undefined as Date | undefined,
  address: '',
  companyId: undefined as number | undefined,
  branchId: undefined as number | undefined,
  departmentId: undefined as number | undefined,
  divisionId: undefined as number | undefined,
  salesOrganizationId: undefined as number | undefined,
  joinDate: undefined as Date | undefined,
  employmentStatus: undefined as string | undefined,
  supervisorId: undefined as number | undefined,
  isActive: true,
  accessNcommand: false,
  accessNforce: false,
})

// Zod schema (only used for final save)
const finalSchema = computed(() =>
  z
    .object({
      name: z.string().min(1, t('employees.validation.nameRequired')),
      nickname: z.string().optional(),
      nip: z.string().min(1, t('employees.validation.nipRequired')),
      ktpNumber: z
        .string()
        .min(1, t('employees.validation.ktpRequired'))
        .length(16, t('employees.validation.ktpLength'))
        .regex(/^\d+$/, t('employees.validation.ktpNumeric')),
      phoneNumber: z.string().min(1, t('employees.validation.phoneRequired')),
      email: z.union([z.string().email(), z.literal(''), z.undefined()]),
      birthDate: z.unknown().optional(),
      address: z.string().optional(),
      companyId: z.number({ required_error: t('employees.validation.companyRequired') }),
      branchId: z.number({ required_error: t('employees.validation.branchRequired') }),
      departmentId: z.number({ required_error: t('employees.validation.departmentRequired') }),
      divisionId: z.number({ required_error: t('employees.validation.divisionRequired') }),
      salesOrganizationId: z.number().optional(),
      joinDate: z.unknown().optional(),
      employmentStatus: z.string().optional(),
      supervisorId: z.number().optional(),
      isActive: z.boolean().optional(),
      accessNcommand: z.boolean().optional(),
      accessNforce: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      if (requiresSalesOrg.value && !data.salesOrganizationId) {
        ctx.addIssue({
          code: 'custom',
          path: ['salesOrganizationId'],
          message: t('employees.validation.salesOrgRequired'),
        })
      }
    }),
)

const resolver = computed(() => zodResolver(finalSchema.value))

// Dropdown options
const employmentStatusOptions = computed(() => [
  { label: t('employees.employmentStatus.Kontrak'), value: 'Kontrak' },
  { label: t('employees.employmentStatus.Tetap'), value: 'Tetap' },
  { label: t('employees.employmentStatus.Freelance'), value: 'Freelance' },
])

// Supervisor fetch function filtered by salesOrg
const supervisorFetchFn = computed(() => (q?: string) => {
  let query = q ?? ''
  if (currentSalesOrgId.value) {
    query = query
      ? `${query}&salesOrganizationId=${currentSalesOrgId.value}`
      : `salesOrganizationId=${currentSalesOrgId.value}`
  }
  query = query ? `${query}&isActive=true` : 'isActive=true'
  return EmployeesService.list(query)
})

// Employee type icon mapping
function typeIcon(name: string): string {
  const map: Record<string, string> = {
    Salesman: 'pi pi-briefcase',
    Finance: 'pi pi-wallet',
    Driver: 'pi pi-car',
    Collector: 'pi pi-dollar',
    Management: 'pi pi-crown',
  }
  return map[name] ?? 'pi pi-user'
}

// Load employee types
async function loadEmployeeTypes() {
  try {
    const res = await EmployeeTypesService.list('sortBy=name&sortOperator=asc&limit=50')
    employeeTypes.value = res.data
  } catch {
    // non-critical
  }
}

// Load employee detail (view mode)
async function loadEmployee() {
  if (!props.id) return
  isLoadingData.value = true
  try {
    const emp = await EmployeesService.get(props.id)
    employee.value = emp
    selectedTypeId.value = emp.employeeTypeId

    // Populate initial values
    initialValues.name = emp.name
    initialValues.nickname = emp.nickname ?? ''
    initialValues.nip = emp.nip ?? ''
    initialValues.ktpNumber = emp.ktpNumber ?? ''
    initialValues.phoneNumber = emp.phoneNumber ?? ''
    initialValues.email = emp.email ?? ''
    initialValues.address = emp.address ?? ''
    initialValues.companyId = emp.companyId
    initialValues.branchId = emp.branchId
    initialValues.departmentId = emp.departmentId
    initialValues.divisionId = emp.divisionId
    initialValues.salesOrganizationId = emp.salesOrganizationId
    initialValues.employmentStatus = emp.employmentStatus
    initialValues.supervisorId = emp.supervisorId
    initialValues.isActive = emp.isActive
    initialValues.accessNcommand = emp.accessNcommand
    initialValues.accessNforce = emp.accessNforce

    if (emp.birthDate) initialValues.birthDate = new Date(emp.birthDate)
    if (emp.joinDate) initialValues.joinDate = new Date(emp.joinDate)

    currentSalesOrgId.value = emp.salesOrganizationId

    // Set initial options for dropdowns
    if (emp.company) initialCompany.value = { id: emp.companyId, name: emp.company.name }
    if (emp.branch) initialBranch.value = { id: emp.branchId, name: emp.branch.name }
    if (emp.department)
      initialDepartment.value = { id: emp.departmentId, name: emp.department.name }
    if (emp.division) initialDivision.value = { id: emp.divisionId, name: emp.division.name }
    if (emp.salesOrganization)
      initialSalesOrg.value = { id: emp.salesOrganizationId, name: emp.salesOrganization.name }
    if (emp.supervisor)
      initialSupervisor.value = { id: emp.supervisorId, name: emp.supervisor.name }

    if (emp.photoUrl) photoPreview.value = photoSrc(emp.photoUrl)
  } catch {
    toast.add(commonErrorToast(new Error('Failed to load employee'), toastGroup))
  } finally {
    isLoadingData.value = false
  }
}

onMounted(async () => {
  await loadEmployeeTypes()
  if (props.mode === 'view') {
    await loadEmployee()
  }
})

// Photo helpers
function onPhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  pendingPhoto.value = file
  photoPreview.value = URL.createObjectURL(file)
  isDirty.value = true
}

function photoSrc(photoUrl: string): string {
  if (photoUrl.startsWith('http')) return photoUrl
  return `${import.meta.env.VITE_API_BASE_URL ?? ''}${photoUrl}`
}

// Upload photo and update preview. Shows a warning toast on failure (non-fatal).
async function tryUploadPhoto(id: number): Promise<void> {
  if (!pendingPhoto.value) return
  try {
    const res = await EmployeesService.uploadPhoto(id, pendingPhoto.value)
    photoPreview.value = photoSrc(res.photoUrl)
    pendingPhoto.value = null
  } catch (e) {
    toast.add(
      commonWarnToast(
        e instanceof Error ? e.message : t('employees.messages.photoUploadFailed'),
        toastGroup,
      ),
    )
  }
}

// Delete existing (uploaded) photo or just clear a pending (not-yet-uploaded) selection.
async function onDeletePhoto() {
  // If there's a pending (unuploaded) photo, just clear the local state.
  if (pendingPhoto.value) {
    pendingPhoto.value = null
    photoPreview.value = employee.value?.photoUrl ? photoSrc(employee.value.photoUrl) : null
    return
  }

  // Photo is already saved on the server — ask for confirmation before deleting.
  confirm.require({
    group: toastGroup + '-unsaved',
    header: t('employees.confirm.deletePhotoTitle'),
    message: t('employees.confirm.deletePhotoMessage'),
    acceptLabel: t('common.actions.delete'),
    rejectLabel: t('common.actions.cancel'),
    accept: async () => {
      if (!props.id) return
      isDeletingPhoto.value = true
      try {
        await EmployeesService.deletePhoto(props.id)
        photoPreview.value = null
        if (employee.value) employee.value = { ...employee.value, photoUrl: undefined }
        toast.add(commonSuccessToast(t('employees.messages.photoDeleted'), toastGroup))
      } catch (e) {
        toast.add(commonErrorToast(e, toastGroup))
      } finally {
        isDeletingPhoto.value = false
      }
    },
  })
}

// Dropdown change handlers
function onCompanyChange() {
  isDirty.value = true
}

function onSalesOrgChange(val: number | undefined) {
  currentSalesOrgId.value = val
  isDirty.value = true
}

// Build date string from Date or undefined
function toISODate(val: unknown): string | undefined {
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return undefined
}

// Draft save — bypasses form validation, only requires name + employeeType
async function onSaveDraft() {
  if (!selectedTypeId.value) {
    typeError.value = t('employees.validation.employeeTypeRequired')
    return
  }
  typeError.value = ''

  const states = formRef.value?.states
  const name = ((states?.name?.value as string) ?? '').trim()
  if (!name) {
    toast.add(commonErrorToast(new Error(t('employees.validation.nameRequired')), toastGroup))
    return
  }

  isLoading.value = true
  isSubmitting.value = true
  submittingAsDraft.value = true

  try {
    const payload = {
      employeeTypeId: selectedTypeId.value,
      name,
      nip: (states?.nip?.value as string) || undefined,
      nickname: (states?.nickname?.value as string) || undefined,
      ktpNumber: (states?.ktpNumber?.value as string) || undefined,
      phoneNumber: (states?.phoneNumber?.value as string) || undefined,
      email: (states?.email?.value as string) || undefined,
      birthDate: toISODate(states?.birthDate?.value),
      address: (states?.address?.value as string) || undefined,
      companyId: (states?.companyId?.value as number) || undefined,
      branchId: (states?.branchId?.value as number) || undefined,
      departmentId: (states?.departmentId?.value as number) || undefined,
      divisionId: (states?.divisionId?.value as number) || undefined,
      salesOrganizationId: (states?.salesOrganizationId?.value as number) || undefined,
      joinDate: toISODate(states?.joinDate?.value),
      employmentStatus: (states?.employmentStatus?.value as EmploymentStatus) || undefined,
      supervisorId: (states?.supervisorId?.value as number) || undefined,
      isActive: (states?.isActive?.value as boolean) ?? true,
      accessNcommand: (states?.accessNcommand?.value as boolean) ?? false,
      accessNforce: (states?.accessNforce?.value as boolean) ?? false,
      isDraft: true,
    }

    const created = await EmployeesService.create(payload)
    await tryUploadPhoto(created.id)
    isDirty.value = false
    toast.add(commonSuccessToast(t('employees.messages.draftSaved'), toastGroup))
    setTimeout(() => router.replace(`/employees/${created.id}`), 800)
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
    isSubmitting.value = false
    submittingAsDraft.value = false
  }
}

// Final save via form submit (full Zod validation)
async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) return

  if (!selectedTypeId.value) {
    typeError.value = t('employees.validation.employeeTypeRequired')
    return
  }
  typeError.value = ''

  isLoading.value = true
  isSubmitting.value = true

  try {
    const s = event.states
    const payload = {
      employeeTypeId: selectedTypeId.value,
      name: s.name?.value ?? '',
      nip: s.nip?.value || undefined,
      nickname: s.nickname?.value || undefined,
      ktpNumber: s.ktpNumber?.value || undefined,
      phoneNumber: s.phoneNumber?.value || undefined,
      email: s.email?.value || undefined,
      birthDate: toISODate(s.birthDate?.value),
      address: s.address?.value || undefined,
      companyId: s.companyId?.value,
      branchId: s.branchId?.value,
      departmentId: s.departmentId?.value,
      divisionId: s.divisionId?.value,
      salesOrganizationId: s.salesOrganizationId?.value || undefined,
      joinDate: toISODate(s.joinDate?.value),
      employmentStatus: (s.employmentStatus?.value as EmploymentStatus) || undefined,
      supervisorId: s.supervisorId?.value || undefined,
      isActive: s.isActive?.value ?? true,
      accessNcommand: s.accessNcommand?.value ?? false,
      accessNforce: s.accessNforce?.value ?? false,
      isDraft: false,
    }

    if (props.mode === 'add') {
      const created = await EmployeesService.create(payload)
      await tryUploadPhoto(created.id)
      isDirty.value = false
      toast.add(commonSuccessToast(t('employees.messages.saved'), toastGroup))
      setTimeout(() => router.replace('/employees'), 800)
    } else {
      await EmployeesService.update(props.id!, payload)
      await tryUploadPhoto(props.id!)
      isDirty.value = false
      toast.add(commonSuccessToast(t('employees.messages.saved'), toastGroup))
      setTimeout(() => router.replace('/employees'), 800)
    }
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
    isSubmitting.value = false
  }
}

function goToAuditTrail() {
  router.push({
    path: '/audit-trails',
    query: {
      referenceType: 'employee',
      referenceId: String(props.id),
    },
  })
}

// Back navigation
function handleBack() {
  if (!isDirty.value || isSubmitting.value) {
    router.back()
    return
  }
  confirm.require({
    group: toastGroup + '-unsaved',
    header: t('common.confirm.unsavedTitle'),
    message: t('common.confirm.unsavedMessage'),
    acceptLabel: t('common.actions.leave'),
    rejectLabel: t('common.actions.stay'),
    accept: () => router.back(),
  })
}

// Route leave guard
onBeforeRouteLeave((to, from, next) => {
  if (!isDirty.value || isSubmitting.value) {
    next()
    return
  }
  confirm.require({
    group: toastGroup + '-unsaved',
    header: t('common.confirm.unsavedTitle'),
    message: t('common.confirm.unsavedMessage'),
    acceptLabel: t('common.actions.leave'),
    rejectLabel: t('common.actions.stay'),
    accept: () => next(),
    reject: () => next(false),
  })
})

// Browser close guard
function beforeUnloadHandler(e: BeforeUnloadEvent) {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnloadHandler))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnloadHandler))
</script>
