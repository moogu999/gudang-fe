/** Prefixes a relative file URL from the API with the API base, leaving absolute ones alone. */
export function buildFileUrl(url: string): string {
  if (url.startsWith('http')) return url
  return `${import.meta.env.VITE_API_BASE_URL ?? ''}${url}`
}
