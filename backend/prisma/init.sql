PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "Repository" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "owner" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "githubId" TEXT NOT NULL UNIQUE,
  "defaultBranch" TEXT NOT NULL DEFAULT 'main',
  "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSyncedAt" DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS "Repository_owner_name_key" ON "Repository"("owner", "name");

CREATE TABLE IF NOT EXISTS "Contributor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "repositoryId" TEXT NOT NULL,
  "githubLogin" TEXT NOT NULL,
  "displayName" TEXT,
  CONSTRAINT "Contributor_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Contributor_repositoryId_githubLogin_key" ON "Contributor"("repositoryId", "githubLogin");

CREATE TABLE IF NOT EXISTS "Decision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "repositoryId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "confidence" REAL NOT NULL DEFAULT 0.5,
  "summary" TEXT,
  "component" TEXT,
  "primaryOwnerId" TEXT,
  "firstSeenAt" DATETIME NOT NULL,
  "lastTouchedAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Decision_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Decision_primaryOwnerId_fkey" FOREIGN KEY ("primaryOwnerId") REFERENCES "Contributor"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Decision_repositoryId_status_idx" ON "Decision"("repositoryId", "status");
CREATE INDEX IF NOT EXISTS "Decision_repositoryId_category_idx" ON "Decision"("repositoryId", "category");

CREATE TABLE IF NOT EXISTS "Evidence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "decisionId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "externalRef" TEXT NOT NULL,
  "excerpt" TEXT,
  "authorLogin" TEXT,
  "occurredAt" DATETIME NOT NULL,
  CONSTRAINT "Evidence_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Evidence_decisionId_idx" ON "Evidence"("decisionId");

CREATE TABLE IF NOT EXISTS "IngestionJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "repositoryId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "startedAt" DATETIME,
  "finishedAt" DATETIME,
  "error" TEXT,
  "stats" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IngestionJob_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "IngestionJob_repositoryId_status_idx" ON "IngestionJob"("repositoryId", "status");
