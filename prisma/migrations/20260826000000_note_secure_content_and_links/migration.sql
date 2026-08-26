CREATE TYPE "NoteLinkKind" AS ENUM ('GOOGLE_SHEETS', 'GOOGLE_DOCS', 'GOOGLE_SLIDES', 'GOOGLE_DRIVE', 'WEBSITE');
CREATE TYPE "NoteSecretAccessType" AS ENUM ('PASSWORD', 'SECURE_CONTENT');

ALTER TABLE "notes"
  ADD COLUMN "content_ciphertext" TEXT,
  ADD COLUMN "content_iv" TEXT,
  ADD COLUMN "content_auth_tag" TEXT,
  ADD COLUMN "content_key_version" INTEGER,
  ADD COLUMN "secure_content_line_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "note_secret_access_logs"
  ADD COLUMN "access_type" "NoteSecretAccessType" NOT NULL DEFAULT 'PASSWORD';

CREATE TABLE "note_links" (
  "id" TEXT NOT NULL,
  "note_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "kind" "NoteLinkKind" NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "note_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "note_links_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "note_links_note_id_sort_order_idx" ON "note_links"("note_id", "sort_order");
