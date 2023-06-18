-- AlterTable
ALTER TABLE "EvaluableAction" ALTER COLUMN "transformsOutput" DROP NOT NULL,
ALTER COLUMN "transformsOutput" DROP DEFAULT,
ALTER COLUMN "riskLevel" DROP NOT NULL;
