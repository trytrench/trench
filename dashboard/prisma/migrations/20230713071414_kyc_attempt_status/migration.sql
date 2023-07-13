/*
  Warnings:

  - Added the required column `status` to the `KycAttempt` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "KycAttemptStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'PENDING');

-- AlterTable
ALTER TABLE "KycAttempt" ADD COLUMN     "status" "KycAttemptStatus" NOT NULL;
