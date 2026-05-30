<template>
  <nav class="sticky top-4 hidden w-44 shrink-0 lg:block">
    <ul class="flex flex-col gap-1">
      <li v-for="section in sections" :key="section.id">
        <button
          type="button"
          class="w-full rounded px-3 py-1.5 text-left text-sm transition-colors"
          :class="
            activeId === section.id
              ? 'bg-primary-50 text-primary-700 font-semibold'
              : 'text-stone-500 hover:text-stone-800'
          "
          @click="scrollTo(section.id)"
        >
          {{ section.label }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface Section {
  id: string
  label: string
}

interface Props {
  sections: Section[]
}

const props = defineProps<Props>()

const activeId = ref<string>(props.sections[0]?.id ?? '')

let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeId.value = entry.target.id
          break
        }
      }
    },
    { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
  )
  for (const section of props.sections) {
    const el = document.getElementById(section.id)
    if (el) observer.observe(el)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
})

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>
