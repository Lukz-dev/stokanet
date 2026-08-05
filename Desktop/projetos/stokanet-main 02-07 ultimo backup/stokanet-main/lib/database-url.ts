type ResolveDatabaseUrlOptions = {
  allowFallback?: boolean
}

const DEFAULT_FALLBACK_URL = 'postgresql://postgres:postgres@localhost:5432/postgres'

export function resolveDatabaseUrl(options: ResolveDatabaseUrlOptions = {}) {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.TURSO_DATABASE_URL,
    process.env.LIBSQL_URL,
  ]

  const trimmed = candidates.find((value): value is string => Boolean(value && value.trim()))?.trim() || null

  if (!trimmed) {
    return options.allowFallback ? DEFAULT_FALLBACK_URL : null
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim() || (options.allowFallback ? DEFAULT_FALLBACK_URL : null)
  }

  return trimmed
}
