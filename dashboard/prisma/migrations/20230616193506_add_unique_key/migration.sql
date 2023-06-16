/*
  Warnings:

  - A unique constraint covering the columns `[ruleId,sessionTypeId]` on the table `RuleToSessionType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RuleToSessionType_ruleId_sessionTypeId_key" ON "RuleToSessionType"("ruleId", "sessionTypeId");
