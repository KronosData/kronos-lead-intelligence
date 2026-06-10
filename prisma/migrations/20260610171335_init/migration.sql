-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "website" TEXT,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "google_business_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lead_source" TEXT,
    "latest_opportunity_score" INTEGER NOT NULL DEFAULT 0,
    "latest_priority_level" TEXT NOT NULL DEFAULT 'low',
    "latest_evaluated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "evaluated_by" TEXT NOT NULL,
    "signal_has_website" BOOLEAN NOT NULL DEFAULT false,
    "signal_has_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "signal_has_contact_form" BOOLEAN NOT NULL DEFAULT false,
    "signal_has_booking_system" BOOLEAN NOT NULL DEFAULT false,
    "signal_has_instagram" BOOLEAN NOT NULL DEFAULT false,
    "signal_has_linkedin" BOOLEAN NOT NULL DEFAULT false,
    "signal_has_google_business" BOOLEAN NOT NULL DEFAULT false,
    "signal_has_reviews" BOOLEAN NOT NULL DEFAULT false,
    "signal_has_unanswered_reviews" BOOLEAN NOT NULL DEFAULT false,
    "signal_has_clear_cta" BOOLEAN NOT NULL DEFAULT false,
    "signal_has_lead_capture" BOOLEAN NOT NULL DEFAULT false,
    "signal_slow_response" BOOLEAN NOT NULL DEFAULT false,
    "signal_weak_followup" BOOLEAN NOT NULL DEFAULT false,
    "signal_manual_work" BOOLEAN NOT NULL DEFAULT false,
    "signal_weak_online_presence" BOOLEAN NOT NULL DEFAULT false,
    "score_lead_generation" INTEGER,
    "score_follow_up" INTEGER,
    "score_conversion_process" INTEGER,
    "score_automation_opportunity" INTEGER,
    "score_online_presence" INTEGER,
    "score_reputation" INTEGER,
    "opportunity_score" INTEGER,
    "priority_level" TEXT,
    "detected_problems" TEXT[],
    "probable_pain_point" TEXT,
    "recommended_solution" TEXT,
    "estimated_value_min" INTEGER,
    "estimated_value_max" INTEGER,
    "estimated_leads_lost_per_month" INTEGER,
    "estimated_revenue_lost_per_month" INTEGER,
    "estimated_roi_potential" INTEGER,
    "recommended_services" TEXT[],
    "implementation_difficulty" TEXT,
    "implementation_time_estimate" TEXT,
    "estimated_project_price_min" INTEGER,
    "estimated_project_price_max" INTEGER,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_notes" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_role" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "contact_status" TEXT NOT NULL DEFAULT 'not_contacted',
    "meeting_status" TEXT NOT NULL DEFAULT 'not_scheduled',
    "meeting_date" TIMESTAMP(3),
    "meeting_notes" TEXT,
    "budget_min" INTEGER,
    "budget_max" INTEGER,
    "budget_currency" TEXT NOT NULL DEFAULT 'USD',
    "objections" TEXT,
    "follow_up_notes" TEXT,
    "sales_observations" TEXT,
    "next_action" TEXT,
    "next_action_date" TIMESTAMP(3),
    "assigned_to" TEXT,
    "close_probability" INTEGER,
    "lost_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_history" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "message_sent" TEXT,
    "sent_by" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_received" BOOLEAN NOT NULL DEFAULT false,
    "response_type" TEXT,
    "response_notes" TEXT,
    "replied_at" TIMESTAMP(3),
    "next_follow_up_at" TIMESTAMP(3),
    "sequence_number" INTEGER NOT NULL DEFAULT 1,
    "template_used" TEXT,
    "channel_account" TEXT,
    "is_automated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evaluations_company_id_idx" ON "evaluations"("company_id");

-- CreateIndex
CREATE INDEX "evaluations_company_id_evaluated_at_idx" ON "evaluations"("company_id", "evaluated_at" DESC);

-- CreateIndex
CREATE INDEX "outreach_history_company_id_idx" ON "outreach_history"("company_id");

-- CreateIndex
CREATE INDEX "outreach_history_sent_at_idx" ON "outreach_history"("sent_at");

-- CreateIndex
CREATE INDEX "outreach_history_channel_idx" ON "outreach_history"("channel");

-- CreateIndex
CREATE INDEX "outreach_history_response_type_idx" ON "outreach_history"("response_type");

-- CreateIndex
CREATE INDEX "outreach_history_next_follow_up_at_idx" ON "outreach_history"("next_follow_up_at");

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_notes" ADD CONSTRAINT "sales_notes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_history" ADD CONSTRAINT "outreach_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
