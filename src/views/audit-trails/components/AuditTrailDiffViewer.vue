<template>
  <div class="overflow-x-auto rounded border border-stone-200 font-mono text-sm">
    <!-- Created / Deleted banners -->
    <div v-if="props.prev === null && props.curr !== null" class="bg-green-100 px-4 py-2 text-green-800 font-semibold">
      {{ t('auditTrails.detail.created') }}
    </div>
    <div v-if="props.curr === null && props.prev !== null" class="bg-red-100 px-4 py-2 text-red-800 font-semibold">
      {{ t('auditTrails.detail.deleted') }}
    </div>

    <!-- Column headers -->
    <div class="grid grid-cols-[3rem_1fr_3rem_1fr] bg-stone-100 text-xs text-stone-500 border-b border-stone-200">
      <div class="px-2 py-1 text-center border-r border-stone-200">#</div>
      <div class="px-3 py-1 border-r border-stone-200">{{ t('auditTrails.detail.previous') }}</div>
      <div class="px-2 py-1 text-center border-r border-stone-200">#</div>
      <div class="px-3 py-1">{{ t('auditTrails.detail.current') }}</div>
    </div>

    <!-- Diff rows -->
    <div
      v-for="(row, i) in diffRows"
      :key="i"
      class="grid grid-cols-[3rem_1fr_3rem_1fr] border-b border-stone-100 last:border-0"
    >
      <!-- Left line number -->
      <div
        class="px-2 py-0.5 text-right text-xs text-stone-400 select-none border-r border-stone-200"
        :class="row.leftClass"
      >
        {{ row.leftLineNum ?? '' }}
      </div>
      <!-- Left content -->
      <div
        class="px-3 py-0.5 whitespace-pre border-r border-stone-200 min-w-0"
        :class="row.leftClass"
      >{{ row.left }}</div>
      <!-- Right line number -->
      <div
        class="px-2 py-0.5 text-right text-xs text-stone-400 select-none border-r border-stone-200"
        :class="row.rightClass"
      >
        {{ row.rightLineNum ?? '' }}
      </div>
      <!-- Right content -->
      <div
        class="px-3 py-0.5 whitespace-pre min-w-0"
        :class="row.rightClass"
      >{{ row.right }}</div>
    </div>

    <div v-if="diffRows.length === 0" class="px-4 py-6 text-center text-stone-400 text-sm">
      {{ t('common.messages.noData') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { diffLines } from 'diff'

const { t } = useI18n()

const props = defineProps<{
  prev: Record<string, unknown> | null
  curr: Record<string, unknown> | null
}>()

type DiffRow = {
  left: string
  right: string
  leftLineNum: number | null
  rightLineNum: number | null
  leftClass: string
  rightClass: string
}

const diffRows = computed<DiffRow[]>(() => {
  const prevStr = props.prev !== null ? JSON.stringify(props.prev, null, 2) : ''
  const currStr = props.curr !== null ? JSON.stringify(props.curr, null, 2) : ''

  const parts = diffLines(prevStr, currStr)
  const rows: DiffRow[] = []
  let leftLine = 1
  let rightLine = 1

  let i = 0
  while (i < parts.length) {
    const part = parts[i]

    if (!part.added && !part.removed) {
      // unchanged
      const lines = part.value.split('\n').filter((_, idx, arr) => idx < arr.length - 1 || arr[idx] !== '')
      for (const line of lines) {
        rows.push({
          left: line,
          right: line,
          leftLineNum: leftLine++,
          rightLineNum: rightLine++,
          leftClass: '',
          rightClass: '',
        })
      }
      i++
    } else if (part.removed && i + 1 < parts.length && parts[i + 1].added) {
      // changed block: merge removed + added side by side
      const removedLines = part.value.split('\n').filter((_, idx, arr) => idx < arr.length - 1 || arr[idx] !== '')
      const addedLines = parts[i + 1].value.split('\n').filter((_, idx, arr) => idx < arr.length - 1 || arr[idx] !== '')
      const maxLen = Math.max(removedLines.length, addedLines.length)
      for (let j = 0; j < maxLen; j++) {
        const hasLeft = j < removedLines.length
        const hasRight = j < addedLines.length
        rows.push({
          left: hasLeft ? removedLines[j] : '',
          right: hasRight ? addedLines[j] : '',
          leftLineNum: hasLeft ? leftLine++ : null,
          rightLineNum: hasRight ? rightLine++ : null,
          leftClass: hasLeft ? 'bg-red-50' : '',
          rightClass: hasRight ? 'bg-green-50' : '',
        })
      }
      i += 2
    } else if (part.removed) {
      const lines = part.value.split('\n').filter((_, idx, arr) => idx < arr.length - 1 || arr[idx] !== '')
      for (const line of lines) {
        rows.push({
          left: line,
          right: '',
          leftLineNum: leftLine++,
          rightLineNum: null,
          leftClass: 'bg-red-50',
          rightClass: '',
        })
      }
      i++
    } else if (part.added) {
      const lines = part.value.split('\n').filter((_, idx, arr) => idx < arr.length - 1 || arr[idx] !== '')
      for (const line of lines) {
        rows.push({
          left: '',
          right: line,
          leftLineNum: null,
          rightLineNum: rightLine++,
          leftClass: '',
          rightClass: 'bg-green-50',
        })
      }
      i++
    } else {
      i++
    }
  }

  return rows
})
</script>
