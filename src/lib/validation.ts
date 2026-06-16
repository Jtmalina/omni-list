import { z } from 'zod'

// Shared input schemas for server actions. Server actions receive arbitrary
// client input — TypeScript types are erased at runtime, so validate anything
// that flows into the database, an external API, or a destructive operation.

/** Prisma cuid-style id: non-empty, bounded, safe charset. */
export const idSchema = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)

/** A list of season numbers (0 = specials), bounded to a sane count. */
export const seasonsSchema = z.array(z.number().int().min(0).max(100)).max(100)

/** A Sonarr/Radarr internal record id. */
export const serverIdSchema = z.number().int().positive()

/**
 * Validates `value` against `schema`, throwing a clean user-facing error on
 * failure (never leaking zod internals or the raw value).
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, label = 'input'): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new Error(`Invalid ${label}.`)
  }
  return result.data
}
