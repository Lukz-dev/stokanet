#!/usr/bin/env node
// Build wrapper: roda migrate deploy + prisma generate somente quando
// há URL de banco no ambiente (Vercel/CI sem DATABASE_URL pula estas etapas).
const { execSync } = require('child_process')

const envVars = ['DATABASE_URL', 'TURSO_DATABASE_URL', 'LIBSQL_URL', 'DIRECT_URL']
const has = envVars.some((v) => Boolean(process.env[v]))

if (!has) {
  console.log('Skipping Prisma migrate/generate: no database URL env variable found.')
  process.exit(0)
}

console.log('Database URL found, running `prisma migrate deploy` + `prisma generate`...')
try {
  execSync('npx prisma migrate deploy && npx prisma generate', { stdio: 'inherit', shell: '/bin/sh' })
  console.log('Prisma steps completed')
} catch (err) {
  console.error('Prisma steps failed:', err)
  process.exit(1)
}
