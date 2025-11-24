<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="email" class="w-full text-sm font-semibold sm:text-base md:w-32">{{ t('users.fields.email') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InputText
            id="email"
            name="email"
            autocomplete="off"
            :disabled="mode === DialogMode.EDIT || mode === DialogMode.VIEW"
            class="w-full"
          />
          <Message v-if="$form.email?.invalid" severity="error" size="small" variant="simple">{{
            $form.email.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4" v-if="mode !== DialogMode.VIEW">
        <label for="password" class="w-full text-sm font-semibold sm:text-base md:w-32">
          {{ mode === DialogMode.EDIT ? t('users.fields.newPassword') : t('users.fields.password') }}
        </label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Password
            id="password"
            name="password"
            :placeholder="mode === DialogMode.EDIT ? t('users.placeholders.passwordEditMode') : ''"
            :pt="{
              root: 'w-full',
              pcInputText: {
                root: '!w-full !grow',
              },
            }"
            toggle-mask
          />
          <Message v-if="$form.password?.invalid" severity="error" size="small" variant="simple">{{
            $form.password.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4" v-if="shouldShowPasswordConfirm($form)">
        <label for="confirmPassword" class="w-full text-sm font-semibold sm:text-base md:w-32">{{ t('users.fields.confirmPassword') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <Password
            id="confirmPassword"
            name="confirmPassword"
            :pt="{
              root: 'w-full',
              pcInputText: {
                root: '!w-full !grow',
              },
            }"
            :feedback="false"
            toggle-mask
          />
          <Message
            v-if="$form.confirmPassword?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.confirmPassword.error.message }}</Message
          >
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <label for="department" class="w-full text-sm font-semibold sm:text-base md:w-32">{{ t('users.fields.department') }}</label>
        <div class="flex w-full flex-auto flex-col gap-1">
          <InfiniteSelect
            id="department"
            option-label="name"
            :fetch-fn="(query) => DepartmentsService.list(query)"
            v-model="selectedDepartment"
            :initial-option="initialDepartment"
            sort-by="id"
            sort-operator="desc"
            use-cursor
            show-clear
            :disabled="mode === DialogMode.VIEW"
            :pt="{
              root: 'w-full'
            }"
          />
          <Message
            v-if="$form.department?.invalid"
            severity="error"
            size="small"
            variant="simple"
            >{{ $form.department.error.message }}</Message
          >
        </div>
      </div>

      <div class="flex justify-end gap-2" v-if="mode !== DialogMode.VIEW">
        <Button
          type="button"
          :label="t('common.actions.cancel')"
          severity="secondary"
          :disabled="isLoading"
          @click="handleClose"
        ></Button>
        <Button
          type="submit"
          :label="!isLoading ? t('common.actions.save') : ''"
          :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
          :disabled="isLoading"
        ></Button>
      </div>
      <div class="flex justify-end gap-2" v-else>
        <Button type="button" :label="t('common.actions.close')" @click="handleClose"></Button>
      </div>
    </Form>

    <Tabs value="0" v-if="mode === DialogMode.EDIT || mode === DialogMode.VIEW">
      <TabList>
        <Tab value="0">{{ t('users.tabs.roles') }}</Tab>
      </TabList>

      <TabPanels>
        <RolesTab :userId="user!.id" />
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType, computed } from 'vue'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { UsersService } from '@/services/users.service'
import { ref } from 'vue'
import Password from 'primevue/password'
import { commonErrorToast, commonSuccessToast } from '@/services/toast'
import { useAuthStore } from '@/stores'
import DialogMode from '@/constants/dialogMode'
import type { User } from '@/types/user.type'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import RolesTab from '@/views/users/RolesTab.vue'
import InfiniteSelect from '@/components/select/InfiniteSelect.vue'
import { DepartmentsService } from '@/services/departments.service'
import type { Department } from '@/types/department.type'

const { t } = useI18n()

// Types for form context
type FormField = {
  value: string
  invalid: boolean
  error?: {
    message: string
  }
}

type UserFormContext = {
  register: (field: string, options: unknown) => unknown
  reset: () => void
  valid: boolean
  email?: FormField
  password?: FormField
  confirmPassword?: FormField
} & Record<string, unknown>

// Auth
const authStore = useAuthStore()

const props = defineProps({
  mode: {
    type: String as PropType<DialogMode>,
    default: DialogMode.ADD,
  },
  user: {
    type: Object as PropType<User>,
  },
})

const emits = defineEmits(['close'])

// Department selection
const selectedDepartment = ref<Department | undefined>()
const initialDepartment = ref<Department | undefined>()

// Helper to extract department ID
function getDepartmentId(): number | undefined {
  if (!selectedDepartment.value) return undefined
  return selectedDepartment.value.id
}

onBeforeMount(() => {
  if ((props.mode !== DialogMode.EDIT && props.mode !== DialogMode.VIEW) || !props.user) {
    return
  }

  initialValues.email = props.user?.email

  // Set department if exists
  if (props.user.departmentId && props.user.department) {
    const dept = {
      id: props.user.departmentId,
      name: props.user.department.name,
    } as Department

    selectedDepartment.value = dept
    initialDepartment.value = dept
  }
})

// Toast
const toastGroup = 'userDialog'
const toast = useToast()

// Form
const initialValues = reactive({
  email: '',
  password: '',
  confirmPassword: '',
})

// Password validation schema (computed to support reactive i18n)
const passwordSchema = computed(() =>
  z
    .string()
    .min(8, t('users.validation.passwordMinLength'))
    .regex(/[A-Z]/, t('users.validation.passwordUppercase'))
    .regex(/[a-z]/, t('users.validation.passwordLowercase'))
    .regex(/\d/, t('users.validation.passwordNumber'))
    .regex(/[@$!%*?&]/, t('users.validation.passwordSpecialChar'))
)

// Dynamic resolver based on mode (computed to support reactive i18n)
const resolver = computed(() =>
  zodResolver(
    z
      .object({
        email: z.string().email({ message: t('users.validation.emailInvalid') }),
        password:
          props.mode === DialogMode.EDIT || props.mode === DialogMode.VIEW
            ? z.string().optional().or(passwordSchema.value)
            : passwordSchema.value,
        confirmPassword: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        // Only validate password confirmation if password is provided
        if (data.password && data.password.length > 0) {
          if (data.password !== data.confirmPassword) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('users.validation.passwordMismatch'),
              path: ['confirmPassword'],
            })
          }
        }
      })
  )
)

function shouldShowPasswordConfirm($form: UserFormContext) {
  if (props.mode === DialogMode.ADD) return true

  return $form.password?.value && $form.password.value.length > 0
}

function handleClose() {
  emits('close')
}

const isLoading = ref(false)

async function onFormSubmit(event: FormSubmitEvent) {
  if (!event.valid) {
    return
  }

  isLoading.value = true

  try {
    if (props.mode === DialogMode.ADD) {
      await addUser(event)
    } else {
      await editUser(event)
    }

    emits('close')
  } catch (e) {
    toast.add(commonErrorToast(e, toastGroup))
  } finally {
    isLoading.value = false
  }
}

async function addUser(event: FormSubmitEvent) {
  await UsersService.create({
    email: event.states.email.value,
    password: event.states.password.value,
    departmentId: getDepartmentId(),
    createdBy: authStore.userId!,
  })

  toast.add(commonSuccessToast(t('users.messages.userCreated'), toastGroup))
}

async function editUser(event: FormSubmitEvent) {
  const updateData: {
    password?: string
    departmentId?: number | null
    updatedBy: string
  } = {
    updatedBy: authStore.email!,
  }

  // Only include password if it was provided
  if (event.states.password.value && event.states.password.value.length > 0) {
    updateData.password = event.states.password.value
  }

  // Update department if it changed
  const newDepartmentId = getDepartmentId() ?? null
  if (newDepartmentId !== props.user!.departmentId) {
    updateData.departmentId = newDepartmentId
  }

  await UsersService.update(props.user!.id, updateData)

  toast.add(commonSuccessToast(t('users.messages.userUpdated'), toastGroup))
}
</script>
