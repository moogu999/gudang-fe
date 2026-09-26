/**
 * Cache keys for master-data GETs.
 *
 * The backend lets the browser cache master data for a few seconds to a day
 * (Cache-Control max-age), and a cached response can't be invalidated. The
 * only way to skip it is to request a different URL, so every master-data
 * GET carries a `_v` query param:
 * - it starts as the page-load time, so a reload always refetches;
 * - it's bumped after this client's own writes to that data, so a user
 *   never sees their own edit missing from a list.
 *
 * Which paths are master data, and which writes invalidate what, comes from
 * GET /v1/cache-policies. There's no copy of that table here. The endpoint
 * needs auth, so load it after sign-in; until then no GET carries a `_v`.
 */

export interface CacheGroup {
  key: string
  tier: string
  paths: string[]
  /** Groups and sources whose data these responses embed, directly or not. */
  dependsOn?: string[]
}

/** Data no group serves but groups embed (e.g. users), and the writes that change it. */
export interface CacheSource {
  key: string
  writes: { method: string; path: string }[]
}

export interface CacheInvalidation {
  method: string
  path: string
  groups: string[]
}

export interface CachePolicies {
  tiers: Record<string, { maxAge: number }>
  groups: CacheGroup[]
  sources?: CacheSource[]
  invalidations: CacheInvalidation[]
}

export const ALL_GROUPS = '*'

const segments = (path: string) => path.split('?')[0]!.split('/').filter(Boolean)

const isParam = (segment: string) => segment.startsWith('{') && segment.endsWith('}')

/** Whether `path` matches a chi route pattern, where `{param}` matches any one segment. */
export function matchesPattern(pattern: string, path: string): boolean {
  const p = segments(pattern)
  const s = segments(path)
  return p.length === s.length && p.every((seg, i) => isParam(seg) || seg === s[i])
}

/**
 * Whether a write to `path` touches data served by `pattern`: one is a
 * segment-wise prefix of the other. PUT /v1/products/5/labels overlaps
 * /v1/products, and POST /v1/price-lists overlaps /v1/price-lists/{id}.
 */
export function overlaps(pattern: string, path: string): boolean {
  const p = segments(pattern)
  const s = segments(path)
  const n = Math.min(p.length, s.length)
  for (let i = 0; i < n; i++) {
    if (!isParam(p[i]!) && p[i] !== s[i]) return false
  }
  return true
}

export class CacheKeyStore {
  private policies: CachePolicies | null = null
  private bootVersion: number
  private versions = new Map<string, number>()

  constructor(private now: () => number = Date.now) {
    this.bootVersion = now()
  }

  get loaded(): boolean {
    return this.policies !== null
  }

  setPolicies(policies: CachePolicies): void {
    this.policies = policies
  }

  /** The `_v` to send with a GET to `path`, or undefined if it isn't master data. */
  versionFor(path: string): number | undefined {
    const group = this.policies?.groups.find((g) => g.paths.some((p) => matchesPattern(p, path)))
    if (!group) return undefined
    return this.versions.get(group.key) ?? this.bootVersion
  }

  /** Invalidates every group a successful non-GET request to `path` may have changed. */
  recordWrite(method: string, path: string): void {
    if (!this.policies) return

    const keys = new Set<string>()
    for (const g of this.policies.groups) {
      if (g.paths.some((p) => overlaps(p, path))) keys.add(g.key)
    }
    for (const inv of this.policies.invalidations) {
      if (inv.method === method.toUpperCase() && matchesPattern(inv.path, path)) {
        inv.groups.forEach((k) => keys.add(k))
      }
    }
    for (const src of this.policies.sources ?? []) {
      if (
        src.writes.some((w) => w.method === method.toUpperCase() && matchesPattern(w.path, path))
      ) {
        keys.add(src.key)
      }
    }
    // Groups whose responses embed a changed group or source change too.
    for (const g of this.policies.groups) {
      if (g.dependsOn?.some((k) => keys.has(k))) keys.add(g.key)
    }

    // A bump must always produce a new value, even within the same millisecond.
    const version = Math.max(this.now(), this.bootVersion + 1, ...this.versions.values()) + 1
    if (keys.has(ALL_GROUPS)) {
      this.bootVersion = version
      this.versions.clear()
      return
    }
    keys.forEach((k) => this.versions.set(k, version))
  }
}
