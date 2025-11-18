<template>
  <div class="w-full">
    <div ref="mountPoint" class="iframe-container min-h-[900px] w-full rounded-lg border"></div>

    <!-- <iframe src="http://localhost:8088/" frameborder="0" class="min-h-[900px] w-full" /> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { embedDashboard } from '@superset-ui/embedded-sdk'
import ApiService from '@/services/api'

interface EmbedResponse {
  domain: string
  token: string
}

const mountPoint = ref<HTMLDivElement | null>(null)

onMounted(async () => {
  const { domain, token } = await ApiService.get<EmbedResponse>(
    '/v1/superset/e5c9e518-4376-413c-83c5-00f90e73d356',
  )

  await embedDashboard({
    id: 'e5c9e518-4376-413c-83c5-00f90e73d356',
    supersetDomain: domain,
    mountPoint: mountPoint.value!,
    fetchGuestToken: async () => token,
    dashboardUiConfig: {
      hideTitle: true,
      filters: {
        expanded: true,
      },
    },
    iframeSandboxExtras: ['allow-top-navigation', 'allow-popups-to-escape-sandbox'],
    referrerPolicy: 'same-origin',
    debug: true,
  })
})
</script>

<style>
.iframe-container > iframe {
  min-height: 900px;
  width: 100%;
}
</style>
