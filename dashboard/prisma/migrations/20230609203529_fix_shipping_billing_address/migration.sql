/*
  Warnings:

  - You are about to drop the column `phoneNumber` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `billingAddressId` on the `PaymentAttempt` table. All the data in the column will be lost.
  - You are about to drop the `BillingAddress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShippingAddress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BillingAddress" DROP CONSTRAINT "BillingAddress_addressId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT "PaymentAttempt_billingAddressId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT "PaymentAttempt_shippingAddressId_fkey";

-- DropForeignKey
ALTER TABLE "ShippingAddress" DROP CONSTRAINT "ShippingAddress_addressId_fkey";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "phoneNumber",
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "PaymentAttempt" DROP COLUMN "billingAddressId",
ADD COLUMN     "shippingName" TEXT,
ADD COLUMN     "shippingPhone" TEXT;

-- DropTable
DROP TABLE "BillingAddress";

-- DropTable
DROP TABLE "ShippingAddress";

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
