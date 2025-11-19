import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import { useAuthStore } from './stores'
import ApiService from './services/api'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: false,
    },
  },
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('tooltip', Tooltip)

// Register auth failure handler to clear state and redirect to sign-in
const authStore = useAuthStore()
ApiService.setAuthFailureHandler(() => {
  authStore.isAuthenticated = false
  authStore.userId = null
  authStore.permissions = []

  const currentPath = window.location.pathname
  if (currentPath !== '/sign-in') {
    router.push({ name: 'SignIn', query: { redirect: currentPath } })
  }
})

// Initialize auth state (router guard will wait for this to complete)
authStore.initialize()

app.mount('#app')
