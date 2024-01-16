-- CreateTable
CREATE TABLE "EntityTypePage" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityTypeId" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "EntityTypePage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EntityTypePage" ADD CONSTRAINT "EntityTypePage_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "EntityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
