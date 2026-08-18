ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "storeSlug" TEXT,
  ADD COLUMN IF NOT EXISTS "storeName" TEXT,
  ADD COLUMN IF NOT EXISTS "storeDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "storeHeroTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "storeHeroSubtitle" TEXT,
  ADD COLUMN IF NOT EXISTS "storeBadgeText" TEXT,
  ADD COLUMN IF NOT EXISTS "storePrimaryButtonLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "storeSecondaryButtonLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "storeWhatsappNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "storeInstagramUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "storeFacebookUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "storeTiktokUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "storeShippingFee" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "storeFreeShippingMin" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "storeShippingNote" TEXT,
  ADD COLUMN IF NOT EXISTS "storePrimaryColor" TEXT,
  ADD COLUMN IF NOT EXISTS "storeSecondaryColor" TEXT,
  ADD COLUMN IF NOT EXISTS "storeShowSocialLinks" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "storeShowShippingInfo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "storeBannerUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "storeLogoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "storeTheme" TEXT NOT NULL DEFAULT 'ocean',
  ADD COLUMN IF NOT EXISTS "storeActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "mercadopagoAccessToken" TEXT;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "storePublished" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "highlights" TEXT;

ALTER TABLE "Sale"
  ADD COLUMN IF NOT EXISTS "saleStatus" TEXT NOT NULL DEFAULT 'FINALIZADA';

CREATE TABLE IF NOT EXISTS "ProductImage" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProductImage_productId_idx" ON "ProductImage"("productId");

CREATE TABLE IF NOT EXISTS "StoreOrder" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paymentProvider" TEXT NOT NULL DEFAULT 'MERCADOPAGO',
  "paymentPreferenceId" TEXT,
  "paymentId" TEXT,
  "mercadopagoStatus" TEXT,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "shippingAddress" JSONB,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "externalReference" TEXT,
  "paidAt" TIMESTAMP(3),
  "saleId" TEXT,
  "companyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StoreOrder_code_key" UNIQUE ("code"),
  CONSTRAINT "StoreOrder_externalReference_key" UNIQUE ("externalReference"),
  CONSTRAINT "StoreOrder_saleId_key" UNIQUE ("saleId"),
  CONSTRAINT "StoreOrder_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "StoreOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StoreOrder_companyId_createdAt_idx" ON "StoreOrder"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "StoreOrder_companyId_status_idx" ON "StoreOrder"("companyId", "status");

CREATE TABLE IF NOT EXISTS "StoreOrderItem" (
  "id" TEXT NOT NULL,
  "storeOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "total" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreOrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StoreOrderItem_storeOrderId_fkey" FOREIGN KEY ("storeOrderId") REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StoreOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StoreOrderItem_storeOrderId_idx" ON "StoreOrderItem"("storeOrderId");
CREATE INDEX IF NOT EXISTS "StoreOrderItem_productId_idx" ON "StoreOrderItem"("productId");
