<script setup lang="ts">
import MinimalHeaderComponent from '@/components/menu/MinimalHeaderComponent.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <header
      class="flex h-14 items-center gap-4 border-b border-stone-200/70 bg-stone-50/70 px-4 lg:h-[60px] lg:px-6"
    >
      <MinimalHeaderComponent />
    </header>

    <main class="flex flex-1 flex-col gap-4 p-4 lg:gap-10 lg:p-10">
      <RouterView />
    </main>
  </div>
</template>
