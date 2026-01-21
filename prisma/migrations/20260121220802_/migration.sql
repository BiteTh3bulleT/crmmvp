-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFailedLogin" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "rate_limit_entries" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "duration" INTEGER,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_entries_identifier_idx" ON "rate_limit_entries"("identifier");

-- CreateIndex
CREATE INDEX "rate_limit_entries_windowStart_idx" ON "rate_limit_entries"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_entries_identifier_windowStart_key" ON "rate_limit_entries"("identifier", "windowStart");

-- CreateIndex
CREATE INDEX "metric_events_userId_idx" ON "metric_events"("userId");

-- CreateIndex
CREATE INDEX "metric_events_eventType_idx" ON "metric_events"("eventType");

-- CreateIndex
CREATE INDEX "metric_events_createdAt_idx" ON "metric_events"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_correlationId_idx" ON "audit_logs"("correlationId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "assistant_actions_threadId_idx" ON "assistant_actions"("threadId");

-- CreateIndex
CREATE INDEX "assistant_actions_status_idx" ON "assistant_actions"("status");

-- CreateIndex
CREATE INDEX "assistant_messages_threadId_idx" ON "assistant_messages"("threadId");

-- CreateIndex
CREATE INDEX "assistant_threads_ownerUserId_idx" ON "assistant_threads"("ownerUserId");

-- CreateIndex
CREATE INDEX "assistant_threads_updatedAt_idx" ON "assistant_threads"("updatedAt");

-- CreateIndex
CREATE INDEX "companies_ownerUserId_idx" ON "companies"("ownerUserId");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "contacts_ownerUserId_idx" ON "contacts"("ownerUserId");

-- CreateIndex
CREATE INDEX "contacts_companyId_idx" ON "contacts"("companyId");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "deals_ownerUserId_idx" ON "deals"("ownerUserId");

-- CreateIndex
CREATE INDEX "deals_stage_idx" ON "deals"("stage");

-- CreateIndex
CREATE INDEX "deals_companyId_idx" ON "deals"("companyId");

-- CreateIndex
CREATE INDEX "deals_contactId_idx" ON "deals"("contactId");

-- CreateIndex
CREATE INDEX "document_embeddings_ownerUserId_idx" ON "document_embeddings"("ownerUserId");

-- CreateIndex
CREATE INDEX "notes_ownerUserId_idx" ON "notes"("ownerUserId");

-- CreateIndex
CREATE INDEX "notes_relatedType_relatedId_idx" ON "notes"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "tasks_ownerUserId_idx" ON "tasks"("ownerUserId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_dueAt_idx" ON "tasks"("dueAt");
