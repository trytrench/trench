-- CreateTable
CREATE TABLE "FeatureDef" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "FeatureDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureDefSnapshot" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "deps" TEXT[],
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "featureDefId" TEXT NOT NULL,

    CONSTRAINT "FeatureDefSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeatureDef" ADD CONSTRAINT "FeatureDef_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureDefSnapshot" ADD CONSTRAINT "FeatureDefSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureDefSnapshot" ADD CONSTRAINT "FeatureDefSnapshot_featureDefId_fkey" FOREIGN KEY ("featureDefId") REFERENCES "FeatureDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;
