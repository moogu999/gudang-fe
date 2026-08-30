/**
 * Spells one label filter the way the hand-written list endpoints read it:
 * a single `definitionId:optionId` value, repeated for more than one filter.
 *
 * A pair is one value rather than a nested object because the backend's
 * deepObject binder cannot populate an array of objects — it keeps each
 * element's scalar value and drops its fields, so nested pairs arrived zeroed
 * and matched nothing.
 *
 * Shared by the customers and products lists so the wire format has one
 * definition; both endpoints parse it with the same Go helper.
 *
 * @param definitionId - The label definition being filtered on
 * @param optionId - The option of that definition a row must carry
 * @returns One query parameter, ready to join with `&`
 *
 * @example
 * ```typescript
 * labelFilterParam(3, 7) // 'labelFilter=3%3A7'
 * ```
 */
export function labelFilterParam(definitionId: number, optionId: number): string {
  return `labelFilter=${encodeURIComponent(`${definitionId}:${optionId}`)}`
}
