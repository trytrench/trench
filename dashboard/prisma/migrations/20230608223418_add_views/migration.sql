/*
  Warnings:

  - You are about to drop the column `customerId` on the `BillingAddress` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `ShippingAddress` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "BillingAddress" DROP CONSTRAINT "BillingAddress_customerId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_customerId_fkey";

-- DropForeignKey
ALTER TABLE "ShippingAddress" DROP CONSTRAINT "ShippingAddress_customerId_fkey";

-- AlterTable
ALTER TABLE "BillingAddress" DROP COLUMN "customerId";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "customerId";

-- AlterTable
ALTER TABLE "ShippingAddress" DROP COLUMN "customerId";
