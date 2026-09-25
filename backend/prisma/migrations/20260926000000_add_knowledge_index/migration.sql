-- Website knowledge: crawled pages + full-text searchable chunks

ALTER TABLE "WebsiteKnowledgeSource" ADD COLUMN "raw_text" TEXT;
ALTER TABLE "WebsiteKnowledgeSource" ADD COLUMN "pages_indexed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WebsiteKnowledgeSource" ADD COLUMN "last_error" TEXT;
CREATE INDEX "WebsiteKnowledgeSource_crawl_status_idx" ON "WebsiteKnowledgeSource"("crawl_status");

ALTER TABLE "Plan" ADD COLUMN "knowledge_page_limit" INTEGER NOT NULL DEFAULT 50;
UPDATE "Plan" SET "knowledge_page_limit" = 300 WHERE "tier" = 'growth';
UPDATE "Plan" SET "knowledge_page_limit" = 1500 WHERE "tier" = 'enterprise';
UPDATE "Plan" SET "knowledge_page_limit" = 25 WHERE "tier" = 'promo';

CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "content_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "fetched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KnowledgeDocument_source_id_url_key" ON "KnowledgeDocument"("source_id", "url");
CREATE INDEX "KnowledgeDocument_tenant_id_status_idx" ON "KnowledgeDocument"("tenant_id", "status");
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "WebsiteKnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL,
    "search_tsv" tsvector GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED,
    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KnowledgeChunk_tenant_id_idx" ON "KnowledgeChunk"("tenant_id");
CREATE INDEX "KnowledgeChunk_document_id_idx" ON "KnowledgeChunk"("document_id");
CREATE INDEX "KnowledgeChunk_search_tsv_idx" ON "KnowledgeChunk" USING GIN ("search_tsv");
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
