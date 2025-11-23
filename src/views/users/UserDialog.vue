<template>
  <div>
    <Toast position="top-center" :group="toastGroup" />

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="onFormSubmit"
    >
      <div class="mb-4 flex items-start gap-4">
        <label for="email" class="w-32 font-semibold">Email</label>
        <div class="flex flex-auto flex-col gap-1">
          <InputText
            id="email"
            name="email"
            autocomplete="off"
            :disabled="mode === DialogMode.EDIT || mode === DialogMode.VIEW"
          />
          <Message v-if="$form.email?.invalid" severity="error" size="small" variant="simple">{{
            $form.email.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex items-start gap-4" v-if="mode !== DialogMode.VIEW">
        <label for="password" class="w-32 font-semibold">
          {{ mode === DialogMode.EDIT ? 'New Password' : 'Password' }}
        </label>
        <div class="flex flex-auto flex-col gap-1">
          <Password
            id="password"
            name="password"
            :placeholder="mode === DialogMode.EDIT ? 'Leave blank to keep current password' : ''"
            :pt="{
              pcInputText: {
                root: '!grow',
              },
            }"
            toggle-mask
          />
          <Message v-if="$form.password?.invalid" severity="error" size="small" variant="simple">{{
            $form.password.error.message
          }}</Message>
        </div>
      </div>

      <div class="mb-4 flex items-start gap-4" v-if="shouldShowPasswordConfirm($form)">
        <label for="confirmPassword" class="w-32 font-semibold">Confirm Password</label>
        <div class="flex flex-auto flex-col gap-1">
          <Password
            id="confirmPassword"
            name="confirmPassword"
            :pt="{
              pcInputText: {
                root: '!grow',
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

      <div class="mb-4 flex items-start gap-4">
        <label for="department" class="w-32 font-semibold">Department</label>
        <div class="flex flex-auto flex-col gap-1">
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
          label="Cancel"
          severity="secondary"
          :disabled="isLoading"
          @click="handleClose"
        ></Button>
        <Button
          type="submit"
          :label="!isLoading ? 'Save' : ''"
          :icon="!isLoading ? '' : 'pi pi-spinner pi-spin'"
          :disabled="isLoading"
        ></Button>
      </div>
      <div class="flex justify-end gap-2" v-else>
        <Button type="button" label="Close" @click="handleClose"></Button>
      </div>
    </Form>

    <Tabs value="0" v-if="mode === DialogMode.EDIT || mode === DialogMode.VIEW">
      <TabList>
        <Tab value="0">Roles</Tab>
      </TabList>

      <TabPanels>
        <RolesTab :userId="user!.id" />
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { Form, type FormSubmitEvent } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import { z } from 'zod'
import { onBeforeMount, reactive, type PropType } from 'vue'
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

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/\d/, 'Password must contain at least one number.')
  .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&).')

// Dynamic resolver based on mode
const resolver = zodResolver(
  z
    .object({
      email: z.string().email({ message: 'Please enter a valid email address.' }),
      password:
        props.mode === DialogMode.EDIT || props.mode === DialogMode.VIEW
          ? z.string().optional().or(passwordSchema)
          : passwordSchema,
      confirmPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // Only validate password confirmation if password is provided
      if (data.password && data.password.length > 0) {
        if (data.password !== data.confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Passwords do not match.',
            path: ['confirmPassword'],
          })
        }
      }
    }),
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

  toast.add(commonSuccessToast('User is created.', toastGroup))
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

  toast.add(commonSuccessToast('User is updated.', toastGroup))
}
</script>
