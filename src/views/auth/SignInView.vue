<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores'
import { commonErrorToast, commonSuccessToast } from '@/services'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Card from 'primevue/card'
import Toast from 'primevue/toast'

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
    toast.add({
      severity: 'warn',
      summary: 'Validation Error',
      detail: 'Please enter both email and password',
      life: 3000,
    })
    return
  }

  isLoading.value = true

  try {
    await authStore.signIn({
      email: email.value,
      password: password.value,
    })

    toast.add(commonSuccessToast('Sign-in successful! Redirecting...', 'signInView'))

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
  <div class="bg-surface-50 flex min-h-screen items-center justify-center px-4">
    <Toast group="signInView" />

    <Card class="w-full max-w-md">
      <template #title>
        <h1 class="text-center text-2xl font-bold">Sign In</h1>
      </template>

      <template #content>
        <div class="flex flex-col gap-4">
          <!-- Email Input -->
          <div class="flex flex-col gap-2">
            <label for="email" class="font-medium">Email</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="Enter your email"
              :disabled="isLoading"
              @keypress="handleKeyPress"
              autocomplete="email"
            />
          </div>

          <!-- Password Input -->
          <div class="flex flex-col gap-2">
            <label for="password" class="font-medium">Password</label>
            <Password
              id="password"
              v-model="password"
              placeholder="Enter your password"
              :disabled="isLoading"
              :feedback="false"
              toggle-mask
              @keypress="handleKeyPress"
              autocomplete="current-password"
            />
          </div>

          <!-- Sign In Button -->
          <Button
            label="Sign In"
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
