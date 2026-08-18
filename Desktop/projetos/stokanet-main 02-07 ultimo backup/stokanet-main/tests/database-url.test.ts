import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveDatabaseUrl } from '../lib/database-url'

test('prefers Vercel Postgres environment variables when present', () => {
  const previousDatabaseUrl = process.env.DATABASE_URL
  const previousDirectUrl = process.env.DIRECT_URL
  const previousPostgresUrl = process.env.POSTGRES_URL
  const previousPostgresPrismaUrl = process.env.POSTGRES_PRISMA_URL

  delete process.env.DATABASE_URL
  delete process.env.DIRECT_URL
  delete process.env.POSTGRES_URL
  delete process.env.POSTGRES_PRISMA_URL
  process.env.POSTGRES_URL = 'postgresql://vercel:vercel@db.example.com:5432/vercel'

  try {
    const result = resolveDatabaseUrl()
    assert.equal(result, 'postgresql://vercel:vercel@db.example.com:5432/vercel')
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDatabaseUrl

    if (previousDirectUrl === undefined) delete process.env.DIRECT_URL
    else process.env.DIRECT_URL = previousDirectUrl

    if (previousPostgresUrl === undefined) delete process.env.POSTGRES_URL
    else process.env.POSTGRES_URL = previousPostgresUrl

    if (previousPostgresPrismaUrl === undefined) delete process.env.POSTGRES_PRISMA_URL
    else process.env.POSTGRES_PRISMA_URL = previousPostgresPrismaUrl
  }
})

test('returns a safe fallback when no database URL is configured', () => {
  const previousDatabaseUrl = process.env.DATABASE_URL
  const previousDirectUrl = process.env.DIRECT_URL
  const previousPostgresUrl = process.env.POSTGRES_URL
  const previousPostgresPrismaUrl = process.env.POSTGRES_PRISMA_URL
  const previousTursoDatabaseUrl = process.env.TURSO_DATABASE_URL
  const previousLibSqlUrl = process.env.LIBSQL_URL

  delete process.env.DATABASE_URL
  delete process.env.DIRECT_URL
  delete process.env.POSTGRES_URL
  delete process.env.POSTGRES_PRISMA_URL
  delete process.env.TURSO_DATABASE_URL
  delete process.env.LIBSQL_URL

  try {
    const result = resolveDatabaseUrl({ allowFallback: true })
    assert.equal(result, 'postgresql://postgres:postgres@localhost:5432/postgres')
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDatabaseUrl

    if (previousDirectUrl === undefined) delete process.env.DIRECT_URL
    else process.env.DIRECT_URL = previousDirectUrl

    if (previousPostgresUrl === undefined) delete process.env.POSTGRES_URL
    else process.env.POSTGRES_URL = previousPostgresUrl

    if (previousPostgresPrismaUrl === undefined) delete process.env.POSTGRES_PRISMA_URL
    else process.env.POSTGRES_PRISMA_URL = previousPostgresPrismaUrl

    if (previousTursoDatabaseUrl === undefined) delete process.env.TURSO_DATABASE_URL
    else process.env.TURSO_DATABASE_URL = previousTursoDatabaseUrl

    if (previousLibSqlUrl === undefined) delete process.env.LIBSQL_URL
    else process.env.LIBSQL_URL = previousLibSqlUrl
  }
})
