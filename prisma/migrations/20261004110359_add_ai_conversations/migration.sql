-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- AlterTable
ALTER TABLE "leave_records" ALTER COLUMN "numberOfDays" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sourcesUsed" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_conversations_userId_idx" ON "ai_conversations"("userId");

-- CreateIndex
CREATE INDEX "ai_conversations_updatedAt_idx" ON "ai_conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "ai_messages_conversationId_idx" ON "ai_messages"("conversationId");

-- CreateIndex
CREATE INDEX "ai_messages_createdAt_idx" ON "ai_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
