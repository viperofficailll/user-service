/*
  Warnings:

  - A unique constraint covering the columns `[merchantId]` on the table `DeliveryAgent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DeliveryAgent" ADD COLUMN     "merchantId" TEXT,
ADD COLUMN     "paymentGateway" TEXT NOT NULL DEFAULT 'E_SEWA';

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAgent_merchantId_key" ON "DeliveryAgent"("merchantId");
