-- CreateTable
CREATE TABLE "FeatureMetadata" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataType" TEXT NOT NULL DEFAULT 'string',

    CONSTRAINT "FeatureMetadata_pkey" PRIMARY KEY ("id")
);
