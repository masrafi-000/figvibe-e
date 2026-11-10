-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('ONLINE', 'POS');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('STORE_PICKUP', 'HOME_DELIVERY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'CASH';
ALTER TYPE "PaymentMethod" ADD VALUE 'CARD';
ALTER TYPE "PaymentMethod" ADD VALUE 'ROCKET';
ALTER TYPE "PaymentMethod" ADD VALUE 'BANK_TRANSFER';

-- AlterTable
ALTER TABLE "cart_items" ALTER COLUMN "quantity" DROP DEFAULT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "channel" "OrderChannel" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "deliveryType" "DeliveryType" NOT NULL DEFAULT 'HOME_DELIVERY',
ADD COLUMN     "salesmanId" TEXT;

-- CreateIndex
CREATE INDEX "carts_updatedAt_idx" ON "carts"("updatedAt");

-- CreateIndex
CREATE INDEX "orders_salesmanId_idx" ON "orders"("salesmanId");

-- CreateIndex
CREATE INDEX "orders_channel_idx" ON "orders"("channel");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
