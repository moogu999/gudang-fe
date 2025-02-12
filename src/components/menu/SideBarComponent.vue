<template>
  <div class="flex h-full max-h-screen flex-col gap-2">
    <div class="flex h-14 items-center border-b border-stone-200/70 px-4 lg:h-[60px] lg:px-6">
      <RouterLink to="/" class="flex items-center gap-2 font-semibold">
        <h1>gudang-fe</h1>
      </RouterLink>
    </div>

    <div class="flex-1">
      <div class="card flex justify-center p-2">
        <PanelMenuComponent />
      </div>
    </div>

    <div class="mt-auto p-4">
      <Card>
        <template #title>Upgrade to Pro</template>
        <template #subtitle>
          Unlock all features and get unlimited access to our support team.
        </template>
        <template #content>
          <Button class="w-full"> Upgrade </Button>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import PanelMenuComponent from './PanelMenuComponent.vue'
</script>
