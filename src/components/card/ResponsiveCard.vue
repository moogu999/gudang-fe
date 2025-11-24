<template>
  <Card :pt="{ body: 'p-2 sm:p-4 md:p-6', content: 'p-0' }">
    <template #header v-if="$slots.header">
      <slot name="header" />
    </template>
    <template #title v-if="$slots.title">
      <slot name="title" />
    </template>
    <template #subtitle v-if="$slots.subtitle">
      <slot name="subtitle" />
    </template>
    <template #content>
      <slot name="content" />
    </template>
    <template #footer v-if="$slots.footer">
      <slot name="footer" />
    </template>
  </Card>
</template>

<script setup lang="ts">
import Card from 'primevue/card'
</script>
