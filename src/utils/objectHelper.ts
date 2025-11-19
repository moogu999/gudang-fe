// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue<T extends Record<string, any>>(obj: T, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

export { getNestedValue }
