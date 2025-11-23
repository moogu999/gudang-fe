<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores'
import { commonErrorToast, commonSuccessToast, commonWarnToast } from '@/services'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Card from 'primevue/card'
import Toast from 'primevue/toast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const authStore = useAuthStore()

// Form state
const email = ref('')
const password = ref('')
const isLoading = ref(false)

/**
 * Handle sign-in form submission
 */
async function handleSignIn() {
  // Basic validation
  if (!email.value || !password.value) {
    toast.add(commonWarnToast(t('auth.signIn.validation.requiredFields'), 'signInView'))
    return
  }

  isLoading.value = true

  try {
    await authStore.signIn({
      email: email.value,
      password: password.value,
    })

    toast.add(commonSuccessToast(t('auth.signIn.messages.success'), 'signInView'))

    // Redirect to the page user was trying to access, or home by default
    const redirectPath = (route.query.redirect as string) || '/'
    setTimeout(() => {
      router.push(redirectPath)
    }, 500)
  } catch (error) {
    toast.add(commonErrorToast(error, 'signInView'))
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle Enter key press to submit form
 */
function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    handleSignIn()
  }
}
</script>

<template>
  <div
    class="before:via-surface-0 relative flex min-h-screen items-center justify-center px-4 before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-50 before:to-indigo-50"
  >
    <!-- Background pattern -->
    <div
      class="absolute inset-0 opacity-[0.03]"
      style="
        background-image: radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0);
        background-size: 40px 40px;
      "
    ></div>

    <Toast group="signInView" />

    <Card class="relative z-10 w-full max-w-md shadow-lg">
      <template #title>
        <h1 class="text-center text-2xl font-bold">{{ t('auth.signIn.title') }}</h1>
      </template>

      <template #content>
        <div class="flex flex-col gap-4">
          <!-- Email Input -->
          <div class="flex flex-col gap-2">
            <label for="email" class="font-medium">{{ t('auth.signIn.email') }}</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              :placeholder="t('auth.signIn.emailPlaceholder')"
              :disabled="isLoading"
              @keypress="handleKeyPress"
              autocomplete="email"
            />
          </div>

          <!-- Password Input -->
          <div class="flex flex-col gap-2">
            <label for="password" class="font-medium">{{ t('auth.signIn.password') }}</label>
            <Password
              id="password"
              v-model="password"
              :placeholder="t('auth.signIn.passwordPlaceholder')"
              :disabled="isLoading"
              :feedback="false"
              toggle-mask
              @keypress="handleKeyPress"
              autocomplete="current-password"
              input-class="w-full"
              class="w-full"
              :pt="{
                pcInputText: { root: 'w-full' },
                iconField: { root: 'w-full' },
              }"
            />
          </div>

          <!-- Sign In Button -->
          <Button
            :label="t('auth.signIn.signInButton')"
            :loading="isLoading"
            @click="handleSignIn"
            class="mt-4 w-full"
            size="large"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
:deep(.p-password) {
  display: flex;
  width: 100%;
}

:deep(.p-password .p-inputtext) {
  flex: 1;
  width: 100%;
}

:deep(.p-password .p-icon-field) {
  width: 100%;
}

:deep(.p-password button) {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
}
</style>
