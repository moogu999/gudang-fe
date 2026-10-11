<template>
  <div>
    <div class="grid grid-cols-3 gap-2">
      <!-- Saved photos -->
      <div
        v-for="(photo, i) in modelValue"
        :key="`saved-${photo.id}`"
        class="relative aspect-square overflow-hidden rounded-md bg-stone-100 ring-1 ring-stone-200"
        :class="{ 'col-span-2 row-span-2': i === 0 && layoutHero }"
      >
        <button type="button" class="h-full w-full" @click="zoom(buildFileUrl(photo.url))">
          <img :src="buildFileUrl(photo.url)" class="h-full w-full object-cover" alt="" />
        </button>
        <span
          v-if="i === 0"
          class="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-xs text-white"
          >{{ t('common.photos.main') }}</span
        >
        <button
          v-if="!readonly"
          type="button"
          class="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
          :aria-label="t('common.photos.remove')"
          :disabled="busyId === photo.id"
          @click="removeSaved(photo)"
        >
          <i class="pi pi-times text-xs" />
        </button>
      </div>

      <!-- Photos waiting for the owner to exist -->
      <div
        v-for="(item, i) in pending"
        :key="`pending-${i}`"
        class="relative aspect-square overflow-hidden rounded-md bg-stone-100 ring-1 ring-stone-200"
        :class="{ 'col-span-2 row-span-2': modelValue.length + i === 0 && layoutHero }"
      >
        <button type="button" class="h-full w-full" @click="zoom(item.previewUrl)">
          <img :src="item.previewUrl" class="h-full w-full object-cover" alt="" />
        </button>
        <button
          v-if="!readonly"
          type="button"
          class="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
          :aria-label="t('common.photos.remove')"
          @click="removePending(i)"
        >
          <i class="pi pi-times text-xs" />
        </button>
      </div>

      <!-- Photos carried over from a recommendation, each one optional -->
      <label
        v-for="photo in carryOver ?? []"
        :key="`carry-${photo.id}`"
        class="relative aspect-square cursor-pointer overflow-hidden rounded-md bg-stone-100 ring-1"
        :class="carryOverIds.includes(photo.id) ? 'ring-primary-500 ring-2' : 'opacity-60 ring-stone-200'"
      >
        <img :src="buildFileUrl(photo.url)" class="h-full w-full object-cover" alt="" />
        <Checkbox
          class="absolute top-1 left-1"
          :model-value="carryOverIds.includes(photo.id)"
          binary
          :disabled="readonly || (!carryOverIds.includes(photo.id) && remaining <= 0)"
          :data-testid="`carry-over-${photo.id}`"
          @update:model-value="toggleCarryOver(photo.id, $event)"
        />
      </label>

      <!-- Add tile -->
      <button
        v-if="!readonly && remaining > 0"
        type="button"
        class="hover:border-primary-400 flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-stone-300 text-stone-500"
        :disabled="isUploading"
        data-testid="add-photo"
        @click="inputRef?.click()"
      >
        <i :class="isUploading ? 'pi pi-spinner pi-spin' : 'pi pi-camera'" class="text-xl" />
        <span class="text-xs">{{ t('common.photos.add') }}</span>
      </button>
    </div>
    <input
      ref="inputRef"
      type="file"
      :accept="accept"
      multiple
      class="hidden"
      data-testid="photo-input"
      @change="onFilesSelected"
    />
    <small class="text-surface-500 mt-2 block">{{
      t('common.photos.hint', { max })
    }}</small>

    <Dialog v-model:visible="showDialog" modal :style="{ maxWidth: '90vw' }">
      <div class="flex justify-center">
        <img :src="zoomSrc" class="max-h-[75vh] max-w-full rounded object-contain" alt="" />
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import { FilesService } from '@/services/files.service'
import { ApiError } from '@/types/api.type'
import type { PhotoRef } from '@/types'
import { buildFileUrl } from '@/utils/fileUrl'

interface PendingPhoto {
  file: File
  previewUrl: string
}

const props = withDefaults(
  defineProps<{
    ownerType: string
    category?: string
    /** Set: photos upload as soon as they are picked. Unset: they wait for `flushPending`. */
    ownerId?: number | null
    modelValue: PhotoRef[]
    max?: number
    readonly?: boolean
    accept?: string
    /** Bytes. */
    maxSize?: number
    /** Photos of another record the user may keep; they count against `max` while selected. */
    carryOver?: PhotoRef[]
    carryOverIds?: number[]
  }>(),
  {
    category: 'photo',
    ownerId: null,
    max: 3,
    readonly: false,
    accept: 'image/jpeg,image/png,image/webp',
    maxSize: 10 * 1024 * 1024,
    carryOver: undefined,
    carryOverIds: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [photos: PhotoRef[]]
  'update:carryOverIds': [ids: number[]]
  /** A localized message for the parent to toast in its own group. */
  error: [message: string]
}>()

const { t } = useI18n()

const inputRef = ref<HTMLInputElement | null>(null)
const pending = ref<PendingPhoto[]>([])
const isUploading = ref(false)
const busyId = ref<number | null>(null)
const showDialog = ref(false)
const zoomSrc = ref('')

const used = computed(() => props.modelValue.length + pending.value.length + props.carryOverIds.length)
const remaining = computed(() => props.max - used.value)
// The big first tile only reads well once there is something else beside it.
const layoutHero = computed(() => used.value > 1)

function zoom(src: string) {
  zoomSrc.value = src
  showDialog.value = true
}

function messageFor(e: unknown): string {
  if (e instanceof ApiError && e.code === 'file_limit_reached') {
    return t('common.photos.limitReached')
  }
  if (e instanceof Error && e.message) return e.message
  return t('common.photos.uploadFailed')
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''

  for (const file of files) {
    if (remaining.value <= 0) break
    if (file.size > props.maxSize) {
      emit('error', t('common.photos.tooLarge', { size: props.maxSize / (1024 * 1024) }))
      continue
    }
    if (props.ownerId) {
      await uploadNow(props.ownerId, file)
    } else {
      pending.value.push({ file, previewUrl: URL.createObjectURL(file) })
    }
  }
}

async function uploadNow(ownerId: number, file: File) {
  isUploading.value = true
  try {
    const record = await FilesService.upload(props.ownerType, ownerId, props.category, file)
    emit('update:modelValue', [...props.modelValue, { id: record.id, url: record.url }])
  } catch (e) {
    emit('error', messageFor(e))
  } finally {
    isUploading.value = false
  }
}

async function removeSaved(photo: PhotoRef) {
  busyId.value = photo.id
  try {
    await FilesService.remove(photo.id)
    emit(
      'update:modelValue',
      props.modelValue.filter((p) => p.id !== photo.id),
    )
  } catch (e) {
    emit('error', messageFor(e))
  } finally {
    busyId.value = null
  }
}

function removePending(index: number) {
  const [removed] = pending.value.splice(index, 1)
  if (removed) URL.revokeObjectURL(removed.previewUrl)
}

function toggleCarryOver(id: number, checked: boolean) {
  const next = checked ? [...props.carryOverIds, id] : props.carryOverIds.filter((x) => x !== id)
  emit('update:carryOverIds', next)
}

/**
 * Uploads the photos picked before the owner existed, in the order they were
 * picked. The ones that fail are dropped from the list.
 *
 * @returns How many failed
 */
async function flushPending(ownerId: number): Promise<number> {
  const queue = pending.value
  pending.value = []
  let failures = 0
  const uploaded: PhotoRef[] = []
  for (const item of queue) {
    try {
      const record = await FilesService.upload(props.ownerType, ownerId, props.category, item.file)
      uploaded.push({ id: record.id, url: record.url })
    } catch {
      failures++
    } finally {
      URL.revokeObjectURL(item.previewUrl)
    }
  }
  if (uploaded.length) emit('update:modelValue', [...props.modelValue, ...uploaded])
  return failures
}

onBeforeUnmount(() => {
  for (const item of pending.value) URL.revokeObjectURL(item.previewUrl)
})

defineExpose({ flushPending, pendingCount: computed(() => pending.value.length) })
</script>
