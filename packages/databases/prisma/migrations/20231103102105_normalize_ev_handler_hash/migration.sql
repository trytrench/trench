-- DropIndex
DROP INDEX "EventHandler_hash_key";

-- CreateTable
CREATE TABLE "EventHandlerHash" (
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventHandlerHash_pkey" PRIMARY KEY ("hash")
);

-- AddForeignKey
ALTER TABLE "EventHandler" ADD CONSTRAINT "EventHandler_hash_fkey" FOREIGN KEY ("hash") REFERENCES "EventHandlerHash"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;
