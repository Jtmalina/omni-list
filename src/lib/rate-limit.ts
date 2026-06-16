// Lightweight in-memory rate limiter (fixed window).
//
// No external service to provision — state lives at module scope, which Vercel's
// runtime keeps warm across invocations on the same instance. For a low-traffic,
// auth-gated app this is plenty: it stops a single client from hammering search,
// downloads, or the self-hosted Sonarr/Radarr server. If the app ever scales to
// many concurrent instances, swap this for @upstash/ratelimit (same call shape).

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()
let lastSweep = Date.now()

// Drop expired buckets occasionally so the map can't grow unbounded.
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, b] of store) {
    if (now > b.resetAt) store.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the window resets (only meaningful when ok === false). */
  retryAfter: number
}

/**
 * Records a hit for `key` and reports whether it's within the limit.
 * @param key    Unique bucket key, e.g. `download:${userId}`
 * @param limit  Max hits allowed per window
 * @param windowMs  Window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const bucket = store.get(key)
  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }

  bucket.count++
  return { ok: true, retryAfter: 0 }
}

/** Throws a user-facing error if the limit is exceeded. */
export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const result = rateLimit(key, limit, windowMs)
  if (!result.ok) {
    throw new Error(`Too many requests — please wait ${result.retryAfter}s and try again.`)
  }
}
