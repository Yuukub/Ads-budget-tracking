CREATE TYPE "NoteCategory" AS ENUM ('GENERAL', 'CLIENT_PROJECT', 'ACCESS', 'TASK');
CREATE TYPE "NoteTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TYPE "NotePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "notes" (
  "id" TEXT NOT NULL,
  "owner_id" INTEGER NOT NULL,
  "category" "NoteCategory" NOT NULL DEFAULT 'GENERAL',
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  "client_name" TEXT,
  "host" TEXT,
  "login_url" TEXT,
  "username" TEXT,
  "secret_ciphertext" TEXT,
  "secret_iv" TEXT,
  "secret_auth_tag" TEXT,
  "secret_key_version" INTEGER,
  "task_status" "NoteTaskStatus",
  "priority" "NotePriority",
  "due_on" DATE,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "note_shares" (
  "note_id" TEXT NOT NULL,
  "user_id" INTEGER NOT NULL,
  "can_view_secret" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "note_shares_pkey" PRIMARY KEY ("note_id", "user_id")
);

CREATE TABLE "note_secret_access_logs" (
  "id" TEXT NOT NULL,
  "note_id" TEXT NOT NULL,
  "actor_user_id" INTEGER NOT NULL,
  "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "note_secret_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notes_owner_id_is_pinned_updated_at_idx" ON "notes"("owner_id", "is_pinned", "updated_at");
CREATE INDEX "notes_owner_id_category_updated_at_idx" ON "notes"("owner_id", "category", "updated_at");
CREATE INDEX "notes_owner_id_task_status_due_on_idx" ON "notes"("owner_id", "task_status", "due_on");
CREATE INDEX "notes_updated_at_idx" ON "notes"("updated_at");
CREATE INDEX "notes_tags_gin_idx" ON "notes" USING GIN ("tags");
CREATE INDEX "note_shares_user_id_idx" ON "note_shares"("user_id");
CREATE INDEX "note_secret_access_logs_note_id_accessed_at_idx" ON "note_secret_access_logs"("note_id", "accessed_at");
CREATE INDEX "note_secret_access_logs_actor_user_id_accessed_at_idx" ON "note_secret_access_logs"("actor_user_id", "accessed_at");

ALTER TABLE "notes" ADD CONSTRAINT "notes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "note_secret_access_logs" ADD CONSTRAINT "note_secret_access_logs_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "note_secret_access_logs" ADD CONSTRAINT "note_secret_access_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
