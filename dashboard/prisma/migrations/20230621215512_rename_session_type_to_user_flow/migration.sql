/*
  Warnings:

  - You are about to drop the column `typeId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the `RuleToSessionType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessionType` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userFlowId` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RuleToSessionType" DROP CONSTRAINT "RuleToSessionType_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "RuleToSessionType" DROP CONSTRAINT "RuleToSessionType_sessionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_typeId_fkey";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "typeId",
ADD COLUMN     "userFlowId" TEXT NOT NULL;

-- DropTable
DROP TABLE "RuleToSessionType";

-- DropTable
DROP TABLE "SessionType";

-- CreateTable
CREATE TABLE "UserFlow" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "UserFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleToUserFlow" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ruleId" TEXT NOT NULL,
    "userFlowId" TEXT NOT NULL,

    CONSTRAINT "RuleToUserFlow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFlow_name_key" ON "UserFlow"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RuleToUserFlow_ruleId_userFlowId_key" ON "RuleToUserFlow"("ruleId", "userFlowId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userFlowId_fkey" FOREIGN KEY ("userFlowId") REFERENCES "UserFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleToUserFlow" ADD CONSTRAINT "RuleToUserFlow_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleToUserFlow" ADD CONSTRAINT "RuleToUserFlow_userFlowId_fkey" FOREIGN KEY ("userFlowId") REFERENCES "UserFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
