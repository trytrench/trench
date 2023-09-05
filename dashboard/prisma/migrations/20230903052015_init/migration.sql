-- CreateTable
CREATE TABLE "EventType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EventType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "type" TEXT NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFeature" (
    "eventType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "EventFeature_pkey" PRIMARY KEY ("eventType","name")
);

-- CreateTable
CREATE TABLE "EntityFeature" (
    "entityType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "EntityFeature_pkey" PRIMARY KEY ("entityType","name")
);

-- CreateTable
CREATE TABLE "EntityType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EntityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "name" TEXT NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "type" TEXT NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entitySnapshot" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "LinkType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventToEntityLink" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "eventId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "EventToEntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileSnapshot" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "fileId" TEXT,

    CONSTRAINT "FileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentFileSnapshotId" TEXT NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLabelType" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,

    CONSTRAINT "EntityLabelType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLabel" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "color" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "labelType" TEXT NOT NULL,

    CONSTRAINT "EntityLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLabelType" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,

    CONSTRAINT "EventLabelType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLabel" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "color" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "labelType" TEXT NOT NULL,

    CONSTRAINT "EventLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "_EventToEventLabel" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_EntityToEntityLabel" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Event_data_idx" ON "Event" USING GIN ("data" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "Event_type_id_idx" ON "Event"("type", "id");

-- CreateIndex
CREATE INDEX "Event_timestamp_idx" ON "Event"("timestamp");

-- CreateIndex
CREATE INDEX "Event_type_timestamp_id_idx" ON "Event"("type", "timestamp", "id");

-- CreateIndex
CREATE INDEX "Event_id_timestamp_type_idx" ON "Event"("id", "timestamp", "type");

-- CreateIndex
CREATE INDEX "Entity_features_idx" ON "Entity" USING GIN ("features" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "Entity_type_id_idx" ON "Entity"("type", "id");

-- CreateIndex
CREATE INDEX "EventToEntityLink_eventId_idx" ON "EventToEntityLink"("eventId");

-- CreateIndex
CREATE INDEX "EventToEntityLink_entityId_idx" ON "EventToEntityLink"("entityId");

-- CreateIndex
CREATE INDEX "EventToEntityLink_entityId_eventId_idx" ON "EventToEntityLink"("entityId", "eventId");

-- CreateIndex
CREATE INDEX "EventToEntityLink_type_eventId_entityId_idx" ON "EventToEntityLink"("type", "eventId", "entityId");

-- CreateIndex
CREATE INDEX "EventToEntityLink_type_entityId_eventId_idx" ON "EventToEntityLink"("type", "entityId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "File_currentFileSnapshotId_key" ON "File"("currentFileSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityLabel_name_entityType_labelType_key" ON "EntityLabel"("name", "entityType", "labelType");

-- CreateIndex
CREATE UNIQUE INDEX "EventLabel_name_eventType_labelType_key" ON "EventLabel"("name", "eventType", "labelType");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "_EventToEventLabel_AB_unique" ON "_EventToEventLabel"("A", "B");

-- CreateIndex
CREATE INDEX "_EventToEventLabel_B_index" ON "_EventToEventLabel"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EntityToEntityLabel_AB_unique" ON "_EntityToEntityLabel"("A", "B");

-- CreateIndex
CREATE INDEX "_EntityToEntityLabel_B_index" ON "_EntityToEntityLabel"("B");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_type_fkey" FOREIGN KEY ("type") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeature" ADD CONSTRAINT "EventFeature_eventType_fkey" FOREIGN KEY ("eventType") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityFeature" ADD CONSTRAINT "EntityFeature_entityType_fkey" FOREIGN KEY ("entityType") REFERENCES "EntityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_type_fkey" FOREIGN KEY ("type") REFERENCES "EntityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventToEntityLink" ADD CONSTRAINT "EventToEntityLink_type_fkey" FOREIGN KEY ("type") REFERENCES "LinkType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventToEntityLink" ADD CONSTRAINT "EventToEntityLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventToEntityLink" ADD CONSTRAINT "EventToEntityLink_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSnapshot" ADD CONSTRAINT "FileSnapshot_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_currentFileSnapshotId_fkey" FOREIGN KEY ("currentFileSnapshotId") REFERENCES "FileSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLabel" ADD CONSTRAINT "EntityLabel_entityType_fkey" FOREIGN KEY ("entityType") REFERENCES "EntityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLabel" ADD CONSTRAINT "EntityLabel_labelType_fkey" FOREIGN KEY ("labelType") REFERENCES "EntityLabelType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLabel" ADD CONSTRAINT "EventLabel_eventType_fkey" FOREIGN KEY ("eventType") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLabel" ADD CONSTRAINT "EventLabel_labelType_fkey" FOREIGN KEY ("labelType") REFERENCES "EventLabelType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToEventLabel" ADD CONSTRAINT "_EventToEventLabel_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToEventLabel" ADD CONSTRAINT "_EventToEventLabel_B_fkey" FOREIGN KEY ("B") REFERENCES "EventLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EntityToEntityLabel" ADD CONSTRAINT "_EntityToEntityLabel_A_fkey" FOREIGN KEY ("A") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EntityToEntityLabel" ADD CONSTRAINT "_EntityToEntityLabel_B_fkey" FOREIGN KEY ("B") REFERENCES "EntityLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
