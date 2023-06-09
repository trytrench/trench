/*
  Warnings:

  - A unique constraint covering the columns `[paymentAttemptId,ruleId]` on the table `RuleExecution` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RuleExecution_paymentAttemptId_ruleId_key" ON "RuleExecution"("paymentAttemptId", "ruleId");
