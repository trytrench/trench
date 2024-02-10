/*
  Warnings:

  - You are about to drop the `EntityViews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventViews` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "EntityViews";

-- DropTable
DROP TABLE "EventViews";

-- CreateTable
CREATE TABLE "EventView" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "EventView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityView" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "EntityView_pkey" PRIMARY KEY ("id")
);
