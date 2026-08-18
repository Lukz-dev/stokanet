ALTER TABLE "Company"
  ADD COLUMN "mercadopagoRefreshToken" TEXT,
  ADD COLUMN "mercadopagoUserId" TEXT,
  ADD COLUMN "mercadopagoTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "mercadopagoConnectedAt" TIMESTAMP(3);
