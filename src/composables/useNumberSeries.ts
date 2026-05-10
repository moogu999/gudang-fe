import { ref, onMounted } from 'vue'
import { NumberSeriesService } from '@/services'

export function useNumberSeries(entityType: string, options?: { initialMode?: 'auto' | 'manual' }) {
  const codeMode = ref<'auto' | 'manual'>('manual')
  const previewCode = ref('')
  const seriesId = ref<number | null>(null)
  const loading = ref(false)
  const hasDefaultSeries = ref(false)

  async function loadPreview() {
    loading.value = true
    try {
      const result = await NumberSeriesService.preview(entityType)
      previewCode.value = result.code
      seriesId.value = result.seriesId
      hasDefaultSeries.value = true
      codeMode.value = options?.initialMode ?? 'auto'
    } catch {
      hasDefaultSeries.value = false
      codeMode.value = 'manual'
    } finally {
      loading.value = false
    }
  }

  async function generateCode(): Promise<string> {
    if (!seriesId.value) throw new Error('No series selected')
    const result = await NumberSeriesService.generateNext(seriesId.value)
    return result.code
  }

  onMounted(() => {
    loadPreview()
  })

  return { codeMode, previewCode, seriesId, loading, hasDefaultSeries, loadPreview, generateCode }
}
