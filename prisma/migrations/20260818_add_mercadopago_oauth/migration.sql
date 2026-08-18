ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "mercadopagoRefreshToken" TEXT,
  ADD COLUMN IF NOT EXISTS "mercadopagoUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "mercadopagoTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mercadopagoConnectedAt" TIMESTAMP(3);
