export function resolveDatabaseUrl() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    process.env.DIRECT_URL ??
    null

  const trimmed = databaseUrl?.trim() || null

  if (!trimmed) return null

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim() || null
  }

  return trimmed
}
