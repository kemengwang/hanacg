CREATE TABLE "episodes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "episodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_id" integer NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"type" integer NOT NULL,
	"sort" double precision NOT NULL,
	"number" double precision,
	"name" text NOT NULL,
	"name_cn" text NOT NULL,
	"air_date" text,
	"summary" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_external_refs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subject_external_refs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_id" integer NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"license" text NOT NULL,
	"raw" jsonb NOT NULL,
	"hash" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"key" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"lease_token" text,
	"failures" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "subject_names" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subject_names_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_id" integer NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_external_ratings" (
	"subject_id" integer NOT NULL,
	"provider" text NOT NULL,
	"score" double precision,
	"count" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_relations" (
	"subject_id" integer NOT NULL,
	"provider" text NOT NULL,
	"target_external_id" text NOT NULL,
	"relation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sync_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"job_key" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "release_schedules" (
	"subject_id" integer NOT NULL,
	"provider" text NOT NULL,
	"weekday" integer NOT NULL,
	"timezone" text,
	"local_time" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "source_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_id" integer NOT NULL,
	"source_id" text NOT NULL,
	"external_id" text NOT NULL,
	"checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "source_episodes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "source_episodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"line_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"number" double precision NOT NULL,
	"episode_id" integer,
	"listed" boolean DEFAULT true NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "source_lines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "source_lines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entry_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subjects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000000000 CACHE 1),
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"name_cn" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"format" text DEFAULT '' NOT NULL,
	"series" boolean,
	"release_date" text,
	"cover" text DEFAULT '' NOT NULL,
	"nsfw" boolean DEFAULT false NOT NULL,
	"publication_status" text DEFAULT 'published' NOT NULL,
	"release_status" text DEFAULT 'unknown' NOT NULL,
	"episode_count" integer,
	"author" text DEFAULT '' NOT NULL,
	"infobox" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"locked_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_tags" (
	"subject_id" integer NOT NULL,
	"name" text NOT NULL,
	"dimension" text NOT NULL,
	"provider" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_update_state" (
	"subject_id" integer PRIMARY KEY NOT NULL,
	"listed_episode_count" integer DEFAULT 0 NOT NULL,
	"latest_listed_number" double precision,
	"source_checked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_external_refs" ADD CONSTRAINT "subject_external_refs_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_names" ADD CONSTRAINT "subject_names_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_external_ratings" ADD CONSTRAINT "subject_external_ratings_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_relations" ADD CONSTRAINT "subject_relations_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_schedules" ADD CONSTRAINT "release_schedules_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_entries" ADD CONSTRAINT "source_entries_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_episodes" ADD CONSTRAINT "source_episodes_line_id_source_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."source_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_episodes" ADD CONSTRAINT "source_episodes_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_lines" ADD CONSTRAINT "source_lines_entry_id_source_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."source_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_tags" ADD CONSTRAINT "subject_tags_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_update_state" ADD CONSTRAINT "subject_update_state_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episode_identity_idx" ON "episodes" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "episode_subject_idx" ON "episodes" USING btree ("subject_id","type","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "external_identity_idx" ON "subject_external_refs" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "sync_due_idx" ON "sync_jobs" USING btree ("next_run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_name_idx" ON "subject_names" USING btree ("subject_id","name","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_rating_idx" ON "subject_external_ratings" USING btree ("subject_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_relation_idx" ON "subject_relations" USING btree ("subject_id","provider","target_external_id","relation");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_identity_idx" ON "release_schedules" USING btree ("subject_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "source_entry_identity_idx" ON "source_entries" USING btree ("subject_id","source_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_episode_identity_idx" ON "source_episodes" USING btree ("line_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_line_identity_idx" ON "source_lines" USING btree ("entry_id","external_id");--> statement-breakpoint
CREATE INDEX "subjects_catalog_idx" ON "subjects" USING btree ("kind","publication_status","release_date");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_tag_idx" ON "subject_tags" USING btree ("subject_id","name","dimension","provider");