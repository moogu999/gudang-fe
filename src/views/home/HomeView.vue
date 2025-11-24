<template>
  <div class="flex items-center">
    <h1 class="text-base font-semibold sm:text-lg md:text-2xl">Inventory</h1>
  </div>
  <div class="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
    <div class="flex flex-col items-center gap-1 text-center">
      <h3 class="text-xl font-bold tracking-tight sm:text-2xl">You have no products</h3>
      <p class="text-xs text-muted-foreground sm:text-sm">
        You can start selling as soon as you add a product.
      </p>
      <Button class="mt-4"> Add Product </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from 'primevue'
</script>
