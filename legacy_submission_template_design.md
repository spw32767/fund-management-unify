# Designing legacy import templates (fund application vs. publication reward)

This guide explains how to lay out spreadsheet templates that match the database schema in `fund_cpkku_v64.sql`, so imports do not violate primary-key or foreign-key constraints. Use it alongside the column inventories (`legacy_submission_template_all_columns*.md`) when you regenerate the final templates.

## Workbook structure
Create one workbook with clearly separated sheets so each table’s rows map directly to the database:

1. **Submissions** – one row per submission (shared by both flows). Contains IDs required by the `submissions` table.
2. **FundApplications** – one row per fund request. Links back to **Submissions** via `submission_id` and maps to `fund_application_details`.
3. **PublicationRewards** – one row per publication reward. Links to **Submissions** via `submission_id` and maps to `publication_reward_details`.
4. **PublicationExternalFunds** – zero-to-many rows per publication reward. Links to `publication_reward_external_funds` using both `submission_id` and `detail_id` so multiple external funders can be captured.
5. **Documents** – optional rows for attachments. Each row ties to `submission_documents` via `submission_id` and `document_type_id`; include `file_id` for uploaded files.
6. **Participants** – optional rows for co-applicants/roles. Each row maps to `submission_users` with `submission_id` and `user_id`.

Keeping these tables on separate sheets avoids trying to flatten one-to-many relationships (e.g., multiple external funders or documents) into single columns.

## Core submission sheet design
Map columns directly to `submissions`:
- **Required columns**: `submission_type` (use `fund_application` or `publication_reward`), `user_id`, `year_id`, `subcategory_id`, `status_id`.
- **Optional columns**: `category_id`, `subcategory_budget_id`, `submitted_at`, `installment_number_at_submit`.
- **Identity handling**: `submission_id` is auto-incremented by the database; leave it blank in the sheet and let the import script insert and capture generated IDs for use in child sheets.

## Fund application sheet design
One row = one fund request in `fund_application_details`.
- **Required FK**: `submission_id` (from the Submissions sheet) and `subcategory_id`.
- **Optional detail**: `project_title`, `project_description`, `requested_amount`, `approved_amount`, `closed_at`, `announce_reference_number`, `main_annoucement`, `activity_support_announcement`, `author_name_list`.
- **Identity handling**: `detail_id` is auto-incremented; leave it blank and retrieve after insert if you need to reference it elsewhere (fund applications currently have no child tables).

## Publication reward sheet design
One row = one publication reward in `publication_reward_details`.
- **Required columns**: `submission_id`, `paper_title`, `journal_name`, `publication_date`.
- **Optional publication metadata**: `publication_type`, `quartile`, `impact_factor`, `doi`, `url`, `page_numbers`, `volume_issue`, `indexing`, `author_count`, `author_type`, `author_name_list`, `has_university_funding`, `funding_references`, `university_rankings`, `signature`.
- **Optional financials**: `reward_amount`, `reward_approve_amount`, `revision_fee`, `revision_fee_approve_amount`, `publication_fee`, `publication_fee_approve_amount`, `external_funding_amount`, `total_amount`, `total_approve_amount`, `approved_amount`, `announce_reference_number`, `main_annoucement`, `reward_announcement`.
- **Identity handling**: `detail_id` auto-increments; leave blank, then reuse the generated value on the **PublicationExternalFunds** sheet when listing multiple funding sources for the same reward.

## External fund sheet design (for publication rewards)
Each row maps to `publication_reward_external_funds` and represents one external funding source.
- **Required columns**: `submission_id`, `detail_id` (from PublicationRewards), `fund_name`, `amount`.
- **Optional columns**: `document_id`, `file_id` (attach proof if available).
- **Why separate rows?** Multiple funders per publication are supported; repeating `submission_id`/`detail_id` on separate rows keeps one-to-many relationships valid without adding extra columns.

## Documents sheet design
Each row maps to `submission_documents` and can be tied to any submission type.
- **Required when present**: `submission_id`, `file_id`, `document_type_id`.
- **Optional**: `original_name`, `description`, `display_order`, `is_required`, `is_verified`, `verified_by`, `verified_at`.
- **Identity handling**: `document_id` auto-increments; leave blank.

## Participants sheet design
Each row maps to `submission_users` for co-applicants or collaborators.
- **Required when present**: `submission_id`, `user_id`.
- **Optional**: `role`, `is_primary`, `display_order`.
- **Identity handling**: `id` auto-increments; leave blank.

## Data-entry workflow to avoid FK/PK issues
1. **Insert submissions first** and capture generated `submission_id` values.
2. **Insert fund or publication detail rows** next, using the matching `submission_id`; capture `detail_id` for publication rewards.
3. **Add external fund rows** (publication rewards only) using the `submission_id` and `detail_id` from step 2; repeat as many rows as you have funders.
4. **Attach documents** by referencing the appropriate `submission_id` and a valid `document_type_id` and `file_id` from uploads.
5. **Add participants** using existing `user_id` values.
6. Validate all foreign-key IDs (years, categories, subcategories, budgets, users, document types) against the database before import to prevent errors.

Following this layout keeps each worksheet aligned with a single database table, prevents primary-key collisions by leaving identity columns blank, and ensures foreign keys can be resolved cleanly during import.
