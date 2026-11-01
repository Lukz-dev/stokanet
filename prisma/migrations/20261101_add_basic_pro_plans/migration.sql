-- Planos BASIC e PRO: novos valores no enum PlanType (planos da empresa)
ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'BASIC';
ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'PRO';
